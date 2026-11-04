import React, { useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, RotateCw, Sun, type LucideIcon } from 'lucide-react';
import type { WeatherIcon } from '../../../../../shared/weather';
import type { StartScreenData } from './useStartScreenData';
import { forecastDayLabel } from './startScreenUtils';
import { START_CARD, START_EYEBROW as EYEBROW } from './startCardStyles';

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

/** Clima da cidade escolhida. Sem cidade, um campo para informar; só o nome dela sai da máquina. */
export const SplashWeatherCard: React.FC<{ data: StartScreenData; className?: string }> = ({ data, className = '' }) => {
  const CARD = `${START_CARD} ${className}`;
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
        <label htmlFor="start-city" className="text-xs sm:text-sm text-foreground">
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
            className="flex-1 min-w-0 h-8.5 px-3 rounded-lg border border-border bg-background text-xs sm:text-sm text-foreground"
          />
          <button type="button" onClick={() => void save()} className="h-8.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer">
            Salvar
          </button>
        </div>
        {error && <p className="m-0 text-xs text-danger">{error}</p>}
        <p className="m-0 text-2xs sm:text-xs text-muted-foreground leading-relaxed">Só o nome da cidade vai para o Open-Meteo. Sem cidade, o clima fica desligado.</p>
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
        <p className="m-0 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <RotateCw className="w-4 h-4 animate-spin" /> Lendo o clima de {data.city}...
        </p>
      )}
      {w && !w.success && <p className="m-0 text-xs sm:text-sm text-muted-foreground">{w.error}</p>}
      {w?.success && w.current && (
        <>
          <div className="flex items-center gap-3">
            <Icon className="w-9 h-9 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="m-0 text-2xl sm:text-3xl font-extrabold leading-none">{w.current.tempC}°</p>
              <p className="m-0 text-xs text-foreground truncate mt-0.5">
                {w.current.description} · {w.place}
              </p>
            </div>
          </div>
          <p className="m-0 text-2xs sm:text-xs text-muted-foreground truncate">
            {[
              w.current.feelsC !== undefined ? `sensação ${w.current.feelsC}°` : '',
              w.current.humidity !== undefined ? `umidade ${w.current.humidity}%` : '',
              w.current.windKmh !== undefined ? `vento ${w.current.windKmh} km/h` : ''
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {!!w.days?.length && (
            <ul className="m-0 p-0 list-none grid grid-cols-3 gap-1.5 mt-auto">
              {w.days.map((d) => {
                const DayIcon = ICONS[d.icon];
                return (
                  <li key={d.date} className="rounded-lg bg-muted/40 px-1.5 py-1 flex flex-col items-center gap-0.5 text-2xs">
                    <span className="font-semibold text-foreground">{forecastDayLabel(d.date, new Date())}</span>
                    <DayIcon className="w-4 h-4 text-muted-foreground" aria-label={d.description} />
                    <span className="font-mono text-muted-foreground">
                      {d.minC}° / {d.maxC}°
                    </span>
                    {d.rainChance !== undefined && d.rainChance >= 20 && <span className="text-info text-[10px]">chuva {d.rainChance}%</span>}
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
