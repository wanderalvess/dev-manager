# 0002 — Divergência de versão OSGi: o operador decide e confirma

- **Data:** 2026-10-22
- **Status:** Aceita e implementada.
- **Decisores:** mantenedor

## Contexto

É comum instalar no Karaf a branch de desenvolvimento de um módulo (`0.0.1.SNAPSHOT`) e depois instalar um consumidor que importa o pacote numa faixa de release (`[1.39.0, 2.0.0)`). O Karaf recusa com `ResolutionException`. O diagnóstico já explicava a causa, mas a correção ficava manual: editar o pom na mão, rodar o build, adicionar o repositório e instalar.

## Decisão

1. Quando a causa é um pacote fora da faixa, o card de diagnóstico compara a versão instalada (`listKarafBundles`) com a faixa exigida e, havendo divergência, oferece duas saídas:
   - **Alinhar o pom ao instalado**: altera a versão da dependência no `pom.xml` (ou a propriedade `${...}` que a define, no mesmo pom), gera `pom.xml.bak` e, se o operador quiser, executa o perfil atual (clean install, repositório, instalação);
   - **Trocar por uma release**: leva ao gerenciador de bundles (desinstalar) e ao Catálogo 801.
2. **Nada é alterado sem o operador clicar e confirmar.** O diálogo explica o que muda, de qual versão para qual, o `.bak` e o cuidado de não commitar a versão de teste.
3. **A alteração é de teste local e não pode ser commitada.** O app registra o pom alterado (guardado no `localStorage`): alerta fixo na tela Deploy com *Reverter*, aviso no toast e no console, e o *Commit & Push Rápido* (`git add -A`) exige confirmação explícita se o pom ou o `.bak` estiver entre os arquivos. O app não bloqueia commits feitos fora dele; para isso valeria um hook de pré-commit no repositório.
4. **Não há tool MCP que edite o pom.** A edição de arquivo do projeto exige a confirmação visual acima; um assistente executando sozinho a contornaria. A tool `pom` existente continua só de leitura no MCP.
5. A escolha do perfil sugerido pelo diagnóstico prefere o nome mais específico (o mais à direita no pacote), e o operador pode rodar só algumas etapas dele.

## Consequências

- A dependência vira `-SNAPSHOT` só no pom local: reverter antes de commitar é responsabilidade de quem opera (o aviso está no diálogo).
- Se a versão vem de um pom pai ou BOM, a alteração é recusada com a mensagem de onde editar, em vez de gravar um literal no lugar errado.
