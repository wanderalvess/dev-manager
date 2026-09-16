// Evita que o tour global (Header) e o tour de uma página abram simultaneamente no primeiro uso:
// o tour de página só se auto-abre depois que o tour global for concluído/pulado ao menos uma vez.
const TOUR_FINISHED_EVENT = 'devManager:tour-finished';

export function announceTourFinished(): void {
  try {
    window.dispatchEvent(new Event(TOUR_FINISHED_EVENT));
  } catch {
    // ambiente sem window — ignora
  }
}

export function onTourFinished(callback: () => void): () => void {
  window.addEventListener(TOUR_FINISHED_EVENT, callback);
  return () => window.removeEventListener(TOUR_FINISHED_EVENT, callback);
}
