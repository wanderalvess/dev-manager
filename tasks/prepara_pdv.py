import os
import sys
import socket
import subprocess
import pymysql
import oracledb
import re

# Localiza a pasta do Instant Client no ambiente de desenvolvimento ou no .exe
if getattr(sys, 'frozen', False):
    caminho_base = sys._MEIPASS
else:
    caminho_base = os.path.dirname(os.path.abspath(__file__))

pasta_client = os.path.join(caminho_base, 'instantclient_23_26')

try:
    oracledb.init_oracle_client(lib_dir=pasta_client)
except Exception as e:
    print(f"⚠️ Aviso Instant Client: {e}")

def obter_ip_local():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        print(f"❌ Erro ao identificar o IP local: {e}")
        return None

def obter_ip_wsl(nome_distro=None):
    """Executa 'wsl hostname -I' e retorna o primeiro IP retornado."""
    try:
        cmd = ["wsl"]
        if nome_distro:
            cmd.extend(["-d", nome_distro])
        cmd.extend(["hostname", "-I"])
        
        saida = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
        ip_wsl = saida.strip().split()[0]
        return ip_wsl
    except Exception as e:
        print(f"❌ Erro ao obter IP do WSL: {e}")
        return None

def atualizar_mysql(ip_local, ip_wsl, banco_mysql="consinco"):
    print("\n[MySQL] Conectando e atualizando...")
    try:
        conn = pymysql.connect(
            host="localhost",
            port=3306,
            user="consinco",
            password="consinco",
            database=banco_mysql,
            autocommit=True
        )
        with conn.cursor() as cursor:
            # 1. Atualiza IP do servidor remoto/local
            sql1 = "UPDATE tb_parametro SET valor = %s WHERE parametro LIKE 'IP' AND valor IS NOT NULL"
            r1 = cursor.execute(sql1, (ip_local,))
            
            # 2. Busca os valores ÚNICOS que possuem http://
            cursor.execute("SELECT DISTINCT valor FROM tb_parametro WHERE valor LIKE '%%http://%%'")
            valores_unicos = [row[0] for row in cursor.fetchall() if row[0]]
            
            r2 = 0
            for val_antigo in valores_unicos:
                # Substitui http://HOST diretamente pelo IP do WSL sem usar grupos de captura
                novo_val = re.sub(r'http://[^:/]+', f'http://{ip_wsl}', val_antigo)
                
                if novo_val != val_antigo:
                    r2 += cursor.execute(
                        "UPDATE tb_parametro SET valor = %s WHERE valor = %s", 
                        (novo_val, val_antigo)
                    )
            
            print(f"✔ [MySQL] Sucesso! Linhas alteradas:")
            print(f"   • IP servidor remoto/local: {r1}")
            print(f"   • URLs atualizadas para o IP WSL ({ip_wsl}): {r2}")
            
        conn.close()
    except Exception as e:
        print(f"❌ [MySQL] Erro ao executar: {e}")

def atualizar_oracle(ip_local, ip_wsl, service_name="XE"):
    print("\n[Oracle] Conectando e atualizando...")
    prefixo_wsl = f"http://{ip_wsl}:"
    try:
        conn = oracledb.connect(
            user="LOCAL",
            password="LOCAL",
            dsn=f"127.0.0.1:1521/{service_name}"
        )
        cursor = conn.cursor()
        
        # 1. TB_PARAMMONVALOR recebe o IP do WSL
        sql1 = "UPDATE MONITORPDV.TB_PARAMMONVALOR SET VALOR = REGEXP_REPLACE(VALOR, 'http://[^:]+:', :1) WHERE VALOR LIKE '%http://%'"
        cursor.execute(sql1, [prefixo_wsl])
        r1 = cursor.rowcount
        
        # 2. TB_PARAMPDVVALOR recebe o IP do WSL
        sql2 = "UPDATE MONITORPDV.TB_PARAMPDVVALOR SET VALOR = REGEXP_REPLACE(VALOR, 'http://[^:]+:', :1) WHERE VALOR LIKE '%http://%'"
        cursor.execute(sql2, [prefixo_wsl])
        r2 = cursor.rowcount
        
        # 3. TB_CHECKOUT recebe o IP Local
        sql3 = "UPDATE MONITORPDV.TB_CHECKOUT SET IP = :1 WHERE NROCHECKOUT = 18"
        cursor.execute(sql3, [ip_local])
        r3 = cursor.rowcount
        
        conn.commit()
        print(f"✔ [Oracle] Sucesso! Linhas alteradas:")
        print(f"   • TB_PARAMMONVALOR (IP WSL): {r1}")
        print(f"   • TB_PARAMPDVVALOR (IP WSL): {r2}")
        print(f"   • TB_CHECKOUT (IP Local): {r3}")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ [Oracle] Erro ao executar: {e}")

def main():
    ip_local = obter_ip_local()
    ip_wsl = obter_ip_wsl() 
    
    if not ip_local:
        print("Operação cancelada: Não foi possível obter o IP Local.")
        input("\nPressione ENTER para fechar...")
        return

    if not ip_wsl:
        print("Operação cancelada: Não foi possível obter o IP do WSL.")
        input("\nPressione ENTER para fechar...")
        return
        
    print(f"➜ IP Local detectado: {ip_local}")
    print(f"➜ IP WSL detectado:   {ip_wsl}")
    
    atualizar_mysql(ip_local, ip_wsl, banco_mysql="consinco")
    atualizar_oracle(ip_local, ip_wsl, service_name="XE")
    
    input("\nPressione ENTER para fechar...")

if __name__ == "__main__":
    main()