import React, { useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, RotateCw, Sun, type LucideIcon } from 'lucide-react';
import type { WeatherIcon } from '../../../../../shared/weather';
import type { StartScreenData } from './useStartScreenData';
import { forecastDayLabel } from './startScreenUtils';

const ICONS: Record<WeatherIcon, LucideIcon> = {
  sun: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning
};

const CARD = 'rounded-2xl bg-muted/60 p-5 flex flex-col gap-3 min-w-0';
const EYEBROW = 'font-mono text-xs font-bold tracking-[0.14em] text-muted-foreground';

/** Clima da cidade escolhida. Sem cidade, um campo para informar; só o nome dela sai da máquina. */
export const SplashWeatherCard: React.FC<{ data: StartScreenData }> = ({ data }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data.city);
  const [error, setError] = useState<string | null>(null);
  const w = data.weather;

  const save = async () => {
    const err = await data.saveCity(value);
    setError(err);
    if (!err) setEditing(false);
  };

  if (!data.city || editing) {
    return (
      <article aria-label="Clima" className={CARD}>
        <span className={EYEBROW}>CLIMA</span>
        <label htmlFor="start-city" className="text-sm text-foreground">
          Sua cidade
        </label>
        <div className="flex gap-2">
          <input
            id="start-city"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                void save();
              }
            }}
            placeholder="ex.: Goiânia"
            className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground"
          />
          <button type="button" onClick={() => void save()} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold cursor-pointer">
            Salvar
          </button>
        </div>
        {error && <p className="m-0 text-xs text-danger">{error}</p>}
        <p className="m-0 text-xs text-muted-foreground leading-relaxed">Só o nome da cidade vai para o Open-Meteo. Sem cidade, o clima fica desligado.</p>
      </article>
    );
  }

  const Icon = w?.current ? ICONS[w.current.icon] : Cloud;
  return (
    <article aria-label="Clima" className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <span className={EYEBROW}>CLIMA</span>
        <button
          type="button"
          onClick={() => {
            setValue(data.city);
            setEditing(true);
          }}
          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          Trocar cidade
        </button>
      </div>
      {data.weatherLoading && !w && (
        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
          <RotateCw className="w-4 h-4 animate-spin" /> Lendo o clima de {data.city}...
        </p>
      )}
      {w && !w.success && <p className="m-0 text-sm text-muted-foreground">{w.error}</p>}
      {w?.success && w.current && (
        <>
          <div className="flex items-center gap-4">
            <Icon className="w-11 h-11 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="m-0 text-3xl font-extrabold leading-none">{w.current.tempC}°</p>
              <p className="m-0 text-sm text-foreground truncate">
                {w.current.description} · {w.place}
              </p>
            </div>
          </div>
          <p className="m-0 text-xs text-muted-foreground">
            {[
              w.current.feelsC !== undefined ? `sensação ${w.current.feelsC}°` : '',
              w.current.humidity !== undefined ? `umidade ${w.current.humidity}%` : '',
              w.current.windKmh !== undefined ? `vento ${w.current.windKmh} km/h` : ''
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {!!w.days?.length && (
            <ul className="m-0 p-0 list-none grid grid-cols-3 gap-2">
              {w.days.map((d) => {
                const DayIcon = ICONS[d.icon];
                return (
                  <li key={d.date} className="rounded-xl bg-background/60 px-2 py-2 flex flex-col items-center gap-1 text-xs">
                    <span className="font-semibold">{forecastDayLabel(d.date, new Date())}</span>
                    <DayIcon className="w-5 h-5 text-muted-foreground" aria-label={d.description} />
                    <span className="font-mono">
                      {d.minC}° / {d.maxC}°
                    </span>
                    {d.rainChance !== undefined && d.rainChance >= 20 && <span className="text-info">chuva {d.rainChance}%</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </article>
  );
};
