// Schemas grandes chegam a milhares de tabelas; renderizar tudo de uma vez trava a
// sidebar, então a lista é desenhada em blocos conforme o scroll se aproxima do fim.
export const TABLES_RENDER_STEP = 300;

// Margem (px) antes do fim do scroll em que o próximo bloco é carregado.
const SCROLL_LOAD_THRESHOLD = 200;

export function hasMoreTablesToRender(total: number, renderLimit: number): boolean {
  return total > renderLimit;
}

export function shouldLoadMoreOnScroll(
  hasMore: boolean,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number
): boolean {
  return hasMore && scrollTop + clientHeight >= scrollHeight - SCROLL_LOAD_THRESHOLD;
}
