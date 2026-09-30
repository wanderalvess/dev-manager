import { describe, expect, it } from 'vitest';
import {
  parseMemoryUnitToBytes,
  parseJmxMemoryOutput,
  parseKarafInfoOutput,
  buildJvmMemoryMetrics
} from './jvmMemoryUtils';

describe('jvmMemoryUtils', () => {
  describe('parseMemoryUnitToBytes', () => {
    it('converte kbytes, mbytes, gbytes e bytes corretamente', () => {
      expect(parseMemoryUnitToBytes('1,048,576 kbytes')).toBe(1048576 * 1024);
      expect(parseMemoryUnitToBytes('512 MB')).toBe(512 * 1024 * 1024);
      expect(parseMemoryUnitToBytes('2 GB')).toBe(2 * 1024 * 1024 * 1024);
      expect(parseMemoryUnitToBytes('1024')).toBe(1024);
      expect(parseMemoryUnitToBytes('')).toBe(0);
    });
  });

  describe('parseJmxMemoryOutput', () => {
    it('extrai init, used, committed, max da saída de JMX', () => {
      const sample = `
init = 268435456
used = 154321000
committed = 536870912
max = 1073741824
`;
      const res = parseJmxMemoryOutput(sample);
      expect(res).not.toBeNull();
      expect(res?.init).toBe(268435456);
      expect(res?.used).toBe(154321000);
      expect(res?.committed).toBe(536870912);
      expect(res?.max).toBe(1073741824);
    });

    it('retorna null para saídas que não contenham "used ="', () => {
      expect(parseJmxMemoryOutput('Command error: MBean not found')).toBeNull();
      expect(parseJmxMemoryOutput('')).toBeNull();
    });
  });

  describe('parseKarafInfoOutput', () => {
    it('extrai heap, threads, classes e uptime da saída de "info"', () => {
      const sampleInfo = `
Karaf
  Karaf version               4.2.16
  Karaf home                  /opt/karaf
  Karaf base                  /opt/karaf
  OSGi Framework              org.eclipse.osgi - 3.16.200

JVM
  Java Virtual Machine        OpenJDK 64-Bit Server VM version 11.0.14
  Version                     11.0.14
  Vendor                      Eclipse Adoptium
  Uptime                      2 days 3 hours
  Total compile time          1 minute

Threads
  Live threads                78
  Daemon threads              45
  Peak live threads           85
  Total started threads       320

Memory
  Current heap size           524,288 kbytes
  Maximum heap size           2,097,152 kbytes
  Committed heap size         1,048,576 kbytes
  Pending finalization        0 objects

Classes
  Current classes loaded      14,250
  Total classes loaded        14,500
  Total classes unloaded      250
`;
      const parsed = parseKarafInfoOutput(sampleInfo);
      expect(parsed.heapUsedBytes).toBe(524288 * 1024);
      expect(parsed.heapMaxBytes).toBe(2097152 * 1024);
      expect(parsed.heapCommittedBytes).toBe(1048576 * 1024);
      expect(parsed.liveThreads).toBe(78);
      expect(parsed.daemonThreads).toBe(45);
      expect(parsed.peakThreads).toBe(85);
      expect(parsed.classesLoaded).toBe(14250);
      expect(parsed.uptime).toBe('2 days 3 hours');
    });
  });

  describe('buildJvmMemoryMetrics', () => {
    it('calcula métricas em MB e percentual de uso normal (<70%)', () => {
      const metrics = buildJvmMemoryMetrics({
        heapUsedBytes: 500 * 1024 * 1024,
        heapCommittedBytes: 1000 * 1024 * 1024,
        heapMaxBytes: 2000 * 1024 * 1024,
        nonHeapUsedBytes: 100 * 1024 * 1024,
        source: 'jmx'
      });

      expect(metrics.heapUsedMb).toBe(500);
      expect(metrics.heapMaxMb).toBe(2000);
      expect(metrics.heapUsagePercent).toBe(25.0);
      expect(metrics.isNearOom).toBe(false);
      expect(metrics.alertLevel).toBe('NORMAL');
      expect(metrics.alertMessage).toBeUndefined();
    });

    it('emite alerta de WARNING quando uso está entre 70% e 84.9%', () => {
      const metrics = buildJvmMemoryMetrics({
        heapUsedBytes: 750 * 1024 * 1024,
        heapCommittedBytes: 1000 * 1024 * 1024,
        heapMaxBytes: 1000 * 1024 * 1024,
        source: 'jmx'
      });

      expect(metrics.heapUsagePercent).toBe(75.0);
      expect(metrics.isNearOom).toBe(false);
      expect(metrics.alertLevel).toBe('WARNING');
      expect(metrics.alertMessage).toContain('Atenção: Consumo de Heap elevado');
    });

    it('emite ALERTA CRÍTICO e isNearOom = true quando uso é >= 85%', () => {
      const metrics = buildJvmMemoryMetrics({
        heapUsedBytes: 900 * 1024 * 1024,
        heapCommittedBytes: 1000 * 1024 * 1024,
        heapMaxBytes: 1000 * 1024 * 1024,
        source: 'jmx'
      });

      expect(metrics.heapUsagePercent).toBe(90.0);
      expect(metrics.isNearOom).toBe(true);
      expect(metrics.alertLevel).toBe('CRITICAL');
      expect(metrics.alertMessage).toContain('ALERTA CRÍTICO');
      expect(metrics.alertMessage).toContain('Risco iminente de OutOfMemoryError');
    });
  });
});
