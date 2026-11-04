/**
 * Clima da tela de início, pelo Open-Meteo (gratuito, sem chave). Só o NOME DA CIDADE que a pessoa digitou sai da
 * máquina, e só se ela informar uma: sem cidade, nada é consultado. Aqui ficam a validação, as URLs e a leitura das
 * respostas; quem faz a chamada é o WeatherService (o renderer não pode chamar sites de fora, por causa do CSP).
 */

export type WeatherIcon = 'sun' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export interface WeatherDay {
  /** AAAA-MM-DD */
  date: string;
  minC: number;
  maxC: number;
  /** Chance de chuva (%) */
  rainChance?: number;
  description: string;
  icon: WeatherIcon;
}

export interface WeatherReport {
  success: boolean;
  error?: string;
  /** Cidade como o Open-Meteo a reconheceu (ex.: "Goiânia, Goiás") */
  place?: string;
  current?: { tempC: number; feelsC?: number; humidity?: number; windKmh?: number; description: string; icon: WeatherIcon };
  days?: WeatherDay[];
  /** Quando foi lido (ISO) */
  fetchedAt?: string;
}

/** Nome de cidade aceitável: letras (com acento), espaço, hífen, ponto e apóstrofo; até 60 caracteres. */
export function isValidCity(city: string | undefined): city is string {
  const c = (city ?? '').trim();
  return c.length >= 2 && c.length <= 60 && /^[\p{L}][\p{L} .'-]*$/u.test(c);
}

/** Códigos WMO que o Open-Meteo usa, em português, com o ícone. */
export function describeWeatherCode(code: number): { description: string; icon: WeatherIcon } {
  if (code === 0) return { description: 'Céu limpo', icon: 'sun' };
  if (code === 1) return { description: 'Poucas nuvens', icon: 'partly' };
  if (code === 2) return { description: 'Parcialmente nublado', icon: 'partly' };
  if (code === 3) return { description: 'Nublado', icon: 'cloud' };
  if (code === 45 || code === 48) return { description: 'Neblina', icon: 'fog' };
  if (code >= 51 && code <= 57) return { description: 'Garoa', icon: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { description: code >= 65 || code === 82 ? 'Chuva forte' : 'Chuva', icon: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { description: 'Neve', icon: 'snow' };
  if (code >= 95) return { description: 'Tempestade', icon: 'storm' };
  return { description: 'Tempo indefinido', icon: 'cloud' };
}

export const geocodeUrl = (city: string): string =>
  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=pt&format=json`;

export const forecastUrl = (lat: number, lon: number): string =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
  '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3';

/** Primeiro resultado da busca de cidade; null quando não achou. */
export function parseGeocode(json: unknown): { lat: number; lon: number; place: string } | null {
  const r = (json as { results?: { latitude?: number; longitude?: number; name?: string; admin1?: string; country_code?: string }[] })?.results?.[0];
  if (!r || typeof r.latitude !== 'number' || typeof r.longitude !== 'number' || !r.name) return null;
  const region = r.admin1 && r.admin1 !== r.name ? `, ${r.admin1}` : '';
  return { lat: r.latitude, lon: r.longitude, place: `${r.name}${region}` };
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Lê a previsão: agora e os próximos dias. */
export function parseForecast(json: unknown, place: string, now: Date = new Date()): WeatherReport {
  const j = json as {
    current?: Record<string, unknown>;
    daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: (number | null)[] };
  };
  const c = j?.current;
  const temp = num(c?.temperature_2m);
  if (!c || temp === undefined) return { success: false, error: 'O serviço de clima não devolveu a temperatura atual.' };
  const current = {
    tempC: Math.round(temp),
    feelsC: num(c.apparent_temperature) !== undefined ? Math.round(num(c.apparent_temperature)!) : undefined,
    humidity: num(c.relative_humidity_2m),
    windKmh: num(c.wind_speed_10m) !== undefined ? Math.round(num(c.wind_speed_10m)!) : undefined,
    ...describeWeatherCode(num(c.weather_code) ?? -1)
  };
  const d = j.daily;
  const days: WeatherDay[] = (d?.time ?? []).flatMap((date, i) => {
    const max = num(d?.temperature_2m_max?.[i]);
    const min = num(d?.temperature_2m_min?.[i]);
    if (max === undefined || min === undefined) return [];
    const rain = num(d?.precipitation_probability_max?.[i] ?? undefined);
    return [{ date, minC: Math.round(min), maxC: Math.round(max), ...(rain !== undefined ? { rainChance: rain } : {}), ...describeWeatherCode(num(d?.weather_code?.[i]) ?? -1) }];
  });
  return { success: true, place, current, days, fetchedAt: now.toISOString() };
}

/** Código técnico de uma falha de rede: `cause.code` do fetch do Node (undici) ou o `net::ERR_*` do Electron. */
function networkErrorCode(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    if (typeof cur === 'object' && cur !== null) {
      const e = cur as { code?: unknown; message?: unknown; cause?: unknown };
      if (typeof e.code === 'string') parts.push(e.code);
      if (typeof e.message === 'string') parts.push(e.message);
      cur = e.cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.join(' ');
}

/**
 * Traduz a falha da chamada ao serviço de clima. O fetch do Node só diz "fetch failed" e esconde a causa em `cause`;
 * aqui ela vira uma frase que aponta o que conferir (internet, DNS, proxy ou certificado da rede da empresa).
 */
export function describeWeatherFetchError(err: unknown): string {
  const raw = networkErrorCode(err);
  const code = raw.match(/net::ERR_[A-Z_]+|\b(?:E[A-Z_]{3,}|UND_ERR_[A-Z_]+|[A-Z_]*CERT[A-Z_]*|UNABLE_TO_[A-Z_]+)\b/)?.[0];
  const suffix = code ? ` (${code})` : '';
  if (/abort/i.test(raw) || /TIMED_OUT|ETIMEDOUT|CONNECT_TIMEOUT/.test(raw)) return `O serviço de clima não respondeu a tempo${suffix}.`;
  if (/CERT|UNABLE_TO_VERIFY|SELF_SIGNED|SSL/.test(raw)) {
    return `A conexão com o serviço de clima foi recusada por certificado${suffix}. Na rede da empresa, o proxy pode estar inspecionando o HTTPS.`;
  }
  if (/PROXY|TUNNEL/.test(raw)) return `O proxy da rede não deixou consultar o clima${suffix}. Confira o proxy configurado no Windows.`;
  if (/INTERNET_DISCONNECTED|NETWORK_CHANGED|ENETUNREACH|EHOSTUNREACH/.test(raw)) return `Sem conexão com a internet agora${suffix}.`;
  if (/ENOTFOUND|EAI_AGAIN|NAME_NOT_RESOLVED|NAME_RESOLUTION/.test(raw)) {
    return `Não achei o servidor do clima (api.open-meteo.com)${suffix}. Confira a internet, o DNS ou o proxy da rede.`;
  }
  if (/ECONNREFUSED|ECONNRESET|CONNECTION_(?:REFUSED|RESET|CLOSED)|BLOCKED/.test(raw)) {
    return `A conexão com o serviço de clima foi cortada${suffix}. Um firewall ou o proxy da rede pode estar bloqueando api.open-meteo.com.`;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return `Não foi possível ler o clima agora (${code ?? msg}). Confira a internet.`;
}
