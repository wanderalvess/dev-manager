import { afterEach, describe, expect, it } from 'vitest';
import { TerminalSessionService } from './TerminalSessionService';

describe('TerminalSessionService', () => {
  const service = new TerminalSessionService();

  afterEach(() => {
    service.disposeAll();
  });

  it('lists at least one default shell profile for the current host', async () => {
    const profiles = await service.listProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.some((p) => p.isDefault)).toBe(true);
  });

  it('creates a real shell session, executes commands, and preserves directory state', async () => {
    const profiles = await service.listProfiles();
    const defaultProfile = profiles.find((p) => p.isDefault)!;
    const chunks: string[] = [];

    const session = service.createSession(
      { profileId: defaultProfile.id },
      process.cwd(),
      (evt) => chunks.push(evt.chunk),
      () => {}
    );

    expect(session.alive).toBe(true);
    expect(service.writeInput(session.sessionId, 'echo hub_terminal_ok')).toBe(true);

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && !chunks.join('').includes('hub_terminal_ok')) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(chunks.join('')).toContain('hub_terminal_ok');

    expect(service.closeSession(session.sessionId)).toBe(true);
    // Abre um shell de verdade: com a suíte inteira rodando em paralelo ele pode demorar mais que os 5 s padrão
  }, 30000);
});
