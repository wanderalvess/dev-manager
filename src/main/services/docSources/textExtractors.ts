/**
 * Extração de texto de PDF/DOCX, compartilhada entre `LocalFolderSource` e `ConfluenceSource`
 * (anexos de página). Import dinâmico: essas libs só carregam quando um arquivo desse tipo
 * realmente aparece, evitando custo de startup pras fontes que nunca lidam com binários.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    // pageJoiner vazio evita que o marcador de página ("-- N of M --") vire ruído
    // semântico nos chunks/embeddings.
    const result = await parser.getText({ pageJoiner: '' });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}
