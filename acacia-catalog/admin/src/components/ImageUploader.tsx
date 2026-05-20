// admin/src/components/ImageUploader.tsx
// Gestor de imágenes del producto: grid con preview + add/remove/reorder.
// Save inmediato — cada operación llama PATCH con el array nuevo.

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { uploadProductImage } from '@/lib/imageUpload';
import { updateProduct } from '@/api/products';

interface Props {
  productId: string;
  images:    string[];
  onChange:  (newImages: string[]) => void; // notifica al padre tras cada PATCH
}

interface UploadState {
  phase:    'converting' | 'requesting' | 'uploading' | 'done' | 'idle';
  fileName: string;
}

export function ImageUploader({ productId, images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy]       = useState(false);
  const [upload, setUpload]   = useState<UploadState>({ phase: 'idle', fileName: '' });
  const [error, setError]     = useState<string | null>(null);

  // Guarda el array nuevo en backend + actualiza el padre
  const persist = async (next: string[]) => {
    const updated = await updateProduct(productId, {
      images:     next,
      coverImage: next[0] ?? '',
    });
    onChange(updated.images ?? []);
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const newUrls: string[] = [];
      for (const file of Array.from(fileList)) {
        setUpload({ phase: 'converting', fileName: file.name });
        const url = await uploadProductImage(productId, file, (p) =>
          setUpload({ phase: p, fileName: file.name }),
        );
        newUrls.push(url);
      }
      await persist([...images, ...newUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen.');
    } finally {
      setBusy(false);
      setUpload({ phase: 'idle', fileName: '' });
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = async (i: number) => {
    if (busy) return;
    if (!confirm('¿Quitar esta imagen?')) return;
    setBusy(true);
    setError(null);
    try {
      await persist(images.filter((_, idx) => idx !== i));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar.');
    } finally {
      setBusy(false);
    }
  };

  const moveImage = async (i: number, direction: -1 | 1) => {
    const j = i + direction;
    if (j < 0 || j >= images.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = [...images];
      [next[i], next[j]] = [next[j], next[i]];
      await persist(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reordenar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Imágenes
          </h2>
          <p className="mt-1 text-[10px] font-light text-mute-dark">
            La primera es la portada. Las demás aparecen en la galería del detalle.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 border border-amber/60 px-4 py-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ImagePlus size={12} strokeWidth={1.2} />
          {busy ? phaseLabel(upload.phase) : 'Agregar'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </header>

      {error && (
        <p className="mb-4 text-[11px] font-light text-amber-soft">{error}</p>
      )}

      {busy && upload.fileName && (
        <p className="mb-4 text-[11px] font-light italic text-mute">
          {phaseLabel(upload.phase)} · {upload.fileName}
        </p>
      )}

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 border border-dashed border-line bg-ink-soft text-mute transition-colors hover:border-amber/60 hover:text-bone disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus size={28} strokeWidth={1.2} />
          <span className="text-[10px] font-light uppercase tracking-[0.25em]">
            Click para agregar imágenes
          </span>
          <span className="text-[10px] font-light italic text-mute-dark">
            JPG · PNG · WebP — se convierten automáticamente
          </span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((url, i) => (
            <li key={url} className="relative">
              <div className="relative aspect-[4/5] overflow-hidden bg-ink-soft">
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 border border-amber/60 bg-ink/85 px-2 py-1 text-[9px] font-light uppercase text-bone tracking-[0.25em] backdrop-blur-sm">
                    Portada
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
                  #{i + 1}
                </span>
                <div className="flex gap-1">
                  <IconButton
                    onClick={() => moveImage(i, -1)}
                    disabled={busy || i === 0}
                    label="Mover arriba"
                  >
                    <ArrowUp size={12} strokeWidth={1.2} />
                  </IconButton>
                  <IconButton
                    onClick={() => moveImage(i, 1)}
                    disabled={busy || i === images.length - 1}
                    label="Mover abajo"
                  >
                    <ArrowDown size={12} strokeWidth={1.2} />
                  </IconButton>
                  <IconButton
                    onClick={() => removeAt(i)}
                    disabled={busy}
                    label="Quitar"
                    danger
                  >
                    <Trash2 size={12} strokeWidth={1.2} />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Sub-componentes ─── */

interface IconButtonProps {
  onClick:   () => void;
  disabled?: boolean;
  label:     string;
  danger?:   boolean;
  children:  React.ReactNode;
}

function IconButton({ onClick, disabled, label, danger, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`border p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'border-line text-amber-soft hover:border-amber/60 hover:bg-ink-soft'
          : 'border-line text-mute hover:border-line/80 hover:text-bone'
      }`}
    >
      {children}
    </button>
  );
}

function phaseLabel(phase: UploadState['phase']): string {
  switch (phase) {
    case 'converting': return 'Convirtiendo a WebP…';
    case 'requesting': return 'Solicitando URL…';
    case 'uploading':  return 'Subiendo…';
    case 'done':       return 'Listo';
    case 'idle':       return 'Agregar';
  }
}
