import { useEffect, useRef } from 'react';

let openEscapeLayers = 0;

/** Há um menu aberto escutando Esc? O Modal usa isto para deixar o Esc fechar o menu antes de fechar o diálogo. */
// eslint-disable-next-line react-refresh/only-export-components
export const hasOpenEscapeLayer = (): boolean => openEscapeLayers > 0;

/**
 * Fecha menus/dropdowns (que não são diálogos) com Esc. Renderize-o junto do menu aberto: o listener existe só
 * enquanto o menu está montado.
 */
export const EscapeToClose = ({ onEscape }: { onEscape: () => void }): null => {
  const ref = useRef(onEscape);
  ref.current = onEscape;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current();
    };
    document.addEventListener('keydown', onKeyDown);
    openEscapeLayers += 1;
    return () => {
      openEscapeLayers -= 1;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
  return null;
};
