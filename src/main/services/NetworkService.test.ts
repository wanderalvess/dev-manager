import { describe, expect, it, vi } from 'vitest';
import os from 'os';
import { NetworkService } from './NetworkService';

describe('NetworkService', () => {
  it('detecta IPs locais a partir das interfaces do sistema', async () => {
    // Mock de interfaces de rede do os
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      'Wi-Fi': [
        {
          address: '192.168.1.150',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: '00:11:22:33:44:55',
          internal: false,
          cidr: '192.168.1.150/24'
        }
      ],
      'Loopback Pseudo-Interface 1': [
        {
          address: '127.0.0.1',
          netmask: '255.0.0.0',
          family: 'IPv4',
          mac: '00:00:00:00:00:00',
          internal: true,
          cidr: '127.0.0.1/8'
        }
      ]
    });

    const service = new NetworkService();
    // Forçar detectWslIp a retornar mock
    vi.spyOn(service, 'detectWslIp').mockResolvedValue('172.28.14.82');

    const result = await service.getNetworkIps();

    expect(result.primaryLocalIp).toBe('192.168.1.150');
    expect(result.localIps).toHaveLength(1);
    expect(result.localIps[0].interface).toBe('Wi-Fi');
    expect(result.localIps[0].type).toBe('Wi-Fi');
    expect(result.wslIp).toBe('172.28.14.82');
  });

  it('ignora IPs APIPA 169.254.x.x', async () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      Ethernet: [
        {
          address: '169.254.10.20',
          netmask: '255.255.0.0',
          family: 'IPv4',
          mac: '00:11:22:33:44:55',
          internal: false,
          cidr: '169.254.10.20/16'
        },
        {
          address: '10.0.0.45',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: '00:11:22:33:44:55',
          internal: false,
          cidr: '10.0.0.45/24'
        }
      ]
    });

    const service = new NetworkService();
    vi.spyOn(service, 'detectWslIp').mockResolvedValue(null);

    const result = await service.getNetworkIps();

    expect(result.primaryLocalIp).toBe('10.0.0.45');
    expect(result.localIps).toHaveLength(1);
    expect(result.localIps[0].ip).toBe('10.0.0.45');
    expect(result.wslIp).toBeNull();
  });
});
