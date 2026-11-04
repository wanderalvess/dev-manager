import { describe, expect, it } from 'vitest';
import { describeWeatherCode, describeWeatherFetchError, forecastUrl, geocodeUrl, isValidCity, parseForecast, parseGeocode } from './weather';

const FORECAST = {
  current: { temperature_2m: 27.6, apparent_temperature: 29.2, relative_humidity_2m: 58, wind_speed_10m: 11.4, weather_code: 2 },
  daily: {
    time: ['2026-11-03', '2026-11-04', '2026-11-05'],
    weather_code: [2, 63, 95],
    temperature_2m_max: [31.2, 28.4, 26.1],
    temperature_2m_min: [19.8, 20.1, null],
    precipitation_probability_max: [10, 80, null]
  }
};

describe('clima da tela de início', () => {
  it('aceita só nome de cidade (com acento), nada de URL nem comando', () => {
    expect(isValidCity('Goiânia')).toBe(true);
    expect(isValidCity("São João d'Aliança")).toBe(true);
    expect(isValidCity('Goiânia-GO')).toBe(true);
    expect(isValidCity('')).toBe(false);
    expect(isValidCity('a')).toBe(false);
    expect(isValidCity('http://x')).toBe(false);
    expect(isValidCity('x; rm -rf /')).toBe(false);
    expect(isValidCity('x'.repeat(61))).toBe(false);
  });

  it('só o nome da cidade vai na busca; a previsão usa as coordenadas', () => {
    expect(geocodeUrl(' São Paulo ')).toBe('https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo&count=1&language=pt&format=json');
    expect(forecastUrl(-16.6869, -49.2648)).toContain('latitude=-16.6869&longitude=-49.2648');
  });

  it('lê a cidade achada e devolve null quando não acha', () => {
    expect(parseGeocode({ results: [{ latitude: -16.68, longitude: -49.26, name: 'Goiânia', admin1: 'Goiás' }] })).toEqual({ lat: -16.68, lon: -49.26, place: 'Goiânia, Goiás' });
    expect(parseGeocode({ results: [{ latitude: 1, longitude: 2, name: 'Brasília', admin1: 'Brasília' }] })?.place).toBe('Brasília');
    expect(parseGeocode({})).toBeNull();
    expect(parseGeocode(null)).toBeNull();
  });

  it('lê agora e os próximos dias, pulando dia sem temperatura', () => {
    const r = parseForecast(FORECAST, 'Goiânia, Goiás', new Date('2026-11-03T12:00:00Z'));
    expect(r.success).toBe(true);
    expect(r.current).toEqual({ tempC: 28, feelsC: 29, humidity: 58, windKmh: 11, description: 'Parcialmente nublado', icon: 'partly' });
    expect(r.days).toEqual([
      { date: '2026-11-03', minC: 20, maxC: 31, rainChance: 10, description: 'Parcialmente nublado', icon: 'partly' },
      { date: '2026-11-04', minC: 20, maxC: 28, rainChance: 80, description: 'Chuva', icon: 'rain' }
    ]);
    expect(parseForecast({}, 'x').success).toBe(false);
  });

  it('códigos WMO em português', () => {
    expect(describeWeatherCode(0)).toEqual({ description: 'Céu limpo', icon: 'sun' });
    expect(describeWeatherCode(65).description).toBe('Chuva forte');
    expect(describeWeatherCode(45).icon).toBe('fog');
    expect(describeWeatherCode(99).icon).toBe('storm');
    expect(describeWeatherCode(-1).description).toBe('Tempo indefinido');
  });
});

describe('describeWeatherFetchError', () => {
  const undici = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error(code), { code }) });

  it('tira a causa de dentro do "fetch failed" do Node', () => {
    expect(describeWeatherFetchError(undici('ENOTFOUND'))).toBe(
      'Não achei o servidor do clima (api.open-meteo.com) (ENOTFOUND). Confira a internet, o DNS ou o proxy da rede.'
    );
    expect(describeWeatherFetchError(undici('ECONNREFUSED'))).toContain('firewall ou o proxy');
    expect(describeWeatherFetchError(undici('UNABLE_TO_GET_ISSUER_CERT_LOCALLY'))).toContain('certificado (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)');
    expect(describeWeatherFetchError(undici('UND_ERR_CONNECT_TIMEOUT'))).toBe('O serviço de clima não respondeu a tempo (UND_ERR_CONNECT_TIMEOUT).');
  });

  it('entende os erros do net.fetch do Electron', () => {
    expect(describeWeatherFetchError(new Error('net::ERR_PROXY_CONNECTION_FAILED'))).toContain('proxy da rede não deixou');
    expect(describeWeatherFetchError(new Error('net::ERR_CERT_AUTHORITY_INVALID'))).toContain('certificado');
    expect(describeWeatherFetchError(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe(
      'Sem conexão com a internet agora (net::ERR_INTERNET_DISCONNECTED).'
    );
    expect(describeWeatherFetchError(new Error('net::ERR_NAME_NOT_RESOLVED'))).toContain('DNS');
  });

  it('tempo esgotado e erro desconhecido', () => {
    expect(describeWeatherFetchError(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }))).toBe(
      'O serviço de clima não respondeu a tempo.'
    );
    expect(describeWeatherFetchError(new Error('HTTP 503'))).toBe('Não foi possível ler o clima agora (HTTP 503). Confira a internet.');
    expect(describeWeatherFetchError(new TypeError('fetch failed'))).toContain('(fetch failed)');
  });
});
