/**
 * Pedaços do texto de um "missing requirement" do Felix nos dois formatos que aparecem:
 * - feature:install: `missing requirement [root] osgi.identity; osgi.identity=x; type=karaf.feature; filter:="(...)"`;
 * - log do contêiner em runtime: `missing requirement [x [835](R 835.0)] osgi.wiring.package; (&(osgi.wiring.package=p)(version>=0.9.0)(!(version>=1.0.0)))`.
 */

/** "winthor-cliente-domain [833](R 833.0)" → "winthor-cliente-domain": tira o id e a revisão que o runtime acrescenta. */
export function stripBundleRevision(name: string): string {
  return name.replace(/\s*\[\d+\]\s*\(R [^)]*\)\s*$/, '').trim();
}

/** Tipo do requisito logo depois do colchete do "missing requirement", aceitando colchetes aninhados. */
export function requirementNamespace(block: string): string {
  const match = /missing requirement\s*(?:\[(?:[^[\]]|\[[^\]]*\])*\])?\s*([a-zA-Z0-9_.-]+)/i.exec(block);
  return match ? match[1].trim().toLowerCase() : '';
}

/** O filtro LDAP: o `filter:="..."` do feature:install ou o `(&(...))` solto do runtime, com parênteses balanceados. */
export function requirementFilter(block: string): string | undefined {
  const quoted = /filter:="([^"]+)"/.exec(block);
  if (quoted) return quoted[1];
  const afterNamespace = /missing requirement\s*(?:\[(?:[^[\]]|\[[^\]]*\])*\])?\s*[a-zA-Z0-9_.-]+;\s*\(/i.exec(block);
  if (!afterNamespace) return undefined;
  const start = afterNamespace.index + afterNamespace[0].length - 1;
  let depth = 0;
  for (let i = start; i < block.length; i++) {
    if (block[i] === '(') depth++;
    else if (block[i] === ')' && --depth === 0) return block.slice(start, i + 1);
  }
  return undefined;
}
