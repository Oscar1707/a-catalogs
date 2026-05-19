// admin/src/pages/ProductoDetail.tsx
// Form de edición de un producto. Whitelist de campos editables.
// Tallas / precios / specs / imágenes están read-only en este sprint.

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Save, Star } from 'lucide-react';
import { getProduct, updateProduct } from '@/api/products';
import type { ProductPublic, ProductUpdateInput } from '@/types/product';

export function ProductoDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn:  () => getProduct(id),
    enabled:  Boolean(id),
  });

  // Form state
  const [form, setForm] = useState<ProductUpdateInput>({});
  const [savedSnapshot, setSavedSnapshot] = useState<ProductUpdateInput>({});

  // Hidrata el form al cargar/refetch
  useEffect(() => {
    if (!data) return;
    const snap: ProductUpdateInput = {
      name:               data.name,
      tagline:            data.tagline,
      description:        data.description,
      categoria:          data.categoria,
      family:             data.family,
      linea:              data.linea,
      materialPrincipal:  data.materialPrincipal,
      acabado:            data.acabado,
      iluminacion:        data.iluminacion,
      instalacion:        data.instalacion,
      whatsappMessage:    data.whatsappMessage,
      order:              data.order,
      active:             data.active,
      featured:           !!data.featured,
    };
    setForm(snap);
    setSavedSnapshot(snap);
  }, [data]);

  // Solo enviamos lo que cambió respecto al snapshot
  const diff = (): ProductUpdateInput => {
    const out: ProductUpdateInput = {};
    (Object.keys(form) as (keyof ProductUpdateInput)[]).forEach((k) => {
      if (form[k] !== savedSnapshot[k]) (out as Record<string, unknown>)[k] = form[k];
    });
    return out;
  };

  const dirty = Object.keys(diff()).length > 0;

  const mutation = useMutation({
    mutationFn: (patch: ProductUpdateInput) => updateProduct(id, patch),
    onSuccess: (updated) => {
      qc.setQueryData(['admin', 'product', id], updated);
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || mutation.isPending) return;
    mutation.mutate(diff());
  };

  const update = <K extends keyof ProductUpdateInput>(k: K, v: ProductUpdateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-mute">
        <span className="text-[11px] font-light uppercase tracking-[0.3em]">
          Cargando producto
        </span>
      </div>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : 'Error';
    const notFound = msg.toLowerCase().includes('no encontrado');
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 md:px-10">
        <p className="mb-3 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
          {notFound ? '404' : 'Error'}
        </p>
        <h1 className="text-2xl font-light text-bone">
          {notFound ? 'Producto no encontrado' : 'No se pudo cargar'}
        </h1>
        <p className="mt-4 text-sm font-light text-mute">{msg}</p>
        <div className="mt-8 flex gap-3">
          <Link
            to="/productos"
            className="inline-flex items-center gap-2 border border-line px-4 py-3 text-[10px] font-light uppercase text-bone tracking-[0.25em] hover:bg-ink-soft"
          >
            <ArrowLeft size={12} strokeWidth={1.2} />
            Volver
          </Link>
          {!notFound && (
            <button onClick={() => refetch()} className="border border-line px-4 py-3 text-[10px] font-light uppercase text-bone tracking-[0.25em] hover:bg-ink-soft">
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10">
      {/* ── Breadcrumb ─────────────────────────────────── */}
      <nav className="py-6">
        <Link
          to="/productos"
          className="inline-flex items-center gap-2 text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone"
        >
          <ArrowLeft size={12} strokeWidth={1.2} />
          Productos
        </Link>
      </nav>

      {/* ── Header ─────────────────────────────────────── */}
      <header className="border-b border-line/40 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-3 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Producto
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-light text-bone md:text-4xl"
                style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
              >
                {data.name}
              </h1>
              <p className="mt-2 text-[10px] uppercase text-mute-dark tracking-[0.2em]">
                {data.ref} · {data.id}
              </p>
            </div>
            <a
              href={`https://d2pgrgppb9pktx.cloudfront.net/catalogo/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-line px-3 py-2 text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone hover:bg-ink-soft"
            >
              Ver público
              <ExternalLink size={12} strokeWidth={1.2} />
            </a>
          </div>
        </motion.div>
      </header>

      {/* ── Form ───────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-10 py-10">
        {/* Estado y visibilidad */}
        <Block title="Estado y visibilidad">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleBig
              on={!!form.active}
              onClick={() => update('active', !form.active)}
              label="Visible al público"
              icon={null}
            />
            <ToggleBig
              on={!!form.featured}
              onClick={() => update('featured', !form.featured)}
              label="Destacado en Home"
              icon="star"
            />
            <NumberField
              label="Orden"
              value={form.order ?? 0}
              onChange={(v) => update('order', v)}
              hint="Menor = aparece primero"
            />
          </div>
        </Block>

        {/* Contenido */}
        <Block title="Contenido">
          <TextField label="Nombre"      value={form.name        ?? ''} onChange={(v) => update('name', v)} />
          <TextField label="Tagline"     value={form.tagline     ?? ''} onChange={(v) => update('tagline', v)} />
          <TextareaField label="Descripción" value={form.description ?? ''} onChange={(v) => update('description', v)} />
          <TextField label="Categoría"   value={form.categoria   ?? ''} onChange={(v) => update('categoria', v)} />
        </Block>

        {/* Clasificación */}
        <Block title="Clasificación">
          <TextField label="Familia"  value={form.family ?? ''} onChange={(v) => update('family', v)} hint="Agrupa los productos en el catálogo" />
          <TextField label="Línea"    value={form.linea  ?? ''} onChange={(v) => update('linea', v)} />
        </Block>

        {/* Material y técnica */}
        <Block title="Material y técnica">
          <TextField label="Material principal" value={form.materialPrincipal ?? ''} onChange={(v) => update('materialPrincipal', v)} />
          <TextField label="Acabado"            value={form.acabado           ?? ''} onChange={(v) => update('acabado', v)} />
          <TextField label="Iluminación"        value={form.iluminacion       ?? ''} onChange={(v) => update('iluminacion', v)} />
          <TextField label="Instalación"        value={form.instalacion       ?? ''} onChange={(v) => update('instalacion', v)} />
        </Block>

        {/* WhatsApp */}
        <Block title="WhatsApp">
          <TextareaField
            label="Mensaje pre-llenado"
            value={form.whatsappMessage ?? ''}
            onChange={(v) => update('whatsappMessage', v)}
            hint={`Aparece al dar click en "Cotizar por WhatsApp". El número es ${data.whatsappNumber}.`}
          />
        </Block>

        {/* Read-only: tallas, precios, specs, imágenes */}
        <ReadOnlyBlock product={data} />

        {/* Acción guardar */}
        <div className="sticky bottom-0 -mx-6 mt-12 border-t border-line/60 bg-ink/95 px-6 py-4 backdrop-blur-sm md:-mx-10 md:px-10">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-light text-mute">
              {dirty
                ? `${Object.keys(diff()).length} cambio${Object.keys(diff()).length === 1 ? '' : 's'} sin guardar`
                : (mutation.isSuccess && !dirty ? '✓ Cambios guardados' : 'Sin cambios')}
              {mutation.isError && (
                <span className="ml-2 text-amber-soft">
                  · Error: {mutation.error instanceof Error ? mutation.error.message : 'no se pudo guardar'}
                </span>
              )}
            </p>
            <button
              type="submit"
              disabled={!dirty || mutation.isPending}
              className="inline-flex items-center gap-2 border border-amber/60 px-5 py-3 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={12} strokeWidth={1.2} />
              {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>

      <div className="py-12" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 * Sub-componentes de form
 * ──────────────────────────────────────────────────────── */

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

interface TextProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  hint?:    string;
}

function TextField({ label, value, onChange, hint }: TextProps) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
          {label}
        </span>
        {hint && <span className="text-[10px] font-light italic text-mute-dark">{hint}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
      />
    </label>
  );
}

function TextareaField({ label, value, onChange, hint }: TextProps) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
          {label}
        </span>
        {hint && <span className="text-[10px] font-light italic text-mute-dark">{hint}</span>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-y border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
          {label}
        </span>
        {hint && <span className="text-[10px] font-light italic text-mute-dark">{hint}</span>}
      </div>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-24 border border-line bg-ink-soft px-3 py-2 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
      />
    </label>
  );
}

interface ToggleBigProps {
  on:      boolean;
  onClick: () => void;
  label:   string;
  icon:    'star' | null;
}

function ToggleBig({ on, onClick, label, icon }: ToggleBigProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border px-4 py-3 text-[10px] font-light uppercase tracking-[0.2em] transition-colors ${
        on
          ? 'border-amber/60 text-bone bg-ink-soft'
          : 'border-line text-mute-dark hover:border-mute hover:text-mute'
      }`}
    >
      {icon === 'star'
        ? <Star size={12} strokeWidth={1.2} fill={on ? 'currentColor' : 'none'} className={on ? 'text-amber' : ''} />
        : <span className={`block h-1.5 w-1.5 rounded-full ${on ? 'bg-amber' : 'bg-mute-dark'}`} />}
      {label}
      <span className={on ? 'text-amber' : 'text-mute-dark'}>· {on ? 'Sí' : 'No'}</span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────
 * Bloque read-only para campos complejos (sprint futuro)
 * ──────────────────────────────────────────────────────── */

function ReadOnlyBlock({ product }: { product: ProductPublic }) {
  const tallasCount = Object.keys(product.tallas ?? {}).length;
  const pricesCount = product.prices?.length ?? 0;
  const specsCount  = Object.keys(product.specs ?? {}).length;
  const imagesCount = product.images?.length ?? 0;

  return (
    <section className="border border-line/40 bg-ink-soft p-6">
      <h2 className="mb-3 text-[11px] font-light uppercase text-mute tracking-[0.3em]">
        Pendiente de editar desde el panel
      </h2>
      <p className="mb-5 text-[11px] font-light italic leading-relaxed text-mute-dark">
        Estos campos vienen del seed. Por ahora se actualizan desde DynamoDB.
      </p>
      <dl className="grid grid-cols-2 gap-y-3 gap-x-6 md:grid-cols-4">
        <ReadStat label="Tallas"   value={tallasCount} />
        <ReadStat label="Precios"  value={pricesCount} />
        <ReadStat label="Specs"    value={specsCount}  />
        <ReadStat label="Imágenes" value={imagesCount} hint="Sprint A4" />
      </dl>
    </section>
  );
}

function ReadStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-light text-bone">
        {value} <span className="text-mute-dark">{value === 1 ? 'registro' : 'registros'}</span>
        {hint && <span className="ml-2 text-[10px] uppercase text-amber tracking-[0.2em]">{hint}</span>}
      </dd>
    </div>
  );
}
