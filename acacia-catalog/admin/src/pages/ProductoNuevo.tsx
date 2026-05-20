// admin/src/pages/ProductoNuevo.tsx
// Form para crear un producto. Solo campos mínimos — el resto se edita
// después en /productos/:id (precios, tallas, imágenes vendrán en A4).

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import { createProduct } from '@/api/products';
import type { ProductCreateInput } from '@/types/product';

const DEFAULT_WHATSAPP = '525639292363';

const INITIAL: ProductCreateInput = {
  id:               '',
  ref:              '',
  slug:             '',
  name:             '',
  family:           '',
  linea:            '',
  categoria:        '',
  tagline:          '',
  description:      '',
  whatsappNumber:   DEFAULT_WHATSAPP,
  whatsappMessage:  '',
};

// Convierte "Mesa FOLSE" → "mesa-folse"
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quitar diacríticos
    .replace(/[^a-z0-9]+/g, '-')        // no-alfanum → guión
    .replace(/^-+|-+$/g, '')            // limpiar guiones extremos
    .slice(0, 80);
}

export function ProductoNuevo() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductCreateInput>(INITIAL);
  const [touchedSlug, setTouchedSlug] = useState(false);

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess:  (created) => {
      // Invalidate cache de lista para que aparezca al regresar
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      // Redirige al detalle para terminar de llenar precios/tallas/imágenes
      navigate(`/productos/${created.id}`, { replace: true });
    },
  });

  // Auto-derivar slug del nombre, salvo que el usuario lo haya tocado
  const update = <K extends keyof ProductCreateInput>(key: K, value: ProductCreateInput[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'name' && !touchedSlug && typeof value === 'string') {
        next.slug = slugify(value);
      }
      if (key === 'id' && typeof value === 'string') {
        next.id = value.toUpperCase();
        if (!f.ref) next.ref = value.toUpperCase();
      }
      return next;
    });
  };

  const valid =
    /^[A-Z][A-Z0-9-]{2,49}$/.test(form.id) &&
    /^[a-z0-9](?:[a-z0-9-]{0,79})$/.test(form.slug) &&
    form.name.trim().length >= 2 &&
    form.family.trim().length >= 1;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || mutation.isPending) return;

    mutation.mutate({
      ...form,
      id:   form.id.toUpperCase().trim(),
      ref:  (form.ref || form.id).toUpperCase().trim(),
      slug: form.slug.toLowerCase().trim(),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-10">
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
            Nuevo producto
          </p>
          <h1
            className="text-3xl font-light text-bone md:text-4xl"
            style={{ letterSpacing: '-0.005em' }}
          >
            Crear producto
          </h1>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-mute">
            Llena los campos mínimos. Después podrás editar precios, tallas,
            descripciones largas y subir imágenes en el detalle.
          </p>
        </motion.div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10 py-10">
        {/* ── Identificación ──────────────────────────── */}
        <Block title="Identificación">
          <Field
            label="ID del producto *"
            value={form.id}
            onChange={(v) => update('id', v.toUpperCase())}
            placeholder="ACA-MES-005"
            hint="Formato: ACA-XXX-000 · mayúsculas, dígitos y guiones · 3-50 chars"
            mono
          />
          <Field
            label="Referencia *"
            value={form.ref}
            onChange={(v) => update('ref', v.toUpperCase())}
            placeholder="ACA-MES-005"
            hint="Generalmente igual al ID"
            mono
          />
          <Field
            label="Slug (URL pública) *"
            value={form.slug}
            onChange={(v) => { setTouchedSlug(true); update('slug', v.toLowerCase()); }}
            placeholder="mesa-folse"
            hint="Minúsculas y guiones · se autocompleta al escribir el nombre · queda en /catalogo/<slug>"
            mono
          />
        </Block>

        {/* ── Contenido principal ─────────────────────── */}
        <Block title="Contenido">
          <Field
            label="Nombre *"
            value={form.name}
            onChange={(v) => update('name', v)}
            placeholder="VORDEN"
          />
          <Field
            label="Familia *"
            value={form.family}
            onChange={(v) => update('family', v)}
            placeholder="Muebles TV"
            hint="Agrupa los productos en el catálogo público"
          />
          <Field
            label="Línea"
            value={form.linea ?? ''}
            onChange={(v) => update('linea', v)}
            placeholder="Muebles para TV"
          />
          <Field
            label="Categoría"
            value={form.categoria ?? ''}
            onChange={(v) => update('categoria', v)}
            placeholder="Mueble TV Flotante con Iluminación"
          />
          <Field
            label="Tagline"
            value={form.tagline ?? ''}
            onChange={(v) => update('tagline', v)}
            placeholder="Luz que define la forma."
          />
          <Textarea
            label="Descripción"
            value={form.description ?? ''}
            onChange={(v) => update('description', v)}
            placeholder="Descripción corta, tono Acacia."
          />
        </Block>

        {/* ── WhatsApp ────────────────────────────────── */}
        <Block title="WhatsApp">
          <Field
            label="Número"
            value={form.whatsappNumber ?? ''}
            onChange={(v) => update('whatsappNumber', v)}
            placeholder="525639292363"
            hint="Solo dígitos · default Acacia Woods"
            mono
          />
          <Textarea
            label="Mensaje pre-llenado"
            value={form.whatsappMessage ?? ''}
            onChange={(v) => update('whatsappMessage', v)}
            placeholder="Se genera automáticamente con el nombre si lo dejas vacío"
          />
        </Block>

        {/* ── Submit ─────────────────────────────────── */}
        <div className="sticky bottom-0 -mx-6 mt-12 border-t border-line/60 bg-ink/95 px-6 py-4 backdrop-blur-sm md:-mx-10 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-light text-mute">
              {mutation.isError ? (
                <span className="text-amber-soft">
                  {mutation.error instanceof Error ? mutation.error.message : 'No se pudo crear'}
                </span>
              ) : valid ? (
                'Listo para crear · seguirás editando precios e imágenes en el detalle'
              ) : (
                'Completa los campos marcados con *'
              )}
            </p>
            <div className="flex gap-3">
              <Link
                to="/productos"
                className="inline-flex items-center gap-2 border border-line px-4 py-3 text-[10px] font-light uppercase text-mute tracking-[0.25em] hover:text-bone hover:bg-ink-soft"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={!valid || mutation.isPending}
                className="inline-flex items-center gap-2 border border-amber/60 px-5 py-3 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={12} strokeWidth={1.2} />
                {mutation.isPending ? 'Creando…' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="py-12" />
    </div>
  );
}

/* ─── Sub-componentes ─── */

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

interface FieldProps {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  hint?:        string;
  mono?:        boolean;
}

function Field({ label, value, onChange, placeholder, hint, mono }: FieldProps) {
  return (
    <label className="block">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
          {label}
        </span>
        {hint && <span className="text-[10px] font-light italic text-mute-dark">{hint}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none ${mono ? 'font-mono' : ''}`}
        style={mono ? { letterSpacing: '0.05em' } : undefined}
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, hint }: FieldProps) {
  return (
    <label className="block">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
          {label}
        </span>
        {hint && <span className="text-[10px] font-light italic text-mute-dark">{hint}</span>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
      />
    </label>
  );
}
