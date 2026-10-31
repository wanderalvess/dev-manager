import { TourStep } from '../tourSteps';

export const SETTINGS_TOUR_STORAGE_KEY = 'devManager:tour:settings';

export const SETTINGS_TOUR_STEPS: TourStep[] = [
  {
    target: 'settings-nav',
    title: 'Seções das Configurações',
    desc: 'Cada ajuste mora numa seção só, agrupada em Essencial, Conexões, Operação e Preferências. O check verde diz que a seção está pronta; "falta 1" mostra o que ainda impede uma tela de funcionar.'
  },
  {
    target: 'settings-search',
    title: 'Buscar um ajuste',
    desc: 'Digite "porta", "senha" ou "cookie" para ir direto ao campo, na seção certa.'
  },
  {
    target: 'settings-essentials',
    title: 'Essenciais para decolar',
    desc: 'Os cinco itens sem os quais as telas principais não funcionam, com o atalho para resolver cada pendência.'
  },
  {
    target: 'auto-detect-button',
    title: 'Detectar caminhos',
    desc: 'Procura Karaf, JDK, IDE e as pastas no seu computador e preenche só o que estiver vazio. Ao terminar, mostra o que encontrou.'
  },
  {
    target: 'settings-transfer',
    title: 'Levar para outro lugar',
    desc: 'Exporte sem senhas para o time, guarde um backup completo deste PC ou traga as configurações de um arquivo.'
  },
  {
    target: null,
    title: 'Como salvar',
    desc: 'O que você muda fica pendente até clicar em "Salvar alterações" na barra que aparece no rodapé. O que grava direto tem a etiqueta "aplica na hora".'
  }
];
