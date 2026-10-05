import { useCallback, useState } from 'react';

/** Estado do console de saída do Git exibido abaixo do painel do repositório. */
export function useGitOutput() {
  const [gitOutput, setGitOutput] = useState<string | null>(null);
  const [gitOutputIsError, setGitOutputIsError] = useState<boolean>(false);

  const resetOutput = useCallback(() => {
    setGitOutput(null);
    setGitOutputIsError(false);
  }, []);

  return { gitOutput, gitOutputIsError, setGitOutput, setGitOutputIsError, resetOutput };
}

export type GitOutputControls = Pick<
  ReturnType<typeof useGitOutput>,
  'setGitOutput' | 'setGitOutputIsError'
>;
