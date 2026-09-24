"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clientImageError } from "@/lib/client-media-policy";
import { CLIENT_IMAGE_CROP_MAX_ZOOM, CLIENT_IMAGE_CROP_SPECS, clampCropPosition, clientImageCropFilename, clientImageCropGeometry, type ClientImageKind } from "@/lib/client-image-crop";

type CropProps = {
  file: File;
  kind: ClientImageKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (file: File) => void;
};
type CropGeometry = ReturnType<typeof clientImageCropGeometry>;
type ImageResource = { active: boolean; bitmap: ImageBitmap };
type LoadedImage = { file: File; kind: ClientImageKind; resource?: ImageResource; error?: string };
type Drag = { pointerId: number; x: number; y: number; positionX: number; positionY: number; overflowX: number; overflowY: number };

function drawCrop(canvas: HTMLCanvasElement, bitmap: ImageBitmap, crop: CropGeometry) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar o recorte neste navegador.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
}

/** Opening starts a fresh local draft; neither decoding nor cancelling uploads a file. */
export function ClientImageCropDialog(props: CropProps) {
  return props.open ? <OpenClientImageCropDialog {...props} /> : null;
}

function OpenClientImageCropDialog({ file, kind, onOpenChange, onApply }: CropProps) {
  const spec = CLIENT_IMAGE_CROP_SPECS[kind];
  const noun = kind === "avatar" ? "foto" : "banner";
  const [result, setResult] = useState<LoadedImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const applyingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const validationError = clientImageError(file, spec.label);
  const currentResult = result?.file === file && result.kind === kind ? result : null;
  const resource = currentResult?.resource;
  const crop = resource ? clientImageCropGeometry(resource.bitmap.width, resource.bitmap.height, kind, zoom, position.x, position.y) : null;
  const error = validationError || currentResult?.error || applyError;

  useEffect(() => {
    if (validationError) return;
    let cancelled = false;
    let decoded: ImageResource | undefined;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    void (async () => {
      try {
        await image.decode();
        if (cancelled) return;
        // Freeze the decoded frame, so an animated source cannot differ between preview and export.
        const bitmap = await createImageBitmap(image);
        if (cancelled) { bitmap.close(); return; }
        clientImageCropGeometry(bitmap.width, bitmap.height, kind);
        decoded = { active: true, bitmap };
        setZoom(1);
        setPosition({ x: 0.5, y: 0.5 });
        setApplyError(null);
        setApplying(false);
        applyingRef.current = false;
        dragRef.current = null;
        setResult({ file, kind, resource: decoded });
      } catch {
        if (!cancelled) setResult({ file, kind, error: "Não foi possível abrir esta imagem. Escolha outro arquivo JPG, PNG, WEBP ou GIF." });
      } finally {
        URL.revokeObjectURL(url);
      }
    })();
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      if (decoded) { decoded.active = false; decoded.bitmap.close(); }
    };
  }, [file, kind, validationError]);

  useEffect(() => {
    if (!resource || !canvasRef.current || !resource.active) return;
    drawCrop(canvasRef.current, resource.bitmap, clientImageCropGeometry(resource.bitmap.width, resource.bitmap.height, kind, zoom, position.x, position.y));
  }, [resource, kind, zoom, position.x, position.y]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!crop || applying || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      positionX: position.x, positionY: position.y,
      overflowX: crop.overflowX / crop.width * bounds.width,
      overflowY: crop.overflowY / crop.height * bounds.height,
    };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId || applying || !resource) return;
    setPosition({
      x: drag.overflowX > 0.01 ? clampCropPosition(drag.positionX - (event.clientX - drag.x) / drag.overflowX) : 0.5,
      y: drag.overflowY > 0.01 ? clampCropPosition(drag.positionY - (event.clientY - drag.y) / drag.overflowY) : 0.5,
    });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function applyCrop() {
    if (!resource || !crop || !resource.active || applyingRef.current || validationError) return;
    applyingRef.current = true;
    setApplying(true);
    setApplyError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = spec.width;
      canvas.height = spec.height;
      drawCrop(canvas, resource.bitmap, crop);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Não foi possível gerar o recorte. Tente novamente.")), "image/png"));
      if (!resource.active) return;
      const croppedFile = new File([blob], clientImageCropFilename(file.name), { type: "image/png" });
      const outputError = clientImageError(croppedFile, spec.label);
      if (outputError) throw new Error(outputError);
      onApply(croppedFile);
      onOpenChange(false);
    } catch (cause) {
      if (resource.active) setApplyError(cause instanceof Error ? cause.message : "Não foi possível gerar o recorte. Tente novamente.");
    } finally {
      if (resource.active) { applyingRef.current = false; setApplying(false); }
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Ajustar {noun} do cliente</DialogTitle>
          <DialogDescription>
            Arraste a imagem para escolher o enquadramento ou use os controles abaixo. A proporção original é preservada.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Recorte final: <strong className="font-semibold text-slate-800">{spec.width} × {spec.height} px · {spec.ratioLabel}</strong>
          {resource && <span className="mt-1 block text-xs">Imagem escolhida: {resource.bitmap.width} × {resource.bitmap.height} px</span>}
        </p>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {!resource && !error && <p role="status" className="flex min-h-28 items-center justify-center gap-2 text-sm text-slate-600"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />Preparando imagem...</p>}
        {resource && crop && <>
          <div
            role="group"
            aria-label={`Área de corte ${kind === "avatar" ? "da foto" : "do banner"}`}
            className={`relative w-full touch-none select-none overflow-hidden rounded-xl border border-slate-300 bg-slate-100 ${kind === "avatar" ? "mx-auto max-w-64" : ""} ${applying ? "cursor-wait" : "cursor-grab active:cursor-grabbing"}`}
            style={{ aspectRatio: spec.aspectRatio }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={() => { dragRef.current = null; }}
          >
            <canvas ref={canvasRef} width={spec.width} height={spec.height} role="img" aria-label={`Prévia do corte ${kind === "avatar" ? "da foto" : "do banner"}`} className="pointer-events-none block h-full w-full" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-50">
              {Array.from({ length: 9 }, (_, index) => <span key={index} className={`${index % 3 !== 2 ? "border-r" : ""} ${index < 6 ? "border-b" : ""} border-white/80`} />)}
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              <span className="flex items-center justify-between gap-2">Zoom <span className="font-normal tabular-nums">{zoom.toFixed(2)}×</span></span>
              <input aria-label="Zoom da imagem" type="range" min="1" max={CLIENT_IMAGE_CROP_MAX_ZOOM} step="0.01" value={zoom} disabled={applying} onChange={event => setZoom(Number(event.currentTarget.value))} className="mt-2 h-6 w-full accent-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 disabled:opacity-50" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Posição horizontal
                <input aria-label="Posição horizontal" aria-valuetext={`${Math.round(position.x * 100)}%, da esquerda para a direita`} type="range" min="0" max="100" step="1" value={Math.round(position.x * 100)} disabled={applying || crop.overflowX < 0.01} onChange={event => { const x = Number(event.currentTarget.value) / 100; setPosition(value => ({ ...value, x })); }} className="mt-2 h-6 w-full accent-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 disabled:opacity-40" />
                <span className="flex justify-between text-xs font-normal text-slate-500"><span>Esquerda</span><span>Direita</span></span>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Posição vertical
                <input aria-label="Posição vertical" aria-valuetext={`${Math.round(position.y * 100)}%, do topo para a base`} type="range" min="0" max="100" step="1" value={Math.round(position.y * 100)} disabled={applying || crop.overflowY < 0.01} onChange={event => { const y = Number(event.currentTarget.value) / 100; setPosition(value => ({ ...value, y })); }} className="mt-2 h-6 w-full accent-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 disabled:opacity-40" />
                <span className="flex justify-between text-xs font-normal text-slate-500"><span>Topo</span><span>Base</span></span>
              </label>
            </div>
            <Button type="button" variant="ghost" size="sm" disabled={applying} onClick={() => { setZoom(1); setPosition({ x: 0.5, y: 0.5 }); }}><RotateCcw className="size-3.5" />Centralizar</Button>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Apenas a área visível será salva em PNG. Imagens animadas ficam estáticas no recorte.
            {(crop.width < spec.width || crop.height < spec.height) && " Esta imagem será ampliada e pode perder nitidez."}
          </p>
        </>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={!resource || applying || Boolean(validationError)} onClick={() => void applyCrop()}>{applying ? "Preparando recorte..." : "Aplicar recorte"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
