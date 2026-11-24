import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { EvidenceMarker } from '../../../../shared/evidenceTypes';
import { ImageAnnotator } from './ImageAnnotator';

export type StepImageProps = {
  name: string;
  sessionId: string;
  getImage: (name: string) => Promise<string | null>;
  saveImage: (name: string, dataUrl: string) => Promise<boolean>;
  marker?: EvidenceMarker;
};

/** Print do passo: miniatura que amplia ao clicar, com o marcador do clique e o editor de anotações. */
export const StepImage: React.FC<StepImageProps> = ({ name, sessionId, getImage, saveImage, marker }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [large, setLarge] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    void getImage(name).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, name]);

  const handleSave = async (dataUrl: string): Promise<void> => {
    if (await saveImage(name, dataUrl)) setSrc(dataUrl);
  };

  if (!src) return <p className="text-xs text-muted-foreground">{name}</p>;
  return (
    <div className="space-y-1">
      <button type="button" title={large ? 'Reduzir' : 'Ampliar'} className={`block text-left ${large ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} onClick={() => setLarge((v) => !v)}>
        <span className="relative inline-block max-w-full">
          <img src={src} alt={name} className={`rounded-[10px] border border-border ${large ? 'w-full' : 'max-h-48'}`} />
          {marker && (
            <span
              className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-red-600 bg-red-600/15 pointer-events-none"
              style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
            />
          )}
        </span>
      </button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{name}</span>
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5" /> Anotar
        </button>
      </div>
      {editing && <ImageAnnotator src={src} onSave={handleSave} onClose={() => setEditing(false)} />}
    </div>
  );
};
