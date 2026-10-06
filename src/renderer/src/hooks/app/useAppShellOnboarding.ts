import { useState, useEffect, useCallback, useRef } from 'react';
import { showToast } from '../../components/ToastHost';
import { PAGE_TOURS_PREF_KEY } from '../../components/onboarding/usePageTour';
import { TOUR_STORAGE_KEY } from '../../components/onboarding/tourSteps';
import { WELCOME_STORAGE_KEY } from '../../components/onboarding/welcomeSteps';
import { getMissingRequiredPaths, pickDetectedPaths, shouldClearStaleOnboarding } from '../../utils/environmentPageUtils';
import { collectPageTourKeys } from '../../utils/appShellNavigation';
import changelogRaw from '../../../../../CHANGELOG.md?raw';

// Welcome, tour guiado, prompt de tours por página, novidades (changelog) e versão do app.
export function useAppShellOnboarding(setActiveTab: (tab: string) => void) {
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    try {
      return !window.localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    try {
      return !window.localStorage.getItem(WELCOME_STORAGE_KEY);
    } catch {
      return false;
    }
  });
  // Havia marcadores de onboarding já na abertura? Lido uma vez, antes de o usuário interagir.
  const hadMarkersAtMount = useRef<boolean>(false);
  if (hadMarkersAtMount.current === false) {
    try {
      hadMarkersAtMount.current =
        !!window.localStorage.getItem(TOUR_STORAGE_KEY) || !!window.localStorage.getItem(WELCOME_STORAGE_KEY);
    } catch {
      // localStorage indisponível
    }
  }
  const [isPageToursPromptOpen, setIsPageToursPromptOpen] = useState<boolean>(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState<boolean>(false);
  const [changelogContent, setChangelogContent] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('');

  const handleOpenWhatsNew = useCallback(async () => {
    if (window.electronAPI?.getChangelog) {
      try {
        const content = await window.electronAPI.getChangelog();
        if (content && !content.startsWith('Erro ao ler')) {
          setChangelogContent(content);
          setIsWhatsNewOpen(true);
          return;
        }
      } catch {
        // segue para o fallback estático
      }
    }
    setChangelogContent(changelogRaw);
    setIsWhatsNewOpen(true);
  }, []);

  const handleFinishWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
  }, []);

  const handleCloseTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ done: true, ts: Date.now() }));
    } catch {
      // localStorage indisponível
    }

    // O tour mostra onde ficam as telas, mas sem os caminhos essenciais (Karaf, repositórios, IDE)
    // configurados o app não faz nada de útil ainda — manda pra Configurações, que já tem seu
    // próprio checklist detalhado (computeSetupChecklistStatus) pra guiar os campos específicos;
    // o toast aqui só aponta pra lá, sem repetir/discordar da lista de campos que o checklist define.
    (async () => {
      let missingPaths: string[] = [];
      try {
        if (window.electronAPI?.getSettings) {
          let st = await window.electronAPI.getSettings();

          // Instalação nova: preenche sozinho o que a detecção achar (só campos vazios) para o usuário
          // não começar com tudo em branco. O que não for achado continua na checklist de Configurações.
          if (getMissingRequiredPaths(st).length > 0 && window.electronAPI.autoDetectPaths) {
            try {
              const filled = pickDetectedPaths(st, await window.electronAPI.autoDetectPaths());
              const filledCount = Object.keys(filled).length;
              if (filledCount > 0) {
                st = await window.electronAPI.saveSettings(filled);
                showToast(`${filledCount} caminho(s) do ambiente detectado(s) automaticamente. Confira em Configurações.`, 'success');
              }
            } catch {
              // detecção é só conveniência: se falhar, o usuário preenche manualmente
            }
          }

          missingPaths = getMissingRequiredPaths(st);
        }
      } catch {
        // segue sem checagem de setup — não bloqueia o fluxo de onboarding
      }

      if (missingPaths.length > 0) {
        showToast('Configure seu ambiente antes de continuar — veja o checklist em Configurações.', 'info');
        setActiveTab('settings');
      }

      try {
        // Se ainda não foi perguntado se quer ver tutoriais das próximas telas, abre o modal de escolha.
        // Roda independente do redirecionamento acima: sem isso, quem tem caminhos pendentes (a
        // maioria das instalações novas) nunca chegaria a ser perguntado.
        if (window.localStorage.getItem(PAGE_TOURS_PREF_KEY) === null) {
          setIsPageToursPromptOpen(true);
        }
      } catch {
        // localStorage indisponível
      }
    })();
  }, [setActiveTab]);

  // O botão só promete o tour de spotlight — reabrir também a introdução (tema,
  // slides de boas-vindas) surpreendia quem só queria rever onde ficam os recursos.
  const handleRestartTour = useCallback(() => {
    try {
      window.localStorage.removeItem(PAGE_TOURS_PREF_KEY);
      window.localStorage.removeItem(TOUR_STORAGE_KEY);
    } catch {
      // localStorage indisponível
    }
    setIsTourOpen(true);
  }, []);

  // Diferente de "Ver Tour Guiado": não replaya o tour global inteiro, só limpa a
  // marca de "já visto" dos tours de cada tela (devManager:tour:*) e a preferência
  // sim/não — quem clicou "Pular e explorar sozinho" na primeira vez fica preso
  // nessa escolha pra sempre sem este botão.
  const handleResetPageTours = useCallback(() => {
    try {
      const allKeys: Array<string | null> = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        allKeys.push(window.localStorage.key(i));
      }
      collectPageTourKeys(allKeys).forEach((key) => window.localStorage.removeItem(key));
      window.localStorage.removeItem(PAGE_TOURS_PREF_KEY);
    } catch {
      // localStorage indisponível
    }
    setIsPageToursPromptOpen(true);
  }, []);

  // Primeira execução após instalação: o estado inicial de isWelcomeOpen/isTourOpen/activeTab já
  // é calculado de forma síncrona a partir do localStorage (vazio nessa hora, pois é instalação
  // nova) — então Welcome+Tour já abrem certo antes mesmo deste efeito rodar. Esta chamada ao
  // Electron (isFirstRun) é assíncrona e pode demorar (ela aguarda checkAdminPrivileges, que
  // spawna um processo do Windows); NÃO reforçamos aqui a reabertura de Welcome/Tour, porque se o
  // usuário for rápido e já tiver pulado a introdução antes dela responder, forçar de novo jogava
  // ele de volta pro onboarding do nada. Só usamos o resultado pra limpar um marcador desalinhado
  // (ex: pasta de dados restaurada de outra máquina).
  useEffect(() => {
    if (!window.electronAPI?.getAppInfo) return;
    window.electronAPI.getAppInfo().then((info) => {
      // A versão vale também na primeira execução (o modal de novidades e o rodapé dependem dela)
      if (info.appVersion) {
        setAppVersion(info.appVersion);
      }

      if (info.isFirstRun) {
        if (shouldClearStaleOnboarding(info.isFirstRun, hadMarkersAtMount.current)) {
          try {
            window.localStorage.removeItem(TOUR_STORAGE_KEY);
            window.localStorage.removeItem(WELCOME_STORAGE_KEY);
            window.localStorage.removeItem(PAGE_TOURS_PREF_KEY);
          } catch {
            // localStorage indisponível
          }
        }
        return;
      }

      if (info.isAppUpdated) {
        if (window.electronAPI?.getChangelog) {
          window.electronAPI.getChangelog().then((content) => {
            if (content && !content.startsWith('Erro ao ler')) {
              setChangelogContent(content);
            } else {
              setChangelogContent(changelogRaw);
            }
            setIsWhatsNewOpen(true);
          }).catch(() => {
            setChangelogContent(changelogRaw);
            setIsWhatsNewOpen(true);
          });
        } else {
          setChangelogContent(changelogRaw);
          setIsWhatsNewOpen(true);
        }
      }
    }).catch(() => {});
  }, []);

  return {
    isTourOpen,
    isWelcomeOpen,
    isPageToursPromptOpen,
    setIsPageToursPromptOpen,
    isWhatsNewOpen,
    setIsWhatsNewOpen,
    changelogContent,
    appVersion,
    handleOpenWhatsNew,
    handleFinishWelcome,
    handleCloseTour,
    handleRestartTour,
    handleResetPageTours
  };
}
