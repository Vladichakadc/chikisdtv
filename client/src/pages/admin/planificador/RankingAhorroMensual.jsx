/**
 * RankingAhorroMensual — Huashu Dark Edition
 * Skills: huashu-design · ui-ux-pro-max · taste-skill
 *
 * Clasifica pantallas del Planificador por su porcentaje de ganancia (`porcentaje`).
 *  1. KPIs globales (promedio, máx, mín)
 *  2. Podio animado top-3 con medallas y barra proporcional
 *  3. Distribución por tramos (donut SVG puro + barras duales)
 *  4. Lista completa del ranking con mini-barra de progreso y badge de nivel
 */

import { useMemo, useState } from 'react'
import {
  Trophy, TrendingUp, Percent, ChevronDown, ChevronUp,
  Sparkles, Info, Crown, Medal, Award,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v, d = 1) =>
  v == null ? '—' : `${Number(v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })}%`

const tipoPlanLabel = (duracionPlan, tipoPlan) => {
  if (tipoPlan) return { label: tipoPlan, color: '#f97316' }
  const d = duracionPlan != null ? Math.floor(Number(duracionPlan)) : null
  if (d === 14) return { label: 'Anual',     color: '#10b981' }
  if (d === 7)  return { label: 'Semestral', color: '#f59e0b' }
  if (d === 1)  return { label: 'Mensual',   color: '#7c3aed' }
  return null
}

const pctGradient = (pct) => {
  if (pct == null) return 'linear-gradient(90deg,#555568,#777790)'
  if (pct >= 50)   return 'linear-gradient(90deg,#059669,#10b981)'
  if (pct >= 30)   return 'linear-gradient(90deg,#d97706,#f59e0b)'
  if (pct >= 15)   return 'linear-gradient(90deg,#ea580c,#f97316)'
  return 'linear-gradient(90deg,#dc2626,#ef4444)'
}

const pctColor = (pct) => {
  if (pct == null) return '#555568'
  if (pct >= 50)   return '#10b981'
  if (pct >= 30)   return '#f59e0b'
  if (pct >= 15)   return '#f97316'
  return '#ef4444'
}

const TRAMOS = [
  { label: '≥ 50%',  desde: 50, hasta: Infinity, color: '#10b981', emoji: '🏆' },
  { label: '30–49%', desde: 30, hasta: 50,        color: '#f59e0b', emoji: '🥈' },
  { label: '15–29%', desde: 15, hasta: 30,        color: '#f97316', emoji: '📊' },
  { label: '< 15%',  desde: 0,  hasta: 15,        color: '#ef4444', emoji: '⚠️' },
]

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes ram-up    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ram-scale { from{opacity:0;transform:scale(.88)}       to{opacity:1;transform:scale(1)} }
  @keyframes ram-bonce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }

  .ram-a1{animation:ram-up .48s cubic-bezier(.22,1,.36,1) both}
  .ram-a2{animation:ram-up .48s cubic-bezier(.22,1,.36,1) .08s both}
  .ram-a3{animation:ram-up .48s cubic-bezier(.22,1,.36,1) .16s both}
  .ram-a4{animation:ram-up .48s cubic-bezier(.22,1,.36,1) .24s both}

  .ram-glass{
    background:rgba(22,22,31,.88);
    backdrop-filter:blur(20px) saturate(180%);
    -webkit-backdrop-filter:blur(20px) saturate(180%);
    border:1px solid rgba(255,255,255,.07);
    border-radius:18px;
    transition:border-color .25s ease,box-shadow .25s ease,transform .25s ease;
  }
  .ram-glass:hover{
    border-color:rgba(124,58,237,.28);
    box-shadow:0 0 28px rgba(124,58,237,.15);
    transform:translateY(-2px);
  }
  .ram-podio{
    background:rgba(20,20,28,.92);
    backdrop-filter:blur(24px);
    -webkit-backdrop-filter:blur(24px);
    border:1px solid rgba(255,255,255,.07);
    border-radius:20px;
    transition:transform .3s ease,box-shadow .3s ease;
    position:relative;overflow:hidden;
  }
  .ram-podio:hover{transform:translateY(-7px);box-shadow:0 24px 60px rgba(0,0,0,.55);}
  .ram-medal-float{animation:ram-bonce 2.6s ease-in-out infinite}
  .ram-row{
    border-radius:11px;
    transition:background .18s ease,transform .18s ease;
  }
  .ram-row:hover{background:rgba(124,58,237,.09)!important;transform:translateX(4px);}
  .ram-bar-track{height:7px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;}
  .ram-bar-fill{height:100%;border-radius:99px;transition:width 1.2s cubic-bezier(.22,1,.36,1);}
  .ram-badge{
    display:inline-flex;align-items:center;gap:3px;
    padding:2px 8px;border-radius:99px;
    font-size:10px;font-weight:700;letter-spacing:.04em;
  }
  .ram-toggle{
    display:inline-flex;align-items:center;gap:6px;
    padding:6px 14px;border-radius:10px;
    background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.25);
    font-size:12px;font-weight:600;color:#a78bfa;cursor:pointer;
    transition:all .2s ease;
  }
  .ram-toggle:hover{background:rgba(124,58,237,.22);border-color:rgba(124,58,237,.5);color:#c4b5fd;}
  .ram-info{
    background:rgba(124,58,237,.07);
    border:1px solid rgba(124,58,237,.18);
    border-radius:12px;padding:12px 16px;
  }
  @media(prefers-reduced-motion:reduce){
    .ram-a1,.ram-a2,.ram-a3,.ram-a4,.ram-podio,.ram-row,.ram-medal-float{animation:none!important;transition:none!important;}
  }
`

// ─── Podio card ───────────────────────────────────────────────────────────────

const MEDAL = {
  0:{ bg:'linear-gradient(135deg,#fbbf24,#d97706)', glow:'rgba(251,191,36,.55)', Icon:Crown,  sz:28, label:'1er Lugar' },
  1:{ bg:'linear-gradient(135deg,#e2e8f0,#94a3b8)', glow:'rgba(148,163,184,.4)', Icon:Medal,  sz:22, label:'2do Lugar' },
  2:{ bg:'linear-gradient(135deg,#f97316,#ea580c)', glow:'rgba(249,115,22,.4)',  Icon:Award,  sz:20, label:'3er Lugar' },
}

function PodioCard({ p, rank, maxPct }) {
  const m   = MEDAL[rank]
  const pct = Number(p.porcentaje ?? 0)
  const plan = tipoPlanLabel(p.duracionPlan, p.tipoPlan)
  const nombre = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.nickname || '—'
  const barW = maxPct > 0 ? Math.round((pct / maxPct) * 100) : 0
  const { Icon } = m

  return (
    <div className="ram-podio" style={{
      padding: '22px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', gap: 10,
      /* 1st in center */
      order: rank === 0 ? 2 : rank === 1 ? 1 : 3,
    }}>
      {/* Glow de fondo */}
      <div style={{
        position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)',
        width:140, height:140, borderRadius:'50%',
        background: m.bg, opacity:.07, filter:'blur(35px)', pointerEvents:'none',
      }}/>

      {/* Medalla */}
      <div
        className={rank === 0 ? 'ram-medal-float' : ''}
        style={{
          width: rank===0?60:48, height: rank===0?60:48,
          borderRadius:'50%', background: m.bg,
          boxShadow:`0 0 ${rank===0?28:18}px ${m.glow}`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}
      >
        <Icon size={m.sz} color="white" strokeWidth={2.3} />
      </div>

      <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.32)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        {m.label}
      </span>

      <p style={{ fontSize:13, fontWeight:700, color:'#f0f0fa', lineHeight:1.3, maxWidth:160, wordBreak:'break-word', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        {nombre}
      </p>

      <span style={{ fontSize:10, color:'#7c3aed', fontWeight:700, fontFamily:'monospace' }}>
        {p.idPantalla}
      </span>

      {/* % grande */}
      <p style={{
        fontSize: rank===0?38:28, fontWeight:900, lineHeight:1,
        fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'-0.02em',
        background: pctGradient(pct),
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
      }}>
        {fmt(pct)}
      </p>
      <p style={{ fontSize:9, color:'rgba(255,255,255,.3)', marginTop:-6 }}>ganancia mensual</p>

      {/* Barra */}
      <div className="ram-bar-track" style={{ width:'85%' }}>
        <div className="ram-bar-fill" style={{ width:`${barW}%`, background:pctGradient(pct) }} />
      </div>

      {plan && (
        <span className="ram-badge" style={{ background:`${plan.color}22`, color:plan.color, border:`1px solid ${plan.color}44` }}>
          {plan.label}
        </span>
      )}

      {(p.pantallas ?? 1) > 1 && (
        <span style={{ fontSize:10, color:'rgba(255,255,255,.28)' }}>{p.pantallas} pantallas</span>
      )}
    </div>
  )
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────

function DonutChart({ tramos }) {
  const total = tramos.reduce((s, t) => s + t.count, 0)
  if (!total) return null
  const r = 52, cx = 68, cy = 68, circ = 2 * Math.PI * r
  let offset = 0
  const segs = tramos.map(t => {
    const dash = (t.count / total) * circ
    const s = { ...t, dash, offset }
    offset += dash
    return s
  })
  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="20" />
      {segs.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth="20"
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset} strokeLinecap="butt"
          style={{ transformOrigin:`${cx}px ${cy}px`, transform:'rotate(-90deg)' }}
        />
      ))}
      <text x={cx} y={cy-6}  textAnchor="middle" fill="#f0f0fa"            fontSize="20" fontWeight="800" fontFamily="'Plus Jakarta Sans',sans-serif">{total}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill="rgba(255,255,255,.3)" fontSize="8"  fontWeight="700" fontFamily="'Plus Jakarta Sans',sans-serif" letterSpacing="1">CLIENTES</text>
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function RankingAhorroMensual({ pantallas }) {
  const [expanded, setExpanded]     = useState(false)
  const [showDistrib, setShowDistrib] = useState(true)

  /* Solo pantallas con cliente y % registrado */
  const ranked = useMemo(() => {
    if (!pantallas?.length) return []
    return pantallas
      .filter(p => {
        const nombre = (String(p.nombre ?? '') + String(p.apellido ?? '') + String(p.nickname ?? '')).trim()
        return nombre && p.porcentaje != null && Number(p.porcentaje) > 0
      })
      .sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje))
  }, [pantallas])

  const stats = useMemo(() => {
    if (!ranked.length) return null
    const pcts = ranked.map(p => Number(p.porcentaje))
    return {
      avg: pcts.reduce((s, v) => s + v, 0) / pcts.length,
      max: Math.max(...pcts),
      min: Math.min(...pcts),
      total: ranked.length,
    }
  }, [ranked])

  const tramosData = useMemo(() => TRAMOS.map(t => {
    const members = ranked.filter(p => { const v = Number(p.porcentaje); return v >= t.desde && v < t.hasta })
    return { ...t, count: members.length, sumPct: members.reduce((s, p) => s + Number(p.porcentaje), 0) }
  }), [ranked])

  const totalSumPct = tramosData.reduce((s, t) => s + t.sumPct, 0)
  const maxPct      = stats?.max ?? 0
  const top3        = ranked.slice(0, 3)
  const visible     = expanded ? ranked : ranked.slice(0, 8)

  /* ── Empty state ── */
  if (!ranked.length) return (
    <div className="ram-glass" style={{ padding:'36px 24px', textAlign:'center' }}>
      <style>{CSS}</style>
      <Percent size={38} style={{ color:'#7c3aed', margin:'0 auto 14px', opacity:.4 }} />
      <p style={{ color:'rgba(255,255,255,.38)', fontSize:14 }}>Sin porcentajes de ganancia registrados.</p>
      <p style={{ color:'rgba(255,255,255,.2)', fontSize:11, marginTop:6 }}>
        Edita una pantalla en el planificador y asigna el campo <strong style={{ color:'rgba(255,255,255,.35)' }}>% Ganancia</strong>.
      </p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{CSS}</style>

      {/* ── Encabezado ── */}
      <div className="ram-a1" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:42, height:42, borderRadius:13, flexShrink:0,
            background:'linear-gradient(135deg,#7c3aed22,#06b6d433)',
            border:'1px solid rgba(124,58,237,.28)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 22px rgba(124,58,237,.22)',
          }}>
            <Trophy size={20} style={{ color:'#a78bfa' }} />
          </div>
          <div>
            <h2 style={{
              fontSize:18, fontWeight:800, color:'#f0f0fa',
              fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'-0.01em', lineHeight:1.2,
            }}>Ranking de Ahorro Mensual</h2>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.32)', marginTop:2 }}>
              {ranked.length} pantallas con % de ganancia · mayor a menor
            </p>
          </div>
        </div>

        {/* KPIs globales */}
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          {[
            { label:'Promedio', val:fmt(stats?.avg), c:'#a78bfa' },
            { label:'Máximo',   val:fmt(stats?.max), c:'#10b981' },
            { label:'Mínimo',   val:fmt(stats?.min), c:'#f97316' },
          ].map(k => (
            <div key={k.label} style={{ textAlign:'right' }}>
              <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:'.1em', textTransform:'uppercase' }}>{k.label}</p>
              <p style={{ fontSize:20, fontWeight:900, color:k.c, lineHeight:1, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{k.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PODIO TOP 3 ── */}
      {top3.length >= 2 && (
        <div className="ram-a2" style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
          {top3.map((p, i) => (
            <div key={p.idPantalla} style={{ flex:1, minWidth:0 }}>
              <PodioCard p={p} rank={i} maxPct={maxPct} />
            </div>
          ))}
        </div>
      )}

      {/* ── DISTRIBUCIÓN POR TRAMOS ── */}
      <div className="ram-a3">
        <button className="ram-toggle" onClick={() => setShowDistrib(v => !v)} style={{ marginBottom:10 }}>
          <TrendingUp size={13} />
          Distribución de ganancia por tramos
          {showDistrib ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
        </button>

        {showDistrib && (
          <div className="ram-glass" style={{ padding:'20px' }}>
            <div style={{ display:'flex', gap:24, alignItems:'center', flexWrap:'wrap' }}>
              <DonutChart tramos={tramosData} />

              <div style={{ flex:1, minWidth:200, display:'flex', flexDirection:'column', gap:14 }}>
                {tramosData.map(t => {
                  const poolPct  = totalSumPct > 0 ? (t.sumPct / totalSumPct) * 100 : 0
                  const cntPct   = ranked.length  > 0 ? (t.count  / ranked.length)  * 100 : 0
                  return (
                    <div key={t.label}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:14 }}>{t.emoji}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:t.color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{t.label}</span>
                          <span style={{ fontSize:10, color:'rgba(255,255,255,.32)', background:'rgba(255,255,255,.06)', borderRadius:99, padding:'1px 7px' }}>
                            {t.count} cliente{t.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize:14, fontWeight:800, color:t.color }}>{poolPct.toFixed(1)}%</span>
                          <span style={{ fontSize:10, color:'rgba(255,255,255,.28)', marginLeft:4 }}>del pool</span>
                        </div>
                      </div>
                      {/* Barra clientes */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:9, color:'rgba(255,255,255,.28)', width:48 }}>Clientes</span>
                        <div className="ram-bar-track" style={{ flex:1 }}>
                          <div className="ram-bar-fill" style={{ width:`${cntPct}%`, background:`${t.color}88` }}/>
                        </div>
                        <span style={{ fontSize:10, color:'rgba(255,255,255,.38)', width:30, textAlign:'right' }}>{cntPct.toFixed(0)}%</span>
                      </div>
                      {/* Barra pool */}
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:9, color:'rgba(255,255,255,.28)', width:48 }}>Pool %</span>
                        <div className="ram-bar-track" style={{ flex:1 }}>
                          <div className="ram-bar-fill" style={{ width:`${poolPct}%`, background:`linear-gradient(90deg,${t.color}cc,${t.color})` }}/>
                        </div>
                        <span style={{ fontSize:10, color:t.color, fontWeight:700, width:30, textAlign:'right' }}>{poolPct.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Nota informativa */}
            <div className="ram-info" style={{ marginTop:16, display:'flex', gap:10, alignItems:'flex-start' }}>
              <Info size={14} style={{ color:'#a78bfa', flexShrink:0, marginTop:2 }} />
              <p style={{ fontSize:11, color:'rgba(255,255,255,.42)', lineHeight:1.65 }}>
                <strong style={{ color:'#c4b5fd' }}>¿Cómo leer la distribución?</strong>{' '}
                La barra <strong style={{ color:'#e2e8f0' }}>Clientes</strong> muestra qué fracción del total de pantallas está en ese tramo.
                La barra <strong style={{ color:'#e2e8f0' }}>Pool %</strong> refleja cuánto del total acumulado de porcentajes aporta ese grupo —
                un tramo con pocos clientes pero % altos concentra mayor ganancia potencial y merece atención prioritaria para la retención.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── LISTA COMPLETA ── */}
      <div className="ram-glass ram-a4" style={{ overflow:'hidden' }}>
        {/* Header */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'44px 1fr 100px 72px 100px 82px',
          gap:8, padding:'12px 16px',
          borderBottom:'1px solid rgba(255,255,255,.06)',
          background:'rgba(0,0,0,.22)',
        }}>
          {['#','Cliente / Pantalla','Plan','Screens','% Ganancia','Nivel'].map((h, i) => (
            <span key={h} style={{
              fontSize:9, fontWeight:700, color:'rgba(255,255,255,.28)',
              letterSpacing:'.1em', textTransform:'uppercase',
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              textAlign: i >= 2 ? 'center' : 'left',
            }}>{h}</span>
          ))}
        </div>

        <div style={{ padding:'8px 8px' }}>
          {visible.map((p, idx) => {
            const nombre = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.nickname || '—'
            const pct    = Number(p.porcentaje)
            const plan   = tipoPlanLabel(p.duracionPlan, p.tipoPlan)
            const barW   = maxPct > 0 ? Math.round((pct / maxPct) * 100) : 0
            const tramo  = TRAMOS.find(t => pct >= t.desde && pct < t.hasta) || TRAMOS[3]
            const isTop  = idx < 3

            return (
              <div key={p.idPantalla} className="ram-row" style={{
                display:'grid', gridTemplateColumns:'44px 1fr 100px 72px 100px 82px',
                gap:8, padding:'10px 8px', alignItems:'center', marginBottom:2,
                background: isTop ? `${tramo.color}09` : 'transparent',
              }}>
                {/* Posición */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {idx < 3
                    ? <span style={{ fontSize:17 }}>{['🥇','🥈','🥉'][idx]}</span>
                    : <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.24)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{idx+1}</span>
                  }
                </div>

                {/* Cliente */}
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color: isTop ? '#f0f0fa' : '#b0b0c8', fontFamily:"'Plus Jakarta Sans',sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {nombre}
                  </p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,.22)', fontFamily:'monospace' }}>
                    {p.idPantalla}
                    {p.customerId && <span style={{ marginLeft:6, color:'rgba(124,58,237,.55)' }}>#{p.customerId}</span>}
                  </p>
                  <div className="ram-bar-track" style={{ marginTop:5, width:'80%' }}>
                    <div className="ram-bar-fill" style={{ width:`${barW}%`, background:pctGradient(pct) }}/>
                  </div>
                </div>

                {/* Plan */}
                <div style={{ textAlign:'center' }}>
                  {plan
                    ? <span className="ram-badge" style={{ background:`${plan.color}22`, color:plan.color, border:`1px solid ${plan.color}44` }}>{plan.label}</span>
                    : <span style={{ fontSize:10, color:'rgba(255,255,255,.2)' }}>—</span>
                  }
                </div>

                {/* Screens */}
                <div style={{ textAlign:'center' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.45)' }}>
                    {p.pantallas ?? 1}
                  </span>
                </div>

                {/* % */}
                <div style={{ textAlign:'center' }}>
                  <span style={{
                    fontSize:16, fontWeight:900, lineHeight:1,
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    background:pctGradient(pct),
                    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                  }}>
                    {fmt(pct)}
                  </span>
                </div>

                {/* Nivel */}
                <div style={{ textAlign:'center' }}>
                  <span className="ram-badge" style={{ background:`${tramo.color}18`, color:tramo.color, border:`1px solid ${tramo.color}33` }}>
                    <span style={{ fontSize:11 }}>{tramo.emoji}</span>{tramo.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {ranked.length > 8 && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'10px 16px', display:'flex', justifyContent:'center' }}>
            <button className="ram-toggle" onClick={() => setExpanded(v => !v)}>
              {expanded
                ? <><ChevronUp size={13}/> Mostrar menos</>
                : <><ChevronDown size={13}/> Ver {ranked.length - 8} más ({ranked.length} total)</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Nota al pie */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <Sparkles size={11} style={{ color:'rgba(124,58,237,.45)' }} />
        <p style={{ fontSize:10, color:'rgba(255,255,255,.2)' }}>
          El ranking usa el campo <strong style={{ color:'rgba(255,255,255,.32)' }}>% Ganancia</strong> del Planificador.
          Edita cada pantalla para actualizar su porcentaje. La distribución revela cómo se concentra el potencial de ganancia entre tramos.
        </p>
      </div>
    </div>
  )
}
