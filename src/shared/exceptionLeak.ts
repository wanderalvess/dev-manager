/**
 * Mensagens cruas de exceção do Java, Spring, Jackson e Hibernate. Numa exceção não mapeada o WTA devolve
 * `code: "UNK-ERR"` com a mensagem original em `detailedMessage`, muitas vezes sem o nome da classe
 * (ex.: `For input string: "NUMERO"`, de um NumberFormatException). Só frases que não aparecem num erro escrito
 * para o usuário, para não reprovar mensagem de negócio.
 */
export const EXCEPTION_MESSAGE_PATTERNS: readonly RegExp[] = [
  /For input string: "/, // NumberFormatException
  /Failed to convert (?:value|from|property value) (?:of )?type/, // Spring ConversionService / TypeMismatch
  /nested exception is /, // Spring
  /Parse attempt failed for value/, // Spring DateTimeFormat
  /Text '[^']*' could not be parsed/, // DateTimeParseException
  /No enum constant /, // Enum.valueOf
  /Cannot invoke "[^"]+" because/, // NullPointerException (mensagem detalhada do Java 14+)
  /Index -?\d+ out of bounds for length \d+/, // IndexOutOfBoundsException
  /(?:JSON parse error|Cannot deserialize value of type|Cannot construct instance of|Unrecognized field ")/, // Jackson
  /Required request (?:parameter '[^']+' for method parameter type|body is missing)/, // Spring MVC
  /could not (?:execute statement|extract ResultSet|execute query)/, // Hibernate
  // Tipo interno (`[java.lang.String]`); classe de exceção já conta como stack trace
  /\b(?:java|javax|jakarta)\.(?:lang|time|util|math|sql|io|net)\.(?![A-Z]\w*(?:Exception|Error)\b)[A-Z]\w+/
];

export function hasExceptionMessage(text: string): boolean {
  return EXCEPTION_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

/** O trecho que denunciou o vazamento, com um pouco de contexto, para o QA ver o que a API devolveu. */
export function excerptAround(text: string, pattern: RegExp, context = 60): string | undefined {
  const match = pattern.exec(text);
  if (!match) return undefined;
  // Não passa da linha do achado: num JSON formatado é o campo inteiro, sem emendar o próximo nem os cabeçalhos
  const lineStart = text.lastIndexOf('\n', match.index) + 1;
  const lineEnd = text.indexOf('\n', match.index);
  const start = Math.max(lineStart, match.index - 40);
  const end = Math.min(lineEnd === -1 ? text.length : lineEnd, match.index + match[0].length + context);
  const piece = text.slice(start, end).replace(/\s+/g, ' ').trim();
  const cutEnd = lineEnd === -1 ? end < text.length : end < lineEnd;
  return `${start > lineStart ? '…' : ''}${piece}${cutEnd ? '…' : ''}`;
}
