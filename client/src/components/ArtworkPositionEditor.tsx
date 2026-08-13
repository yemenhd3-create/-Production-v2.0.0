import { Maximize2, Move, RotateCcw } from 'lucide-react';
import * as React from 'react';
import { useRef, useState } from 'react';
import { clampArtworkTransform, getArtworkTransform, artworkLayerKeys, getDefaultArtworkTransform } from '@shared/artworkLayout';
import type { ArtworkFitMode, ArtworkLayerKey, ArtworkLayerTransform, TemplateSettings } from '@shared/types';

type DragState = { layer: ArtworkLayerKey; mode: 'move' | 'resize'; startX: number; startY: number; initial: ArtworkLayerTransform };

const labels: Record<ArtworkLayerKey, string> = { header: 'بانر العنوان', footer: 'تذييل المتجر الكامل', logo: 'الشعار الدائري' };
const fitOptions: Array<{ value: ArtworkFitMode; label: string }> = [{ value: 'contain', label: 'احتواء' }, { value: 'cover', label: 'ملء وقص' }, { value: 'stretch', label: 'مطّ' }];

interface ArtworkPositionEditorProps {
  settings: TemplateSettings;
  onChange: (settings: TemplateSettings) => void;
}

export default function ArtworkPositionEditor({ settings, onChange }: ArtworkPositionEditorProps) {
  const visibleLayers = artworkLayerKeys.filter(layer => layer === 'footer' ? settings.showFooterArtwork && settings.footerArtwork : settings.showStoreLogo && settings.storeLogoArtwork);
  const [selectedLayer, setSelectedLayer] = useState<ArtworkLayerKey>(visibleLayers[0] || 'footer');
  const activeLayer = visibleLayers.includes(selectedLayer) ? selectedLayer : visibleLayers[0] || 'footer';
  const drag = useRef<DragState | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const aspectRatio = settings.size === 'square' ? '1 / 1' : settings.size === 'story' ? '9 / 16' : settings.size === 'whatsapp' ? '3 / 4' : settings.size === 'landscape' ? '1.91 / 1' : '4 / 5';

  if (!visibleLayers.length) return null;

  const layerImage = (layer: ArtworkLayerKey) => layer === 'footer' ? settings.footerArtwork : settings.storeLogoArtwork;
  const updateLayer = (layer: ArtworkLayerKey, transform: ArtworkLayerTransform) => {
    const layouts = settings.artworkLayouts || {};
    onChange({ ...settings, artworkLayouts: { ...layouts, [settings.size]: { ...layouts[settings.size], [layer]: clampArtworkTransform(layer, transform, settings.size) } } });
  };
  const onPointerDown = (event: React.PointerEvent, layer: ArtworkLayerKey, mode: 'move' | 'resize') => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedLayer(layer);
    drag.current = { layer, mode, startX: event.clientX, startY: event.clientY, initial: getArtworkTransform(settings, layer) };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const current = drag.current;
    const preview = previewRef.current;
    if (!current || !preview) return;
    const rect = preview.getBoundingClientRect();
    const dx = (event.clientX - current.startX) / rect.width;
    const dy = (event.clientY - current.startY) / rect.height;
    const next = current.mode === 'move'
      ? { ...current.initial, x: current.initial.x + dx, y: current.initial.y + dy }
      : { ...current.initial, width: current.initial.width + dx, height: current.initial.height + dy };
    updateLayer(current.layer, next);
  };
  const active = getArtworkTransform(settings, activeLayer);

  return <section className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.03] p-4" dir="rtl">
    <div className="flex items-start gap-2 text-primary"><Move size={19} /><div><h3 className="font-black">موضع وحجم الطبقات</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">المس الطبقة واسحبها. اسحب المربع الصغير في الزاوية لتكبيرها أو تصغيرها. تحفظ المواضع لهذا المقاس فقط.</p></div></div>
    <div className="mt-3 flex flex-wrap gap-2">{visibleLayers.map(layer => <button key={layer} type="button" onClick={() => setSelectedLayer(layer)} className={`rounded-xl px-3 py-2 text-xs font-black ${activeLayer === layer ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'}`}>{labels[layer]}</button>)}</div>
    <div ref={previewRef} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} className="relative mx-auto mt-4 w-full max-w-[280px] overflow-hidden rounded-2xl bg-white shadow-sm" style={{ aspectRatio, touchAction: 'none' }}>
      {visibleLayers.map(layer => {
        const transform = getArtworkTransform(settings, layer);
        const isLogo = layer === 'logo';
        const isSelected = activeLayer === layer;
        return <div key={layer} onPointerDown={event => onPointerDown(event, layer, 'move')} className={`absolute select-none ${isSelected ? 'ring-2 ring-primary ring-offset-1' : 'ring-1 ring-black/15'}`} style={{ left: `${transform.x * 100}%`, top: `${transform.y * 100}%`, width: `${transform.width * 100}%`, height: `${transform.height * 100}%`, borderRadius: isLogo ? '9999px' : '8px', touchAction: 'none', cursor: 'grab' }}>
          <img src={layerImage(layer)} alt={labels[layer]} className={`h-full w-full pointer-events-none ${isLogo ? 'rounded-full object-cover' : transform.fit === 'stretch' ? 'object-fill' : transform.fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
          {isSelected && <button type="button" aria-label={`تحجيم ${labels[layer]}`} onPointerDown={event => onPointerDown(event, layer, 'resize')} className="absolute -bottom-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow" style={{ touchAction: 'none' }}><Maximize2 size={13} /></button>}
        </div>;
      })}
    </div>
    <div className="mt-4 rounded-xl bg-white p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-foreground">طريقة ملاءمة {labels[activeLayer]}</span><button type="button" onClick={() => updateLayer(activeLayer, getDefaultArtworkTransform(settings.size, activeLayer))} className="inline-flex items-center gap-1 text-xs font-black text-primary"><RotateCcw size={14} /> إعادة الضبط</button></div><div className="mt-2 grid grid-cols-3 gap-2">{fitOptions.map(option => <button key={option.value} type="button" onClick={() => updateLayer(activeLayer, { ...active, fit: option.value })} className={`rounded-lg px-2 py-2 text-[11px] font-black ${active.fit === option.value ? 'bg-primary text-white' : 'bg-secondary text-primary'}`}>{option.label}</button>)}</div></div>
  </section>;
}
