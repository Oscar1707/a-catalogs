// Configurador de producto — panel lateral tipo slide-over.
// Flujo de 3 pasos:
//   1. Selección de opciones del producto
//   2. Datos de contacto (nombre + teléfono)
//   3. Confirmación: referencia generada + botón de WhatsApp

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence }      from 'framer-motion';
import { useMutation }                  from '@tanstack/react-query';
import { X, MessageCircle, ArrowRight, ArrowLeft, Check, Copy } from 'lucide-react';
import { createQuote }                  from '@/api/quotes';
import type { ConfigField, ProductConfig } from '@/types/configurator';

interface Props {
  config:          ProductConfig;
  productRef:      string;
  whatsappNumber:  string;
  open:            boolean;
  onClose:         () => void;
}

type Step = 1 | 2 | 3;

interface ContactForm {
  name:    string;
  phone:   string;
  address: string;
}

export function ProductConfigurator({
  config, productRef, whatsappNumber, open, onClose,
}: Props) {
  const [step, setStep]             = useState<Step>(1);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [contact, setContact]       = useState<ContactForm>({ name: '', phone: '', address: '' });
  const [copied, setCopied]         = useState(false);
  const panelRef                    = useRef<HTMLDivElement>(null);

  const mutation = useMutation({ mutationFn: createQuote });

  // Bloquear scroll del body cuando el panel está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && step !== 3) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  // Resetear todo al abrir.
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelections({});
      setContact({ name: '', phone: '', address: '' });
      setCopied(false);
      mutation.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const select = (key: string, value: string) => {
    setSelections((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'tipoLuz') { delete next['tiraLed']; delete next['lamparaLed']; }
      return next;
    });
  };

  // Todos los campos requeridos y visibles del step 1 completados.
  const step1Complete = config.fields.every((field) => {
    if (!field.required) return true;
    if (field.type === 'static') return true;
    if (field.type === 'conditional') {
      if (selections[field.dependsOn ?? ''] !== field.whenValue) return true;
    }
    return !!selections[field.key];
  });

  const step2Complete = contact.name.trim().length >= 2
    && contact.phone.replace(/\D/g, '').length >= 10
    && contact.address.trim().length >= 5;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step2Complete) return;

    // Construir descripción a partir de las selecciones.
    const descParts: string[] = [`Configuración LUMINA — Ref. producto: ${productRef}`];
    config.fields.forEach((f) => {
      if (f.type === 'static') {
        descParts.push(`${f.label}: ${f.staticValue} ${f.unit ?? ''}`.trim());
        return;
      }
      if (f.type === 'conditional') {
        if (selections[f.dependsOn ?? ''] !== f.whenValue) return;
      }
      if (selections[f.key]) {
        descParts.push(`${f.label}: ${selections[f.key]}${f.unit ? ' ' + f.unit : ''}`);
      }
    });

    mutation.mutate({
      name:        contact.name.trim(),
      phone:       contact.phone,
      address:     contact.address.trim() || undefined,
      projectType: config.projectType,
      description: descParts.join(' · '),
    }, {
      onSuccess: () => setStep(3),
    });
  };

  // ── WhatsApp URL (step 3 usa la referencia real) ──────────────────────────
  const quoteRef  = mutation.data?.reference;
  const waMessage = config.buildMessage(selections, productRef, quoteRef);
  const waUrl     = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

  const copyRef = async () => {
    if (!quoteRef) return;
    await navigator.clipboard.writeText(quoteRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ──────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={step !== 3 ? onClose : undefined}
            className={`fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm ${step === 3 ? 'cursor-default' : 'cursor-pointer'}`}
            aria-hidden
          />

          {/* ── Panel ─────────────────────────────────────── */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal
            aria-label={config.title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-ink shadow-2xl md:max-w-md"
          >
            {/* ── Header ──────────────────────────────────── */}
            <div className="flex items-start justify-between border-b border-line/40 px-6 py-6">
              <div>
                <p className="mb-1 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
                  Configurador · Paso {step} de 3
                </p>
                <h2
                  className="text-xl font-light text-bone"
                  style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
                >
                  {step === 1 && config.title}
                  {step === 2 && 'Tus datos de contacto'}
                  {step === 3 && 'Solicitud registrada'}
                </h2>
                {step === 1 && config.subtitle && (
                  <p className="mt-1 text-xs font-light italic text-mute">{config.subtitle}</p>
                )}
              </div>
              {step !== 3 && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar configurador"
                  className="ml-4 mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center text-mute transition-colors hover:text-bone"
                >
                  <X size={18} strokeWidth={1.2} />
                </button>
              )}
            </div>

            {/* ── Indicador de pasos ───────────────────────── */}
            <div className="flex items-center gap-0 border-b border-line/40">
              {([1, 2, 3] as Step[]).map((n, i) => (
                <div
                  key={n}
                  className={`flex-1 h-0.5 transition-colors duration-500 ${step >= n ? 'bg-amber/70' : 'bg-line/40'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                />
              ))}
            </div>

            {/* ── Contenido según step ────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Step 1 — Opciones */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                    className="px-6 py-6 space-y-8"
                  >
                    {config.fields.map((field) => (
                      <FieldBlock
                        key={field.key}
                        field={field}
                        selections={selections}
                        onSelect={select}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Step 2 — Contacto */}
                {step === 2 && (
                  <motion.form
                    key="step2"
                    id="contact-form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                    className="px-6 py-6 space-y-5"
                  >
                    <p className="text-sm font-light leading-relaxed text-mute">
                      Guardamos tu configuración y generamos un código de referencia.
                      Úsalo para dar seguimiento desde la página de inicio.
                    </p>

                    <ContactField
                      label="Nombre completo *"
                      value={contact.name}
                      onChange={(v) => setContact((c) => ({ ...c, name: v }))}
                      required
                    />
                    <ContactField
                      label="Teléfono / WhatsApp *"
                      value={contact.phone}
                      onChange={(v) => setContact((c) => ({ ...c, phone: v }))}
                      type="tel"
                      placeholder="55 1234 5678"
                      required
                    />
                    <ContactField
                      label="Dirección de envío *"
                      value={contact.address}
                      onChange={(v) => setContact((c) => ({ ...c, address: v }))}
                      placeholder="Calle, número, colonia, ciudad, CP"
                      required
                    />

                    {mutation.isError && (
                      <p className="border border-line/60 bg-ink-soft px-4 py-3 text-xs font-light text-mute">
                        No pudimos guardar la solicitud. Intenta de nuevo.
                      </p>
                    )}
                  </motion.form>
                )}

                {/* Step 3 — Confirmación */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                    className="px-6 py-8 space-y-8"
                  >
                    {/* Referencia */}
                    <div>
                      <p className="mb-3 text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                        Número de referencia
                      </p>
                      <div className="flex items-center justify-between gap-4 border border-line bg-ink-soft px-5 py-4">
                        <span
                          className="text-2xl font-light text-bone"
                          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
                        >
                          {quoteRef}
                        </span>
                        <button
                          type="button"
                          onClick={copyRef}
                          aria-label="Copiar referencia"
                          className="inline-flex items-center gap-1.5 text-[10px] font-light uppercase text-mute tracking-[0.2em] transition-colors hover:text-bone"
                        >
                          {copied
                            ? <><Check size={12} strokeWidth={1.5} /> Copiado</>
                            : <><Copy size={12} strokeWidth={1.2} /> Copiar</>
                          }
                        </button>
                      </div>
                      <p className="mt-3 text-xs font-light italic text-mute-dark">
                        Guarda este número para consultar el estatus de tu solicitud.
                      </p>
                    </div>

                    {/* Resumen de configuración */}
                    <div>
                      <p className="mb-3 text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                        Tu configuración
                      </p>
                      <ul className="space-y-1.5">
                        {config.fields
                          .filter((f) => {
                            if (f.type === 'conditional') {
                              return selections[f.dependsOn ?? ''] === f.whenValue && selections[f.key];
                            }
                            return f.type === 'static' || selections[f.key];
                          })
                          .map((f) => (
                            <li key={f.key} className="flex items-baseline justify-between gap-4">
                              <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
                                {f.label}
                              </span>
                              <span className="text-sm font-light text-bone">
                                {f.type === 'static'
                                  ? `${f.staticValue} ${f.unit ?? ''}`.trim()
                                  : `${selections[f.key]}${f.unit ? ' ' + f.unit : ''}`}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer — botones según step ─────────────── */}
            <div className="border-t border-line/40 px-6 py-5">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!step1Complete}
                  className="flex w-full items-center justify-center gap-3 border border-line px-6 py-4 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuar
                  <ArrowRight size={14} strokeWidth={1.2} />
                </button>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <button
                    type="submit"
                    form="contact-form"
                    disabled={!step2Complete || mutation.isPending}
                    className="flex w-full items-center justify-center gap-3 border border-amber/60 px-6 py-4 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {mutation.isPending ? 'Guardando…' : 'Registrar y obtener referencia'}
                    {!mutation.isPending && <ArrowRight size={14} strokeWidth={1.2} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={mutation.isPending}
                    className="w-full text-center text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone disabled:opacity-40"
                  >
                    <ArrowLeft size={11} strokeWidth={1.2} className="inline mr-1" />
                    Regresar
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-3 border border-amber/60 bg-ink-soft px-6 py-4 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink"
                  >
                    <MessageCircle size={15} strokeWidth={1.2} />
                    Abrir WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full text-center text-[10px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ────────────────────────────────────────────────────────
 * FieldBlock — renderiza un campo según su tipo.
 * ──────────────────────────────────────────────────────── */
interface FieldBlockProps {
  field:      ConfigField;
  selections: Record<string, string>;
  onSelect:   (key: string, value: string) => void;
}

function FieldBlock({ field, selections, onSelect }: FieldBlockProps) {
  if (field.type === 'conditional') {
    if (selections[field.dependsOn ?? ''] !== field.whenValue) return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
          {field.label}
        </span>
        {field.unit && (
          <span className="text-[10px] font-light text-mute-dark">({field.unit})</span>
        )}
        {field.required && field.type !== 'static' && (
          <span className="text-[10px] font-light text-amber">*</span>
        )}
      </div>

      {field.type === 'static' && (
        <div className="inline-flex items-center gap-2 border border-line/40 bg-ink-soft px-4 py-2">
          <span className="text-sm font-light text-bone">{field.staticValue}</span>
          {field.unit && <span className="text-xs font-light text-mute">{field.unit}</span>}
          <span className="ml-2 text-[10px] font-light italic text-mute-dark">fija</span>
        </div>
      )}

      {(field.type === 'chips' || field.type === 'conditional') && field.options && (
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => {
            const isSelected = selections[field.key] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(field.key, opt.value)}
                aria-pressed={isSelected}
                className={`group flex flex-col items-start border px-3 py-2 text-left transition-colors
                  ${isSelected
                    ? 'border-amber/70 bg-ink-soft text-bone'
                    : 'border-line/50 text-mute hover:border-mute hover:text-bone'
                  }`}
              >
                <span className="text-[11px] font-light leading-tight">{opt.label}</span>
                {opt.hint && (
                  <span className={`mt-0.5 text-[9px] leading-none transition-colors ${isSelected ? 'text-amber' : 'text-mute-dark group-hover:text-mute'}`}>
                    {opt.hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ── Campo de contacto ────────────────────────────────── */
interface ContactFieldProps {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  type?:        string;
  placeholder?: string;
  required?:    boolean;
}

function ContactField({ label, value, onChange, type = 'text', placeholder, required }: ContactFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
      />
    </label>
  );
}
