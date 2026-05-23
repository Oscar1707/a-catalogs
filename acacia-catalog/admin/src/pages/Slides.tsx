// admin/src/pages/Slides.tsx
// Gestión de slides del carrusel: listar, crear, editar, reordenar y eliminar.

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { deleteSlide, listSlides, uploadSlideImage, upsertSlide } from '@/api/slides';
import { SLIDE_TYPE_LABEL, SLIDE_TYPES, type SlidePublic, type SlideType } from '@/types/slide';

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId(): string {
  return Date.now().toString(36);
}

async function toWebP(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) return reject(new Error('toBlob falló'));
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
      }, 'image/webp', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load falló')); };
    img.src = url;
  });
}

// ── Tipos internos ─────────────────────────────────────────────────────────────

type Draft = Omit<SlidePublic, 'id'> & { id: string };

function emptyDraft(id: string): Draft {
  return {
    id,
    type:      'promo',
    title:     '',
    subtitle:  '',
    image:     '',
    ctaLabel:  '',
    ctaTarget: '',
    active:    false,
    order:     99,
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

export function Slides() {
  const qc = useQueryClient();

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-slides'],
    queryFn:  listSlides,
  });

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [draft, setDraft] = useState<Draft | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setDraft(emptyDraft(newId()));
    setImageError('');
  }

  function openEdit(slide: SlidePublic) {
    setDraft({ ...slide });
    setImageError('');
  }

  function closeModal() {
    setDraft(null);
    setImageError('');
  }

  // ── Mutation: upsert ───────────────────────────────────────────────────────
  const upsertMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<SlidePublic, 'id'> }) =>
      upsertSlide(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-slides'] });
      closeModal();
    },
  });

  // ── Mutation: delete ───────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSlide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-slides'] });
    },
  });

  // ── Mutation: toggle active ────────────────────────────────────────────────
  const toggleMut = useMutation({
    mutationFn: (slide: SlidePublic) =>
      upsertSlide(slide.id, { ...slide, active: !slide.active }),
    onMutate: async (slide) => {
      await qc.cancelQueries({ queryKey: ['admin-slides'] });
      const previous = qc.getQueryData<SlidePublic[]>(['admin-slides']);
      if (previous) {
        qc.setQueryData<SlidePublic[]>(
          ['admin-slides'],
          previous.map((s) => (s.id === slide.id ? { ...s, active: !s.active } : s)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['admin-slides'], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin-slides'] });
    },
  });

  // ── Reordenar: intercambia order con vecino ────────────────────────────────
  const reorderMut = useMutation({
    mutationFn: async ({ a, b }: { a: SlidePublic; b: SlidePublic }) => {
      await Promise.all([
        upsertSlide(a.id, { ...a, order: b.order }),
        upsertSlide(b.id, { ...b, order: a.order }),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-slides'] });
    },
  });

  // ── Subir imagen ───────────────────────────────────────────────────────────
  async function handleImageFile(raw: File) {
    setImageError('');
    setImageUploading(true);
    try {
      const webp    = await toWebP(raw);
      const publicUrl = await uploadSlideImage(webp);
      setDraft((d) => d ? { ...d, image: publicUrl } : d);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setImageUploading(false);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!draft) return;
    const { id, ...rest } = draft;
    upsertMut.mutate({ id, data: rest });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const slides = data ?? [];

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      {/* Encabezado */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-light tracking-[0.2em] uppercase text-bone">Slides</h1>
          <p className="mt-1 text-xs font-light text-mute tracking-wide">
            {slides.length} slide{slides.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.2em] text-mute hover:text-bone transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
            Refrescar
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 border border-amber/40 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.2em] text-amber hover:border-amber hover:bg-amber/5 transition-colors"
          >
            <Plus size={11} />
            Nuevo slide
          </button>
        </div>
      </div>

      {/* Estado de carga */}
      {isPending && (
        <div className="py-20 text-center text-xs font-light text-mute tracking-[0.2em] uppercase">
          Cargando slides…
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="py-20 flex flex-col items-center gap-4">
          <p className="text-xs font-light text-rose-400">
            {error instanceof Error ? error.message : 'Error al cargar slides'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-[10px] font-light uppercase tracking-[0.2em] text-amber hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      {!isPending && !isError && (
        <div className="border border-line/40 divide-y divide-line/40">
          {slides.length === 0 && (
            <p className="py-16 text-center text-xs font-light text-mute tracking-[0.2em] uppercase">
              No hay slides. Crea el primero.
            </p>
          )}
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              {/* Thumbnail */}
              <div className="h-14 w-20 shrink-0 overflow-hidden bg-ink-soft border border-line/30">
                {slide.image ? (
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[9px] text-mute-dark uppercase tracking-widest">
                    Sin imagen
                  </div>
                )}
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-light text-bone">
                  {slide.title || <span className="text-mute italic">Sin título</span>}
                </p>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="text-[10px] font-light text-mute uppercase tracking-widest">
                    {SLIDE_TYPE_LABEL[slide.type]}
                  </span>
                  <span className="text-[10px] font-light text-mute">
                    orden {slide.order}
                  </span>
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle activo */}
                <button
                  type="button"
                  onClick={() => toggleMut.mutate(slide)}
                  disabled={toggleMut.isPending}
                  title={slide.active ? 'Desactivar' : 'Activar'}
                  className={`text-[10px] font-light uppercase tracking-widest px-2 py-1 border transition-colors ${
                    slide.active
                      ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                      : 'border-line/40 text-mute hover:text-bone hover:border-line'
                  }`}
                >
                  {slide.active ? 'Activo' : 'Inactivo'}
                </button>

                {/* Reordenar */}
                <button
                  type="button"
                  onClick={() => idx > 0 && reorderMut.mutate({ a: slide, b: slides[idx - 1] })}
                  disabled={idx === 0 || reorderMut.isPending}
                  className="p-1 text-mute hover:text-bone transition-colors disabled:opacity-30"
                  title="Subir"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => idx < slides.length - 1 && reorderMut.mutate({ a: slide, b: slides[idx + 1] })}
                  disabled={idx === slides.length - 1 || reorderMut.isPending}
                  className="p-1 text-mute hover:text-bone transition-colors disabled:opacity-30"
                  title="Bajar"
                >
                  <ChevronDown size={14} />
                </button>

                {/* Editar */}
                <button
                  type="button"
                  onClick={() => openEdit(slide)}
                  className="px-2 py-1 text-[10px] font-light uppercase tracking-widest text-amber border border-amber/40 hover:border-amber hover:bg-amber/5 transition-colors"
                >
                  Editar
                </button>

                {/* Eliminar */}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${slide.title || slide.id}"?`)) {
                      deleteMut.mutate(slide.id);
                    }
                  }}
                  disabled={deleteMut.isPending}
                  className="p-1 text-mute hover:text-rose-400 transition-colors disabled:opacity-40"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de edición ─────────────────────────────────────────────────── */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-lg bg-ink border border-line/60 max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-line/40 px-6 py-4">
              <h2 className="text-xs font-light uppercase tracking-[0.25em] text-bone">
                {data?.find((s) => s.id === draft.id) ? 'Editar slide' : 'Nuevo slide'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-mute hover:text-bone transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo modal */}
            <div className="px-6 py-6 space-y-5">

              {/* Imagen */}
              <div>
                <label className="block text-[10px] font-light uppercase tracking-[0.2em] text-mute mb-2">
                  Imagen
                </label>
                {draft.image && (
                  <img
                    src={draft.image}
                    alt="preview"
                    className="mb-3 h-32 w-full object-cover border border-line/30"
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/webp,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={imageUploading}
                  className="text-[10px] font-light uppercase tracking-[0.2em] text-amber border border-amber/40 px-3 py-1.5 hover:border-amber hover:bg-amber/5 transition-colors disabled:opacity-50"
                >
                  {imageUploading ? 'Subiendo…' : draft.image ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {imageError && (
                  <p className="mt-1 text-[10px] text-rose-400">{imageError}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-light uppercase tracking-[0.2em] text-mute mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => d ? { ...d, title: e.target.value } : d)}
                  className="w-full bg-ink-soft border border-line/40 px-3 py-2 text-sm font-light text-bone placeholder-mute-dark focus:border-amber/60 focus:outline-none"
                  placeholder="Headline principal"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-[10px] font-light uppercase tracking-[0.2em] text-mute mb-1">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={draft.subtitle}
                  onChange={(e) => setDraft((d) => d ? { ...d, subtitle: e.target.value } : d)}
                  className="w-full bg-ink-soft border border-line/40 px-3 py-2 text-sm font-light text-bone placeholder-mute-dark focus:border-amber/60 focus:outline-none"
                  placeholder="Tagline secundario"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-light uppercase tracking-[0.2em] text-mute mb-1">
                  Tipo
                </label>
                <select
                  value={draft.type}
                  onChange={(e) => setDraft((d) => d ? { ...d, type: e.target.value as SlideType } : d)}
                  className="w-full bg-ink-soft border border-line/40 px-3 py-2 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
                >
                  {SLIDE_TYPES.map((t) => (
                    <option key={t} value={t}>{SLIDE_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>

              {/* CTA Label */}
              <div>
                <label className="block text-[10px] font-light uppercase tracking-[0.2em] text-mute mb-1">
                  Texto del botón (CTA)
                </label>
                <input
                  type="text"
                  value={draft.ctaLabel}
                  onChange={(e) => setDraft((d) => d ? { ...d, ctaLabel: e.target.value } : d)}
                  className="w-full bg-ink-soft border border-line/40 px-3 py-2 text-sm font-light text-bone placeholder-mute-dark focus:border-amber/60 focus:outline-none"
                  placeholder="Ver catálogo"
                />
              </div>

              {/* CTA Target */}
              <div>
                <label className="block text-[10px] font-light uppercase tracking-[0.2em] text-mute mb-1">
                  Destino del botón (URL o path)
                </label>
                <input
                  type="text"
                  value={draft.ctaTarget}
                  onChange={(e) => setDraft((d) => d ? { ...d, ctaTarget: e.target.value } : d)}
                  className="w-full bg-ink-soft border border-line/40 px-3 py-2 text-sm font-light text-bone placeholder-mute-dark focus:border-amber/60 focus:outline-none"
                  placeholder="/catalogo o https://..."
                />
              </div>

              {/* Order + Active (fila) */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-light uppercase tracking-[0.2em] text-mute mb-1">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={draft.order}
                    onChange={(e) => setDraft((d) => d ? { ...d, order: Number(e.target.value) } : d)}
                    className="w-full bg-ink-soft border border-line/40 px-3 py-2 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
                    min={0}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft((d) => d ? { ...d, active: e.target.checked } : d)}
                    className="accent-amber"
                  />
                  <span className="text-[10px] font-light uppercase tracking-[0.2em] text-mute">
                    Activo
                  </span>
                </label>
              </div>

              {/* Error guardado */}
              {upsertMut.isError && (
                <p className="text-[10px] text-rose-400">
                  {upsertMut.error instanceof Error ? upsertMut.error.message : 'Error al guardar'}
                </p>
              )}
            </div>

            {/* Footer modal */}
            <div className="flex justify-end gap-3 border-t border-line/40 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="text-[10px] font-light uppercase tracking-[0.2em] text-mute hover:text-bone transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={upsertMut.isPending || imageUploading}
                className="px-4 py-2 text-[10px] font-light uppercase tracking-[0.2em] text-amber border border-amber/40 hover:border-amber hover:bg-amber/5 transition-colors disabled:opacity-50"
              >
                {upsertMut.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
