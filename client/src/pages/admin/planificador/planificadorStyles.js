// Estilos (animaciones y botones del encabezado) del Planificador.
export const CSS = `
  @keyframes pl-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pl-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes pl-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes pl-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pl-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  @keyframes pl-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }

  .pl-a1 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pl-a2 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .pl-a3 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .pl-a4 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }

  .pl-orb-1 { animation: pl-orb-1 8s ease-in-out infinite }
  .pl-orb-2 { animation: pl-orb-2 11s ease-in-out infinite }

  /* ── CTA primario (Actualizar) ── */
  .pl-cta {
    background: linear-gradient(135deg, #a855f7, #ec4899);
    box-shadow: 0 4px 18px rgba(168,85,247,.4);
    transition: all .22s ease; border: none;
  }
  .pl-cta:hover  { box-shadow: 0 7px 24px rgba(168,85,247,.55); transform: translateY(-2px) }
  .pl-cta:active { transform: translateY(0) }

  /* ── Botones ghost del hero ── */
  .pl-btn-ghost {
    transition: all .2s ease;
    border: 1px solid rgba(255,255,255,.2);
    background: transparent;
  }
  .pl-btn-ghost:hover { background: rgba(255,255,255,.1) }

  /* ── Glassmorphism — panel de filtros y widgets ── */
  .pl-glass {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(168,85,247,0.12);
    border-radius: 18px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9);
    transition: box-shadow .25s ease, border-color .25s ease;
  }
  .pl-glass:hover { border-color: rgba(168,85,247,0.22); box-shadow: 0 8px 32px rgba(168,85,247,0.1), inset 0 1px 0 rgba(255,255,255,0.9) }

  /* ── Input de búsqueda ── */
  .pl-search {
    background: rgba(255,255,255,0.85);
    border: 1.5px solid rgba(168,85,247,0.15);
    border-radius: 12px;
    transition: all .2s ease;
  }
  .pl-search:focus { outline: none; border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168,85,247,0.15); background: #fff }

  /* ── Select de filtro ── */
  .pl-select {
    background: rgba(255,255,255,0.85);
    border: 1.5px solid rgba(168,85,247,0.15);
    border-radius: 12px;
    transition: all .2s ease;
    cursor: pointer;
  }
  .pl-select:focus { outline: none; border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168,85,247,0.15) }

  /* ── Card de capacidad ── */
  .pl-capacity-card {
    background: linear-gradient(135deg, rgba(248,246,255,0.95) 0%, rgba(245,240,255,0.95) 100%);
    border: 1px solid rgba(168,85,247,0.18);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(168,85,247,0.07);
  }
  .pl-capacity-card .cap-header {
    background: linear-gradient(90deg, rgba(168,85,247,0.08), rgba(236,72,153,0.06));
    border-bottom: 1px solid rgba(168,85,247,0.12);
  }

  /* ── Card de advertencia (inconsistencias) ── */
  .pl-warning-card {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid rgba(245,158,11,0.35);
    border-radius: 18px;
    box-shadow: 0 2px 12px rgba(245,158,11,0.1);
  }

  /* ── Tabla filas ── */
  .pl-row { transition: background .15s ease }
  .pl-row:hover td { background: rgba(168,85,247,0.04) }

  /* ── Overlays y modales ── */
  .pl-overlay { animation: pl-fade-in .2s ease both }
  .pl-confirm { animation: pl-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  /* ── Skeleton ── */
  .pl-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#ede9fe 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: pl-shimmer 1.6s infinite;
    border-radius: 6px;
  }

  /* ── Botón Estatus Cliente activo ── */
  .pl-estatus-btn-active {
    background: linear-gradient(135deg,#a855f7,#ec4899);
    color: white;
    box-shadow: 0 4px 14px rgba(168,85,247,0.35);
  }

  @media (prefers-reduced-motion: reduce) {
    .pl-a1,.pl-a2,.pl-a3,.pl-a4,
    .pl-orb-1,.pl-orb-2,.pl-overlay,.pl-confirm,.pl-skeleton { animation: none !important; transition: none !important }
  }
`
