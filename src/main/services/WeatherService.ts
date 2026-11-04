import {
  describeWeatherFetchError,
  forecastUrl,
  geocodeUrl,
  isValidCity,
  parseForecast,
  parseGeocode,
  type WeatherReport
} from '../../shared/weather';

const CACHE_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 8000;

/**
 * Clima da tela de início pelo Open-Meteo (gratuito, sem chave). Só o nome da cidade que a pessoa informou sai da
 * máquina. Guarda a resposta por 30 minutos: a tela de início abre todo dia e não precisa consultar a cada abertura.
 * No Electron, quem cria o service passa o `net.fetch` (rede do Chromium, que usa o proxy e os certificados do
 * Windows); o `fetch` do Node ignora os dois e, atrás do proxy da empresa, só devolve "fetch failed".
 */
export class WeatherService {
  private readonly cache = new Map<string, { at: number; report: WeatherReport }>();

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  public async getWeather(city: string): Promise<WeatherReport> {
    if (!isValidCity(city)) return { success: false, error: 'Informe o nome de uma cidade (só letras, ex.: Goiânia).' };
    const key = city.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.report;

    try {
      const place = parseGeocode(await this.getJson(geocodeUrl(city)));
      if (!place) return { success: false, error: `Não achei a cidade "${city.trim()}". Confira a grafia ou tente com o estado (ex.: Goiânia GO).` };
      const report = parseForecast(await this.getJson(forecastUrl(place.lat, place.lon)), place.place);
      if (report.success) this.cache.set(key, { at: Date.now(), report });
      return report;
    } catch (err) {
      return { success: false, error: describeWeatherFetchError(err) };
    }
  }

  private async getJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}
