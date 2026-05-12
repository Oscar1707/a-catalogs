import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Check } from 'lucide-react';
import { createQuote } from '@/api/quotes';
import { PROJECT_TYPES } from '@/types/quote';

const FINISHES = [
  'Nogal natural',
  'Roble europeo',
  'Fresno gris',
  'Wengué',
  'Arce blanqueado',
] as const;

const MATERIALS = ['MDF', 'Madera natural', 'Listonado'] as const;

const BUDGETS = [
  'Menos de $10,000',
  '$10,000 – $30,000',
  '$30,000 – $60,000',
  'Más de $60,000',
  'No definido',
] as const;

const TIMELINES = [
  'Lo antes posible',
  '1 – 2 meses',
  '2 – 3 meses',
  'Sin prisa',
] as const;

/* ──────────────────────────────────────────────────────── */

interface QuoteForm {
  // Paso 1 — datos de contacto
  name:     string;
  phone:    string;
  email:    string;
  address:  string;
  // Paso 2 — diseño personalizado
  projectType: string;
  description: string;
  dimensions:  string;
  finish:      string;
  material:    string;
  reference:   string;
  budget:      string;
  timeline:    string;
  // Anti-spam (honeypot)
  website:     string;
}

const INITIAL: QuoteForm = {
  name: '', phone: '', email: '', address: '',
  projectType: '', description: '', dimensions: '',
  finish: '', material: '', reference: '',
  budget: '', timeline: '',
  website: '',
};

export function Quotes() {
  const [form, setForm] = useState<QuoteForm>(INITIAL);
  const [step, setStep] = useState<1 | 2>(1);

  const mutation = useMutation({
    mutationFn: createQuote,
  });

  const update = <K extends keyof QuoteForm>(k: K, v: QuoteForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const step1Valid = form.name.trim() && form.phone.trim();
  const step2Valid = form.projectType && form.description.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot — bots llenan este campo.
    if (form.website) {
      console.warn('[quotes] bot detectado (honeypot)');
      return;
    }

    mutation.mutate({
      name:        form.name,
      phone:       form.phone,
      email:       form.email      || undefined,
      address:     form.address    || undefined,
      projectType: form.projectType,
      description: form.description,
      dimensions:  form.dimensions || undefined,
      finish:      form.finish     || undefined,
      material:    form.material   || undefined,
      visualRef:   form.reference  || undefined,
      budget:      form.budget     || undefined,
      timeline:    form.timeline   || undefined,
    });
  };

  if (mutation.isSuccess) {
    return <ConfirmationView reference={mutation.data.reference} />;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 md:px-10">
      {/* ── Header de página ────────────────────────────── */}
      <section className="border-b border-line/40 py-20 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
            Cotizaciones
          </p>
          <h1
            className="text-4xl font-light leading-[1.1] text-bone md:text-5xl"
            style={{ letterSpacing: '-0.005em' }}
          >
            Diseño personalizado
          </h1>
          <p className="mt-6 text-sm font-light leading-relaxed text-mute">
            Cuéntanos tu proyecto. Recibirás un número de referencia para dar
            seguimiento desde la página de inicio.
          </p>
        </motion.div>
      </section>

      {/* ── Indicador de pasos ──────────────────────────── */}
      <div className="flex items-center gap-4 py-8">
        <StepDot n={1} active={step === 1} done={step > 1} label="Contacto" />
        <span className="h-px flex-1 bg-line/40" />
        <StepDot n={2} active={step === 2} done={false} label="Proyecto" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-24">
        {/* Honeypot anti-spam — invisible al usuario, los bots lo llenan. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
          className="absolute -left-[10000px] h-0 w-0 opacity-0"
          aria-hidden
        />

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <Field
              label="Nombre completo *"
              value={form.name}
              onChange={(v) => update('name', v)}
              required
            />
            <Field
              label="Teléfono / WhatsApp *"
              value={form.phone}
              onChange={(v) => update('phone', v)}
              type="tel"
              placeholder="55 1234 5678"
              required
            />
            <Field
              label="Correo electrónico (opcional)"
              value={form.email}
              onChange={(v) => update('email', v)}
              type="email"
            />
            <Field
              label="Dirección del proyecto o envío (opcional)"
              value={form.address}
              onChange={(v) => update('address', v)}
            />

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 border border-line px-6 py-3 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
                <ArrowRight size={14} strokeWidth={1.2} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <SelectField
              label="Tipo de proyecto *"
              value={form.projectType}
              onChange={(v) => update('projectType', v)}
              options={PROJECT_TYPES}
              required
            />
            <TextareaField
              label="Descripción del proyecto *"
              value={form.description}
              onChange={(v) => update('description', v)}
              placeholder="¿Qué tienes en mente? Espacio, uso, estilo..."
              required
            />
            <Field
              label="Dimensiones aproximadas (opcional)"
              value={form.dimensions}
              onChange={(v) => update('dimensions', v)}
              placeholder="ej. 2.5m x 1.2m x 0.6m"
            />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SelectField
                label="Acabado preferido"
                value={form.finish}
                onChange={(v) => update('finish', v)}
                options={FINISHES}
              />
              <SelectField
                label="Material preferido"
                value={form.material}
                onChange={(v) => update('material', v)}
                options={MATERIALS}
              />
            </div>
            <Field
              label="Referencia visual (opcional)"
              value={form.reference}
              onChange={(v) => update('reference', v)}
              placeholder="URL de Pinterest, Instagram, foto..."
            />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SelectField
                label="Presupuesto aproximado"
                value={form.budget}
                onChange={(v) => update('budget', v)}
                options={BUDGETS}
              />
              <SelectField
                label="Plazo deseado"
                value={form.timeline}
                onChange={(v) => update('timeline', v)}
                options={TIMELINES}
              />
            </div>

            {mutation.isError && (
              <p className="border border-line/60 bg-ink-soft px-4 py-3 text-sm font-light text-mute">
                No pudimos enviar tu cotización. Intenta de nuevo en unos segundos.
              </p>
            )}

            <div className="flex flex-wrap justify-between gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={mutation.isPending}
                className="text-[11px] font-light uppercase text-mute tracking-[0.25em] transition-colors hover:text-bone disabled:opacity-40"
              >
                ← Regresar
              </button>
              <button
                type="submit"
                disabled={!step2Valid || mutation.isPending}
                className="inline-flex items-center gap-2 border border-amber/60 px-6 py-3 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {mutation.isPending ? 'Enviando…' : 'Enviar cotización'}
                <ArrowRight size={14} strokeWidth={1.2} />
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </main>
  );
}

/* ────────────────────────────────────────────────────────
 * Confirmación post-envío.
 * Muestra el número de referencia con opción de copiar.
 * ──────────────────────────────────────────────────────── */
function ConfirmationView({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 md:px-10 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <p className="mb-5 text-[11px] font-light uppercase text-amber tracking-[0.3em]">
          Solicitud recibida
        </p>
        <h1
          className="text-3xl font-light leading-[1.15] text-bone md:text-4xl"
          style={{ letterSpacing: '-0.005em' }}
        >
          Gracias por tu interés
        </h1>
        <p className="mt-6 text-sm font-light leading-relaxed text-mute">
          Te contactaremos pronto por WhatsApp o teléfono. Guarda tu número de
          referencia para consultar el estatus desde la página de inicio.
        </p>

        <div className="mt-10 border border-line bg-ink-soft p-6">
          <p className="text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
            Número de referencia
          </p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p
              className="text-2xl font-light text-bone"
              style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
            >
              {reference}
            </p>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 border border-line px-4 py-2 text-[10px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink"
            >
              {copied
                ? <><Check size={12} strokeWidth={1.2} /> Copiado</>
                : 'Copiar'}
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

/* ─── Sub-componentes de formulario ─── */

interface FieldProps {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  type?:        string;
  required?:    boolean;
}

function Field({
  label, value, onChange, placeholder, type = 'text', required,
}: FieldProps) {
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

interface TextareaProps {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  required?:    boolean;
}

function TextareaField({
  label, value, onChange, placeholder, required,
}: TextareaProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={4}
        className="w-full resize-y border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone placeholder:text-mute-dark focus:border-amber/60 focus:outline-none"
      />
    </label>
  );
}

interface SelectProps {
  label:     string;
  value:     string;
  onChange:  (v: string) => void;
  options:   readonly string[];
  required?: boolean;
}

function SelectField({
  label, value, onChange, options, required,
}: SelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-light uppercase text-mute-dark tracking-[0.2em]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-line bg-ink-soft px-4 py-3 text-sm font-light text-bone focus:border-amber/60 focus:outline-none"
      >
        <option value="">Selecciona...</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

interface StepDotProps {
  n:      number;
  active: boolean;
  done:   boolean;
  label:  string;
}

function StepDot({ n, active, done, label }: StepDotProps) {
  const tone = done || active ? 'text-bone' : 'text-mute-dark';
  const border =
    done || active ? 'border-amber/60' : 'border-line';
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 items-center justify-center border ${border} ${tone} text-[11px] font-light`}
      >
        {done ? <Check size={12} strokeWidth={1.5} /> : n}
      </span>
      <span
        className={`text-[10px] font-light uppercase tracking-[0.2em] ${tone}`}
      >
        {label}
      </span>
    </div>
  );
}
