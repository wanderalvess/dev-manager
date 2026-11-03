import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { isValidIdentifier } from '../../utils/security';
import { wtArg } from '../../utils/windowsTerminal';
import { isValidWinthorVersion } from '../../../shared/infrWinthorVersion';
import type { InfrFirstStepsActionRequest } from '../../../shared/infrFirstSteps';
import {
  INFR_PCSIST_PATH,
  WSL_INSTALL_COMMAND,
  WSL_UPDATE_COMMAND,
  applyEnvValues,
  dumpImportCommand,
  dumpImportError,
  envOverridesFor,
  infrCheckoutCommand,
  infrCloneCommand,
  infrEnvFiles
} from '../../../shared/infrFirstStepsCommands';
import type { WslService } from '../WslService';

type Result = { success: boolean; output: string };

const HOLD = "; echo ''; echo 'Pressione Enter para fechar...'; read -r";

/** PowerShell num terminal novo (Windows Terminal; sem ele, um console do próprio PowerShell). */
function openPowerShell(title: string, command: string): void {
  const wt = spawn('wt.exe', ['-w', '0', 'nt', '--title', title, 'powershell.exe', '-NoExit', '-Command', wtArg(command)], { detached: true, stdio: 'ignore' });
  wt.on('error', () => spawn('powershell.exe', ['-NoExit', '-Command', command], { detached: true, stdio: 'ignore', windowsHide: false }).unref());
  wt.unref();
}

/** bash num terminal novo dentro da distro. */
function openDistroTerminal(distro: string, title: string, script: string): void {
  const wt = spawn('wt.exe', ['-w', '0', 'nt', '--title', title, 'wsl.exe', '-d', distro, '--', 'bash', '-c', wtArg(script + HOLD)], { detached: true, stdio: 'ignore' });
  wt.on('error', () => spawn('wsl.exe', ['-d', distro, '--', 'bash', '-c', script + HOLD], { detached: true, stdio: 'ignore', windowsHide: false }).unref());
  wt.unref();
}

/**
 * Ações dos Primeiros passos. A tela manda só o id e os dados do formulário; cada comando é montado
 * aqui com os valores validados. Instalar o WSL pede administrador pelo próprio Windows (UAC).
 */
export class InfrFirstStepsActions {
  constructor(private readonly wsl: Pick<WslService, 'resolveInfrPaths' | 'findDockerWslDistro'>) {}

  public async run(req: InfrFirstStepsActionRequest): Promise<Result> {
    switch (req.id) {
      case 'wsl-install':
      case 'wsl-update': {
        const cmd = req.id === 'wsl-install' ? WSL_INSTALL_COMMAND : WSL_UPDATE_COMMAND;
        // Um PowerShell elevado que fica aberto: a pessoa vê o resultado e o pedido de reinício
        spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoExit','-Command','${cmd}'`], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        }).unref();
        return { success: true, output: `O Windows vai pedir permissão de administrador para rodar "${cmd}".` };
      }
      case 'clone':
      case 'checkout':
      case 'open-utils':
        return this.folderAction(req.id, req.infrPath);
      case 'create-env':
      case 'open-env':
        return this.envFile(req.id, req.infrPath, req.version, req.which);
      case 'import-dump': {
        const error = dumpImportError(req.dump);
        if (error) return { success: false, output: error };
        const distro = req.distro || (await this.wsl.findDockerWslDistro()) || '';
        if (!isValidIdentifier(distro)) return { success: false, output: 'Distro WSL inválida.' };
        openDistroTerminal(distro, `Importar dump: ${req.dump.file}`, dumpImportCommand(req.dump));
        return { success: true, output: 'Terminal aberto: digite a senha do system quando ele pedir. O import leva de minutos a horas, conforme o dump.' };
      }
      default:
        return { success: false, output: 'Ação desconhecida.' };
    }
  }

  private folderAction(id: 'clone' | 'checkout' | 'open-utils', infrPath?: string): Result {
    const infr = this.wsl.resolveInfrPaths(infrPath);
    if (!infr) return { success: false, output: 'Pasta do INFR-Docker inválida.' };
    if (id === 'clone') {
      if (fs.existsSync(infr.windows)) return { success: false, output: `${infr.windows} já existe. Apague ou renomeie a pasta antes de clonar.` };
      openPowerShell('Clonar o INFR-Docker', infrCloneCommand(infr.windows));
      return { success: true, output: 'Terminal aberto: o git pede o login do Azure DevOps na primeira vez.' };
    }
    if (id === 'checkout') {
      openPowerShell('INFR-Docker: trocar de branch', infrCheckoutCommand(infr.windows));
      return { success: true, output: 'Terminal aberto com o checkout.' };
    }
    const utils = path.dirname(path.join(infr.windows, INFR_PCSIST_PATH));
    if (!fs.existsSync(utils)) return { success: false, output: `A pasta ${utils} não existe: clone o INFR-Docker antes.` };
    spawn('explorer.exe', [utils], { detached: true, stdio: 'ignore' }).unref();
    return { success: true, output: `Pasta aberta: ${utils}` };
  }

  private envFile(id: 'create-env' | 'open-env', infrPath: string | undefined, version: string, which: 'wta' | 'wsh'): Result {
    const infr = this.wsl.resolveInfrPaths(infrPath);
    if (!infr || !isValidWinthorVersion(version) || (which !== 'wta' && which !== 'wsh')) return { success: false, output: 'Pasta, versão ou arquivo inválido.' };
    const files = infrEnvFiles(version.trim());
    const target = path.join(infr.windows, which === 'wta' ? files.wta : files.wsh);
    if (id === 'create-env') {
      if (fs.existsSync(target)) return { success: false, output: `${target} já existe; o Hub não sobrescreve. Use Abrir para editar.` };
      const example = path.join(infr.windows, which === 'wta' ? files.wtaExample : files.wshExample);
      if (!fs.existsSync(example)) return { success: false, output: `Modelo não encontrado: ${example}` };
      const overrides = envOverridesFor(version.trim())[which];
      fs.writeFileSync(target, applyEnvValues(fs.readFileSync(example, 'utf8'), overrides), 'utf8');
    } else if (!fs.existsSync(target)) {
      return { success: false, output: `${target} ainda não existe: use Criar do modelo.` };
    }
    spawn('notepad.exe', [target], { detached: true, stdio: 'ignore' }).unref();
    return {
      success: true,
      output: id === 'create-env' ? `Criado ${target} a partir do modelo, com os nomes da versão. Preencha usuário, senha, loja e empresa e salve.` : `Aberto ${target}.`
    };
  }
}
