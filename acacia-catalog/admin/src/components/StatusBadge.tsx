// admin/src/components/StatusBadge.tsx
// Badge visual para el status de una cotización.
// Tono Acacia — solo el color del borde + texto cambia.

import type { QuoteStatus } from '@/types/quote';

interface Props {
  status: QuoteStatus;
  size?: 'sm' | 'md';
}

function styleFor(status: QuoteStatus): string {
  // Códigos de color sutiles via opacidad del amber + tono de texto
  switch (status) {
    case 'Abierta':
      return 'border-amber/60 text-bone bg-amber/5';
    case 'En revisión':
      return 'border-amber/40 text-bone bg-ink-soft';
    case 'Propuesta enviada':
      return 'border-mute text-bone bg-ink-soft';
    case 'Finalizada · Aceptada':
      return 'border-mute-dark text-mute bg-ink-soft';
    case 'Finalizada · Rechazada':
      return 'border-line text-mute-dark bg-ink-soft';
    case 'Finalizada · Expirada':
      return 'border-line text-mute-dark bg-ink-soft italic';
  }
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${padding} ${textSize} font-light uppercase tracking-[0.2em] ${styleFor(status)}`}
    >
      {status}
    </span>
  );
}
