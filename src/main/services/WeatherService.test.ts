import { describe, expect, it, vi } from 'vitest';
import { WeatherService } from './WeatherService';

const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as unknown as Response;
const GEO = { results: [{ latitude: -16.68, longitude: -49.26, name: 'Goiânia', admin1: 'Goiás' }] };
const FORECAST = { current: { temperature_2m: 27, weather_code: 0 }, daily: { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [] } };

describe('WeatherService', () => {
  it('busca a cidade, depois a previsão, e guarda por 30 minutos', async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.includes('geocoding') ? json(GEO) : json(FORECAST)));
    const service = new WeatherService(fetchImpl as unknown as typeof fetch);
    const r = await service.getWeather('Goiânia');
    expect(r).toMatchObject({ success: true, place: 'Goiânia, Goiás', current: { tempC: 27, description: 'Céu limpo' } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await service.getWeather(' goiânia ');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('cidade inválida não sai da máquina', async () => {
    const fetchImpl = vi.fn();
    const r = await new WeatherService(fetchImpl as unknown as typeof fetch).getWeather('http://evil');
    expect(r.success).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('cidade não achada, HTTP de erro e rede fora viram mensagem em português, sem cache', async () => {
    const notFound = new WeatherService((async () => json({})) as unknown as typeof fetch);
    expect((await notFound.getWeather('Xyzópolis')).error).toContain('Não achei a cidade "Xyzópolis"');

    const http = new WeatherService((async () => json({}, false, 503)) as unknown as typeof fetch);
    expect((await http.getWeather('Goiânia')).error).toContain('HTTP 503');

    let calls = 0;
    const offline = new WeatherService((async () => {
      calls++;
      throw new Error('getaddrinfo ENOTFOUND');
    }) as unknown as typeof fetch);
    expect((await offline.getWeather('Goiânia')).error).toContain('Confira a internet');
    await offline.getWeather('Goiânia');
    expect(calls).toBe(2);
  });
});
