import { useCallback, useEffect, useState } from 'react';
import type { SystemAppInfo, SystemMetrics } from '../../../../../shared/types';
import type { InfrEnvironment } from '../../../../../shared/infrWinthorVersion';
import type { UsageSummary } from '../../../../../shared/usageMetricsTypes';
import { computeImpact } from '../../../../../shared/usageImpact';
import { sanitizeBaselineOverrides } from '../../../../../shared/usageBaselines';
import { isValidCity, type WeatherReport } from '../../../../../shared/weather';
import { weekStart } from './startScreenUtils';

const METRICS_REFRESH_MS = 5000;

export interface StartScreenWeek {
  summary: UsageSummary;
  /** Tempo economizado nos últimos 7 dias (mesma conta do Meu uso) */
  savedMs: number;
}

/**
 * Dados da tela de início: o PC, a semana no Hub, os ambientes WinThor e o clima. Cada parte carrega sozinha e falha
 * sozinha (um cartão sem dado não derruba a abertura). CPU e memória se atualizam enquanto a tela está aberta.
 */
export function useStartScreenData(active: boolean) {
  const [appInfo, setAppInfo] = useState<SystemAppInfo | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [week, setWeek] = useState<StartScreenWeek | null>(null);
  const [usageOff, setUsageOff] = useState(false);
  const [envs, setEnvs] = useState<InfrEnvironment[] | null>(null);
  const [city, setCity] = useState('');
  const [stay, setStayState] = useState(false);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const loadWeather = useCallback(async (c: string) => {
    if (!isValidCity(c) || !window.electronAPI?.getWeather) return;
    setWeatherLoading(true);
    try {
      setWeather(await window.electronAPI.getWeather(c));
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const api = window.electronAPI;
    let alive = true;
    const now = new Date();
    api?.getAppInfo?.().then((i) => alive && setAppInfo(i)).catch(() => undefined);
    api?.getSettings?.()
      .then(async (s) => {
        if (!alive) return;
        setStayState(!!s.startScreenStay);
        setCity(s.startCity ?? '');
        if (s.startCity) void loadWeather(s.startCity);
        if (s.usageMetricsEnabled === false) {
          setUsageOff(true);
          return;
        }
        const [summary, days] = await Promise.all([api.getUsageSummary({ from: weekStart(now) }), api.getUsageDays()]);
        if (alive) setWeek({ summary, savedMs: computeImpact(days, sanitizeBaselineOverrides(s.usageBaselines), now).week.savedMs });
      })
      .catch(() => undefined);
    api?.listInfrEnvironments?.()
      .then((r) => alive && setEnvs(r.success ? r.environments : []))
      .catch(() => alive && setEnvs([]));

    const readMetrics = () => api?.getSystemMetrics?.().then((m) => alive && setMetrics(m)).catch(() => undefined);
    readMetrics();
    const timer = setInterval(readMetrics, METRICS_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [active, loadWeather]);

  /** Grava a cidade do clima (vazia desliga) e já consulta. */
  const saveCity = async (c: string): Promise<string | null> => {
    const value = c.trim();
    if (value && !isValidCity(value)) return 'Use só o nome da cidade (letras, ex.: Goiânia).';
    await window.electronAPI?.saveSettings?.({ startCity: value });
    setCity(value);
    setWeather(null);
    if (value) await loadWeather(value);
    return null;
  };

  /** Abrir sempre na tela de início, sem fechar sozinha. */
  const setStay = (value: boolean) => {
    setStayState(value);
    void window.electronAPI?.saveSettings?.({ startScreenStay: value });
  };

  return { appInfo, metrics, week, usageOff, envs, city, weather, weatherLoading, saveCity, stay, setStay };
}

export type StartScreenData = ReturnType<typeof useStartScreenData>;
