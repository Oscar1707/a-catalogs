// admin/src/pages/CotizacionDetail.tsx
// Detalle completo de una cotización + selector de status + timeline de notas.

import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Plus } from 'lucide-react';
import { addQuoteNote, getQuote, updateQuoteStatus } from '@/api/quotes';
import { StatusBadge } from '@/components/StatusBadge';
import { QUOTE_STATUSES, type QuoteStatus } from '@/types/quote';

export function CotizacionDetail() {
  const { reference = '' } = useParams<{ reference: string }>();
  const ref = reference.toUpperCase();
  const qc = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'quote', ref],
    queryFn:  () => getQuote(ref),
    enabled:  /^ACW-\d{4}-\d{4}$/.test(ref),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: QuoteStatus) => updateQuoteStatus(ref, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'quote',  ref] });
      qc.invalidateQueries({ queryKey: ['admin', 'quotes']     });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (text: string) => addQuoteNote(ref, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'quote', ref] });
    },
  });

  if (!/^ACW-\d{4}-\d{4}$/.test(ref)) {
    return (
      <NotFoundView reason="La referencia no tiene el formato ACW-YYYY-NNNN." />
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-mute">
        <span className="text-[11px] font-light uppercase tracking-[0.3em]">
          Cargando cotización
        </span>
      </div>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.toLowerCase().includes('no encontrada')) {
      return <NotFoundView reason="La cotización no existe o fue eliminada." />;
    }
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 md:px-10">
        <p className="text-sm font-light text-mute">No se pudo cargar la cotización.</p>
        <p className="mt-2 text-xs font-light text-mute-dark">{msg}</p>
        <button
          onClick={() => refetch()}
          className="mt-6 border border-line px-5 py-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10">
      {/* ── Breadcrumb ────────────────────────────────── */}
      <nav className="py-6">
        <Link
          to="/cotizaciones"
          className="inline-flex items-center gap-2 text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone"
        >
          <ArrowLeft size={12} strokeWidth={1.2} />
          Cotizaciones
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
            Cotización
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1
              className="text-3xl font-light text-bone md:text-4xl"
              style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
            >
              {data.reference}
            </h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-4 text-[11px] font-light uppercase text-mute-dark tracking-[0.2em]">
            Recibida {formatDateTime(data.createdAt)}
            {data.updatedAt !== data.createdAt && (
              <> · actualizada {formatDateTime(data.updatedAt)}</>
            )}
          </p>
        </motion.div>
      </header>

      {/* ── Grid 2 columnas (info + acciones) ─────────── */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 py-10 md:grid-cols-[1.4fr_1fr] md:py-14">
        {/* ─── Info ─── */}
        <section className="space-y-10">
          <InfoBlock title="Contacto">
            <Row label="Nombre"    value={data.name}                  />
            <Row label="Teléfono"  value={formatPhone(data.phone)}    />
            <Row label="Email"     value={data.email   || '—'}        />
            <Row label="Dirección" value={data.address || '—'}        />
          </InfoBlock>

          <InfoBlock title="Proyecto">
            <Row label="Tipo"        value={data.projectType}             />
            <Row label="Descripción" value={data.description} block       />
            <Row label="Dimensiones" value={data.dimensions || '—'}       />
            <Row label="Acabado"     value={data.finish     || '—'}       />
            <Row label="Material"    value={data.material   || '—'}       />
            <Row label="Referencia"  value={data.visualRef  || '—'}  link />
            <Row label="Presupuesto" value={data.budget     || '—'}       />
            <Row label="Plazo"       value={data.timeline   || '—'}       />
          </InfoBlock>
        </section>

        {/* ─── Acciones ─── */}
        <aside className="space-y-8">
          <ActionsBlock title="Status">
            <div className="grid grid-cols-1 gap-2">
              {QUOTE_STATUSES.map((s) => {
                const active = data.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => statusMutation.mutate(s)}
                    disabled={active || statusMutation.isPending}
                    className={`border px-3 py-2 text-left text-[10px] font-light uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed ${
                      active
                        ? 'border-amber/60 text-bone bg-ink-soft'
                        : 'border-line text-mute hover:border-line/80 hover:text-bone'
                    }`}
                  >
                    {s}
                    {active && <span className="ml-2 text-amber">·</span>}
                  </button>
                );
              })}
              {statusMutation.isError && (
                <p className="mt-2 text-[10px] font-light text-amber-soft">
                  Error: {statusMutation.error instanceof Error ? statusMutation.error.message : 'No se pudo actualizar'}
                </p>
              )}
            </div>
          </ActionsBlock>

          <ActionsBlock title="Contactar">
            <a
              href={waUrl(data.phone, data.reference, data.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 border border-amber/60 px-4 py-3 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
            >
              <MessageCircle size={14} strokeWidth={1.2} />
              WhatsApp
            </a>
            {data.email && (
              <a
                href={`mailto:${data.email}?subject=${encodeURIComponent(`Cotización ${data.reference} — Acacia Woods`)}`}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-line px-4 py-3 text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone hover:bg-ink-soft"
              >
                Correo
              </a>
            )}
          </ActionsBlock>
        </aside>
      </div>

      {/* ── Notas internas ─────────────────────────────── */}
      <NotesSection
        notes={data.notes}
        onAdd={(text) => noteMutation.mutate(text)}
        isAdding={noteMutation.isPending}
        addError={noteMutation.error instanceof Error ? noteMutation.error.message : null}
      />

      <div className="py-12" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 * Bloques visuales reutilizables
 * ──────────────────────────────────────────────────────── */

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
        {title}
      </h2>
      <dl className="grid grid-cols-1 gap-y-4 md:grid-cols-[140px_1fr] md:gap-y-5">
        {children}
      </dl>
    </div>
  );
}

function ActionsBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-line/40 bg-ink-soft p-5">
      <h2 className="mb-4 text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  block = false,
  link  = false,
}: {
  label: string;
  value: string;
  block?: boolean;
  link?:  boolean;
}) {
  return (
    <div className="contents">
      <dt className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
        {label}
      </dt>
      <dd className={`text-sm font-light text-bone ${block ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
        {link && /^https?:\/\//i.test(value)
          ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-bone underline-offset-4 hover:underline">{value}</a>
          : value}
      </dd>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 * Sección de notas internas (timeline + form)
 * ──────────────────────────────────────────────────────── */

function NotesSection({
  notes,
  onAdd,
  isAdding,
  addError,
}: {
  notes:    { id: string; text: string; createdAt: string }[];
  onAdd:    (text: string) => void;
  isAdding: boolean;
  addError: string | null;
}) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText(''); // Optimista — limpia al enviar
  };

  return (
    <section className="border-t border-line/40 pt-10">
      <header className="mb-6 flex items-end justify-between">
        <h2 className="text-[11px] font-light uppercase text-amber tracking-[0.3em]">
          Notas internas
        </h2>
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
          {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
        </span>
      </header>

      {/* Form para nueva nota */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Agrega una nota interna (qué hablaste con el cliente, decisiones, etc.)"
          rows={3}
          maxLength={4000}
          disabled={isAdding}
          className="w-full resize-y border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-light text-mute-dark">
            {addError ? (
              <span className="text-amber-soft">{addError}</span>
            ) : (
              `${text.length}/4000`
            )}
          </p>
          <button
            type="submit"
            disabled={!text.trim() || isAdding}
            className="inline-flex items-center gap-2 border border-line px-4 py-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAdding
              ? 'Guardando…'
              : <><Plus size={12} strokeWidth={1.2} /> Agregar nota</>}
          </button>
        </div>
      </form>

      {/* Timeline de notas */}
      <ul className="mt-10 space-y-6">
        {notes.length === 0 && (
          <li className="text-sm font-light italic text-mute">
            Sin notas aún. La primera que agregues quedará registrada con hora exacta.
          </li>
        )}
        {[...notes].reverse().map((n) => (
          <motion.li
            key={n.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="border-l-2 border-line pl-4"
          >
            <p className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
              {formatDateTime(n.createdAt)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-light leading-relaxed text-bone">
              {n.text}
            </p>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* ────────────────────────────────────────────────────────
 * 404
 * ──────────────────────────────────────────────────────── */

function NotFoundView({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 md:px-10 md:py-28">
      <p className="mb-4 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
        404
      </p>
      <h1 className="text-2xl font-light text-bone md:text-3xl">
        Cotización no encontrada
      </h1>
      <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-mute">
        {reason}
      </p>
      <Link
        to="/cotizaciones"
        className="mt-8 inline-flex items-center gap-2 border border-line px-4 py-3 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
      >
        <ArrowLeft size={12} strokeWidth={1.2} />
        Volver al inbox
      </Link>
    </div>
  );
}

/* ─── Helpers ─── */

function waUrl(phone: string, ref: string, name: string): string {
  const msg = encodeURIComponent(
    `Hola ${name.split(' ')[0]}, te escribo de Acacia Woods sobre tu cotización ${ref}.`,
  );
  return `https://wa.me/${phone}?text=${msg}`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D+/g, '');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
  if (d.length === 12) return d.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '$1 $2 $3 $4');
  return phone;
}

