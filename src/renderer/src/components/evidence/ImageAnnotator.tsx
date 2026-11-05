import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Crop, Save, Square, Undo2, X } from "lucide-react";
import { Modal } from "../ui/Modal";

type Tool = "arrow" | "rect" | "crop";
type Point = { x: number; y: number };
type Shape = { tool: "arrow" | "rect"; from: Point; to: Point };

const COLOR = "#ef4444";

const drawShape = (
  ctx: CanvasRenderingContext2D,
  s: Shape,
  scale: number,
): void => {
  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = "round";
  if (s.tool === "rect") {
    ctx.fillStyle = "rgba(239,68,68,0.15)";
    ctx.fillRect(s.from.x, s.from.y, s.to.x - s.from.x, s.to.y - s.from.y);
    ctx.strokeRect(s.from.x, s.from.y, s.to.x - s.from.x, s.to.y - s.from.y);
    return;
  }
  const angle = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
  const head = 18 * scale;
  ctx.beginPath();
  ctx.moveTo(s.from.x, s.from.y);
  ctx.lineTo(s.to.x, s.to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s.to.x, s.to.y);
  ctx.lineTo(
    s.to.x - head * Math.cos(angle - Math.PI / 6),
    s.to.y - head * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    s.to.x - head * Math.cos(angle + Math.PI / 6),
    s.to.y - head * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
};

const toolBtn = (active: boolean): string =>
  `inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] border cursor-pointer disabled:opacity-50 ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-input hover:bg-muted"}`;

export const ImageAnnotator: React.FC<{
  src: string;
  onSave: (dataUrl: string) => Promise<void>;
  onClose: () => void;
}> = ({ src, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("arrow");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [crop, setCrop] = useState<{ from: Point; to: Point } | null>(null);
  const [ready, setReady] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      baseRef.current = img;
      setReady((n) => n + 1);
    };
    img.src = src;
  }, [src]);

  const scaleOf = (canvas: HTMLCanvasElement): number =>
    canvas.width / Math.max(1, canvas.getBoundingClientRect().width);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base) return;
    const w = base instanceof HTMLImageElement ? base.naturalWidth : base.width;
    const h =
      base instanceof HTMLImageElement ? base.naturalHeight : base.height;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = scaleOf(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(base, 0, 0);
    [...shapes, ...(draft ? [draft] : [])].forEach((s) =>
      drawShape(ctx, s, scale),
    );
    if (crop) {
      const x = Math.min(crop.from.x, crop.to.x);
      const y = Math.min(crop.from.y, crop.to.y);
      const cw = Math.abs(crop.to.x - crop.from.x);
      const ch = Math.abs(crop.to.y - crop.from.y);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, w, y);
      ctx.fillRect(0, y + ch, w, h - y - ch);
      ctx.fillRect(0, y, x, ch);
      ctx.fillRect(x + cw, y, w - x - cw, ch);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([8 * scale, 6 * scale]);
      ctx.strokeRect(x, y, cw, ch);
      ctx.setLineDash([]);
    }
  }, [shapes, draft, crop]);

  useEffect(redraw, [redraw, ready]);

  const pointOf = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointOf(e);
    if (tool === "crop") setCrop({ from: p, to: p });
    else setDraft({ tool, from: p, to: p });
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const p = pointOf(e);
    if (draft) setDraft({ ...draft, to: p });
    else if (tool === "crop" && crop && e.buttons) setCrop({ ...crop, to: p });
  };
  const onUp = (): void => {
    if (!draft) return;
    const moved =
      Math.abs(draft.to.x - draft.from.x) +
        Math.abs(draft.to.y - draft.from.y) >
      6;
    if (moved) setShapes((prev) => [...prev, draft]);
    setDraft(null);
  };

  const applyCrop = (): void => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base || !crop) return;
    const x = Math.round(Math.min(crop.from.x, crop.to.x));
    const y = Math.round(Math.min(crop.from.y, crop.to.y));
    const w = Math.round(Math.abs(crop.to.x - crop.from.x));
    const h = Math.round(Math.abs(crop.to.y - crop.from.y));
    if (w < 8 || h < 8) return;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.translate(-x, -y);
    ctx.drawImage(base, 0, 0);
    const scale = scaleOf(canvas);
    shapes.forEach((s) => drawShape(ctx, s, scale));
    baseRef.current = out;
    setShapes([]);
    setCrop(null);
    setTool("arrow");
    setReady((n) => n + 1);
  };

  const save = async (): Promise<void> => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base) return;
    setSaving(true);
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return setSaving(false);
    ctx.drawImage(base, 0, 0);
    const scale = scaleOf(canvas);
    shapes.forEach((s) => drawShape(ctx, s, scale));
    try {
      await onSave(out.toDataURL("image/png"));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="full"
      title="Anotar print"
      closeOnEscape={false}
      closeOnBackdrop={false}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={toolBtn(tool === "arrow")}
            onClick={() => setTool("arrow")}
          >
            <ArrowUpRight className="w-4 h-4" /> Seta
          </button>
          <button
            type="button"
            className={toolBtn(tool === "rect")}
            onClick={() => setTool("rect")}
          >
            <Square className="w-4 h-4" /> Destaque
          </button>
          <button
            type="button"
            className={toolBtn(tool === "crop")}
            onClick={() => setTool("crop")}
          >
            <Crop className="w-4 h-4" /> Recortar
          </button>
          {tool === "crop" && crop && (
            <button
              type="button"
              className={toolBtn(false)}
              onClick={applyCrop}
            >
              Aplicar recorte
            </button>
          )}
          <button
            type="button"
            className={toolBtn(false)}
            disabled={shapes.length === 0}
            onClick={() => setShapes((prev) => prev.slice(0, -1))}
          >
            <Undo2 className="w-4 h-4" /> Desfazer
          </button>
          <span className="flex-1" />
          <button type="button" className={toolBtn(false)} onClick={onClose}>
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] bg-primary text-primary-foreground cursor-pointer disabled:opacity-50"
            disabled={saving}
            onClick={() => void save()}
          >
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
        <div className="overflow-auto">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[75vh] cursor-crosshair touch-none rounded-[10px] border border-border"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Salvar substitui o print original do passo.
        </p>
      </div>
    </Modal>
  );
};
