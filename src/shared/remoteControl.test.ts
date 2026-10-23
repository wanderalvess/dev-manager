import { describe, expect, it } from 'vitest';
import { isAllowedHostHeader, isPrivateAddress, parseRemoteAction } from './remoteControl';

describe('parseRemoteAction', () => {
  it('aceita ação sem alvo nem confirmação', () => {
    const r = parseRemoteAction({ acao: 'karaf.iniciar' });
    expect(r).toEqual({ ok: true, request: { action: 'karaf.iniciar', target: undefined, confirmed: false } });
  });

  it('recusa nomes fora da lista, inclusive os do protótipo de Object', () => {
    for (const acao of ['formatar', 'constructor', '__proto__', 'toString', '', 42]) {
      expect(parseRemoteAction({ acao }).ok).toBe(false);
    }
  });

  it('exige alvo quando a ação precisa', () => {
    expect(parseRemoteAction({ acao: 'docker.iniciar' }).ok).toBe(false);
    expect(parseRemoteAction({ acao: 'docker.iniciar', alvo: 'abc' }).ok).toBe(true);
  });

  it('descarta alvo enviado para ação que não usa', () => {
    const r = parseRemoteAction({ acao: 'karaf.iniciar', alvo: 'x' });
    expect(r.ok && r.request.target).toBeUndefined();
  });

  it('exige confirmação nas ações destrutivas', () => {
    expect(parseRemoteAction({ acao: 'karaf.parar' }).ok).toBe(false);
    expect(parseRemoteAction({ acao: 'karaf.parar', confirmado: 'true' }).ok).toBe(false);
    expect(parseRemoteAction({ acao: 'karaf.parar', confirmado: true }).ok).toBe(true);
  });

  it('recusa corpo que não é objeto e alvo exagerado', () => {
    expect(parseRemoteAction(null).ok).toBe(false);
    expect(parseRemoteAction('docker.iniciar').ok).toBe(false);
    expect(parseRemoteAction({ acao: 'docker.iniciar', alvo: 'a'.repeat(201) }).ok).toBe(false);
    expect(parseRemoteAction({ acao: 'docker.iniciar', alvo: 7 }).ok).toBe(false);
  });
});

describe('isPrivateAddress', () => {
  it('aceita faixas privadas, loopback, link-local e Tailscale', () => {
    for (const ip of ['10.0.0.5', '172.16.0.1', '172.31.255.1', '192.168.1.20', '127.0.0.1', '169.254.1.1', '100.64.0.1', '::1', '::ffff:192.168.0.9', 'fe80::1', 'fd12::1']) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it('recusa IP público e entrada inválida', () => {
    for (const ip of ['8.8.8.8', '172.32.0.1', '100.128.0.1', '192.169.0.1', '2001:db8::1', 'abc', '999.1.1.1', '']) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
    expect(isPrivateAddress(undefined)).toBe(false);
  });
});

describe('isAllowedHostHeader', () => {
  it('aceita IP e localhost, com ou sem porta', () => {
    for (const h of ['192.168.0.2:47822', '127.0.0.1', 'localhost:47822', '[::1]:47822']) {
      expect(isAllowedHostHeader(h), h).toBe(true);
    }
  });

  it('recusa nome de domínio (DNS rebinding) e cabeçalho ausente', () => {
    for (const h of ['evil.example.com', 'evil.example.com:47822', '192.168.0.2.evil.com']) {
      expect(isAllowedHostHeader(h), h).toBe(false);
    }
    expect(isAllowedHostHeader(undefined)).toBe(false);
  });
});
