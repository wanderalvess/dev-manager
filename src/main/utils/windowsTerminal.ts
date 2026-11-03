/**
 * Argumento para o `wt.exe`. O Windows Terminal usa `;` para separar os próprios comandos
 * (nova aba, novo painel), mesmo dentro de um argumento: `bash -c "a; echo b"` abriria uma aba para
 * `echo b`. Escapado como `\;`, o `;` chega inteiro ao bash.
 */
export function wtArg(arg: string): string {
  return arg.replace(/;/g, '\\;');
}
