// admin/src/pages/Analytics.tsx
// Página de analytics de visitas de productos.

import { useQuery } from '@tanstack/react-query';
import { BarChart2 } from 'lucide-react';
import { getAnalytics } from '@/api/analytics';

export function Analytics() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn:  getAnalytics,
  });

  // ── Estado: cargando ──
  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="flex items-center gap-3 text-mute">
          <span className="block h-px w-8 bg-amber/60" />
          <span className="text-[11px] font-light uppercase tracking-[0.3em]">
            Cargando analytics…
          </span>
        </div>
      </div>
    );
  }

  // ── Estado: error ──
  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <p className="text-sm font-light text-mute">No se pudieron cargar los analytics.</p>
        <button
          onClick={() => refetch()}
          className="mt-6 border border-line px-5 py-2 text-[11px] font-light uppercase text-bone tracking-[0.25em] transition-colors hover:bg-ink-soft"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      {/* ── Encabezado ── */}
      <div className="mb-10 flex items-center gap-3">
        <BarChart2 size={18} strokeWidth={1.2} className="text-amber" />
        <h1
          className="text-2xl font-light text-bone"
          style={{ letterSpacing: 'var(--tracking-wide-soft)' }}
        >
          Analytics
        </h1>
      </div>

      {/* ── Top productos ── */}
      <section className="mb-14">
        <p className="mb-5 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
          Productos más visitados
        </p>

        {data?.topProducts.length === 0 ? (
          <p className="text-sm font-light text-mute">Sin datos aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm font-light">
              <thead>
                <tr className="border-b border-line/40">
                  <th className="pb-3 pr-8 text-left text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                    Slug
                  </th>
                  <th className="pb-3 pr-8 text-left text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                    Vistas
                  </th>
                  <th className="pb-3 text-left text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                    Última visita
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.topProducts.map((p) => (
                  <tr key={p.slug} className="border-b border-line/20 hover:bg-ink-soft/40">
                    <td className="py-3 pr-8 text-bone">{p.slug}</td>
                    <td className="py-3 pr-8 text-mute">{p.viewCount.toLocaleString('es-MX')}</td>
                    <td className="py-3 text-mute">
                      {new Date(p.lastSeen).toLocaleString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Visitas recientes ── */}
      <section>
        <p className="mb-5 text-[10px] font-light uppercase text-amber tracking-[0.3em]">
          Visitas recientes (últimas 50)
        </p>

        {data?.recentVisits.length === 0 ? (
          <p className="text-sm font-light text-mute">Sin datos aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm font-light">
              <thead>
                <tr className="border-b border-line/40">
                  <th className="pb-3 pr-8 text-left text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                    Fecha
                  </th>
                  <th className="pb-3 pr-8 text-left text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                    IP
                  </th>
                  <th className="pb-3 text-left text-[10px] font-light uppercase text-mute-dark tracking-[0.25em]">
                    Página
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.recentVisits.map((v, i) => (
                  <tr key={`${v.visitedAt}-${v.ip}-${i}`} className="border-b border-line/20 hover:bg-ink-soft/40">
                    <td className="py-3 pr-8 text-mute">
                      {new Date(v.visitedAt).toLocaleString('es-MX')}
                    </td>
                    <td className="py-3 pr-8 font-mono text-xs text-mute">{v.ip}</td>
                    <td className="py-3 text-bone">{v.slug}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
