/**
 * ChangePasswordPage — Security Landing
 * Skills: huashu-design · ui-ux-pro-max · taste-skill
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  KeyRound, Eye, EyeOff, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, Lock,
} from 'lucide-react'
import api from '../config/api'
import { evaluatePasswordStrength } from '../utils/passwordStrength'

/* ── Huashu CSS tokens + animaciones ────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .sec-page {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    min-height: 100vh;
    background: #08080f;
    display: flex; align-items: center; justify-content: center;
    padding: 24px 16px;
    position: relative; overflow: hidden;
  }

  .sec-orb-a {
    position:absolute; top:-80px; left:-80px;
    width:420px; height:420px; border-radius:50%;
    background: radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%);
    pointer-events:none;
    animation: sec-orb-a 12s ease-in-out infinite;
  }
  .sec-orb-b {
    position:absolute; bottom:-120px; right:-60px;
    width:520px; height:520px; border-radius:50%;
    background: radial-gradient(circle, rgba(6,182,212,0.13), transparent 70%);
    pointer-events:none;
    animation: sec-orb-b 16s ease-in-out infinite;
  }
  .sec-grid {
    position:absolute; inset:0; pointer-events:none; opacity:.025;
    background-image: linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),
                      linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px);
    background-size: 40px 40px;
  }

  .sec-card {
    position:relative; z-index:10;
    width:100%; max-width:460px;
    background: rgba(18,18,30,0.85);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 28px;
    padding: 40px 36px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 40px rgba(124,58,237,0.22);
    animation: sec-fade-up .55s cubic-bezier(.22,1,.36,1) both;
  }
  .sec-card::before {
    content:''; position:absolute; top:0; left:0; right:0;
    height:3px; border-radius:28px 28px 0 0;
    background: linear-gradient(135deg,#7c3aed,#06b6d4);
  }

  .sec-icon {
    width:72px; height:72px; border-radius:22px; margin:0 auto 20px;
    background: linear-gradient(135deg,#7c3aed,#06b6d4);
    display:flex; align-items:center; justify-content:center;
    box-shadow: 0 0 40px rgba(124,58,237,0.4);
    animation: sec-glow 3s ease-in-out infinite;
  }
  .sec-title {
    font-size:1.6rem; font-weight:800; letter-spacing:-.025em;
    color:#f0f0fa; text-align:center; margin-bottom:4px;
  }
  .sec-sub { font-size:.875rem; color:#8888aa; text-align:center; margin-bottom:28px; }

  .sec-label {
    display:block; font-size:.72rem; font-weight:700;
    letter-spacing:.09em; text-transform:uppercase;
    color:#8888aa; margin-bottom:8px;
  }
  .sec-input-wrap { position:relative; margin-bottom:4px; }
  .sec-input {
    width:100%; padding:13px 48px 13px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; color:#f0f0fa;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size:.925rem; outline:none; box-sizing:border-box;
    transition: border-color .2s, box-shadow .2s, background .2s;
  }
  .sec-input:focus {
    border-color: #7c3aed;
    background: rgba(124,58,237,0.07);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.18);
  }
  .sec-input.ok  { border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.15); }
  .sec-input.err { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.15); }
  .sec-input::placeholder { color:#44445a; }

  .sec-eye {
    position:absolute; right:14px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; padding:4px;
    color:#8888aa; display:flex; align-items:center;
    transition: color .18s;
  }
  .sec-eye:hover { color:#f0f0fa; }

  /* Strength bar */
  .sec-bar-wrap { display:flex; gap:4px; height:5px; border-radius:99px; overflow:hidden; margin-top:10px; }
  .sec-bar-seg  { flex:1; border-radius:99px; transition: background .35s ease; }

  /* Requirements */
  .sec-reqs { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:12px; }
  .sec-req {
    display:flex; align-items:center; gap:7px;
    font-size:.76rem; font-weight:500;
    padding:7px 10px; border-radius:10px;
    transition: all .2s;
  }
  .sec-req.ok  { color:#10b981; background:rgba(16,185,129,.1); }
  .sec-req.nok { color:#44445a; background:rgba(255,255,255,.03); }

  /* Match badge */
  .sec-match {
    font-size:.74rem; font-weight:600; margin-top:6px;
    display:flex; align-items:center; gap:5px;
    animation: sec-check-in .2s ease both;
  }
  .sec-match.ok  { color:#10b981; }
  .sec-match.err { color:#ef4444; }

  /* Expiry banner */
  .sec-expiry {
    border-radius:14px; padding:12px 16px;
    display:flex; align-items:flex-start; gap:12px;
    font-size:.82rem; font-weight:500; margin-bottom:20px;
    animation: sec-fade-in .3s ease both;
  }
  .sec-expiry.expired { background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.3); color:#f87171; }
  .sec-expiry.warning { background:rgba(245,158,11,.1);  border:1px solid rgba(245,158,11,.3); color:#fbbf24; }

  /* Error box */
  .sec-err {
    background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3);
    color:#f87171; border-radius:12px; padding:11px 14px;
    font-size:.82rem; font-weight:500; display:flex; gap:8px;
    align-items:center; margin-bottom:16px;
  }

  /* CTA */
  .sec-btn {
    width:100%; padding:14px;
    background: linear-gradient(135deg,#7c3aed,#06b6d4);
    border:none; border-radius:14px; color:#fff;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size:.95rem; font-weight:700; cursor:pointer;
    display:flex; align-items:center; justify-content:center; gap:8px;
    transition: transform .2s, box-shadow .2s, opacity .2s;
    box-shadow: 0 6px 24px rgba(124,58,237,.45);
  }
  .sec-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 32px rgba(124,58,237,.6); }
  .sec-btn:active:not(:disabled){ transform:translateY(0); }
  .sec-btn:disabled { opacity:.5; cursor:not-allowed; }
  .sec-spinner {
    width:18px; height:18px; border:2px solid rgba(255,255,255,.3);
    border-top-color:#fff; border-radius:50%;
    animation: sec-spin .7s linear infinite;
  }

  /* Success */
  .sec-success {
    display:inline-flex; padding:14px 28px; border-radius:14px;
    background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3);
    color:#34d399; font-weight:600; font-size:.9rem; gap:8px; align-items:center;
  }

  /* Footer */
  .sec-footer {
    margin-top:28px; padding-top:20px;
    border-top:1px solid rgba(255,255,255,0.07);
    display:flex; justify-content:center; gap:6px; align-items:center;
    font-size:.7rem; color:#44445a; font-weight:500;
  }

  /* Stagger */
  .s1 { animation: sec-fade-up .45s .05s both cubic-bezier(.22,1,.36,1) }
  .s2 { animation: sec-fade-up .45s .11s both cubic-bezier(.22,1,.36,1) }
  .s3 { animation: sec-fade-up .45s .17s both cubic-bezier(.22,1,.36,1) }
  .s4 { animation: sec-fade-up .45s .23s both cubic-bezier(.22,1,.36,1) }
  .s5 { animation: sec-fade-up .45s .29s both cubic-bezier(.22,1,.36,1) }

  @keyframes sec-fade-up   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sec-fade-in   { from{opacity:0} to{opacity:1} }
  @keyframes sec-orb-a     { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(40px,-30px)scale(1.1)} }
  @keyframes sec-orb-b     { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(-30px,20px)scale(1.08)} }
  @keyframes sec-glow      { 0%,100%{box-shadow:0 0 24px rgba(124,58,237,.35)} 50%{box-shadow:0 0 52px rgba(124,58,237,.7)} }
  @keyframes sec-spin      { to{transform:rotate(360deg)} }
  @keyframes sec-check-in  { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }

  @media(max-width:480px){ .sec-card{ padding:28px 20px; border-radius:20px; } }
  @media(prefers-reduced-motion:reduce){
    .sec-card,.s1,.s2,.s3,.s4,.s5,.sec-orb-a,.sec-orb-b,.sec-icon{
      animation:none !important; transition:none !important;
    }
  }
`

/* ── Componente principal ───────────────────────────────────────────────── */
export default function ChangePasswordPage() {
  const [newPassword, setNewPassword]     = useState('')
  const [confirm, setConfirm]             = useState('')
  const [showNew, setShowNew]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(null)
  const [success, setSuccess]             = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      if (data.role === 'admin' && data.passwordLastChanged) {
        const days = (new Date() - new Date(data.passwordLastChanged)) / 86400000
        setDaysRemaining(Math.max(0, 90 - Math.floor(days)))
      }
    }).catch(() => {})
  }, [])

  const { score, label, color, reqs } = evaluatePasswordStrength(newPassword)
  const matchOk  = confirm.length > 0 && newPassword === confirm
  const matchErr = confirm.length > 0 && newPassword !== confirm

  const submit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) return setError('Las contraseñas no coinciden')
    if (newPassword.length < 8)  return setError('Mínimo 8 caracteres')
    setError(''); setLoading(true)
    try {
      await api.post('/auth/change-password', { newPassword })
      setSuccess(true)
      setTimeout(() => {
        const role = localStorage.getItem('role')
        navigate(role === 'admin' ? '/admin' : '/dashboard')
      }, 1600)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="sec-page">
        <div className="sec-orb-a" />
        <div className="sec-orb-b" />
        <div className="sec-grid" />

        <div className="sec-card">

          {/* ── Hero ── */}
          <div className="s1" style={{ textAlign:'center' }}>
            <div className="sec-icon">
              {success ? <ShieldCheck size={34} color="#fff" /> : <KeyRound size={34} color="#fff" />}
            </div>
            <h1 className="sec-title">{success ? '¡Contraseña actualizada!' : 'Seguridad de cuenta'}</h1>
            <p className="sec-sub">
              {success
                ? 'Tu cuenta está protegida. Redirigiendo…'
                : 'Establece una contraseña fuerte para proteger tu acceso.'}
            </p>
          </div>

          {/* ── Banner expiración ── */}
          {daysRemaining !== null && daysRemaining <= 10 && !success && (
            <div className={`sec-expiry s2 ${daysRemaining === 0 ? 'expired' : 'warning'}`}>
              <AlertTriangle size={17} style={{ flexShrink:0, marginTop:1 }} />
              <span>
                {daysRemaining === 0
                  ? 'Tu contraseña ha caducado. Cámbiala ahora para no perder acceso.'
                  : `Caduca en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}. Actualízala antes de que expire.`}
              </span>
            </div>
          )}

          {/* ── Formulario ── */}
          {!success && (
            <form onSubmit={submit}>

              {/* Nueva contraseña */}
              <div className="s2" style={{ marginBottom:20 }}>
                <label className="sec-label">
                  <Lock size={10} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }} />
                  Nueva contraseña
                </label>
                <div className="sec-input-wrap">
                  <input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="sec-input"
                    placeholder="Mínimo 8 caracteres…"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="sec-eye" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                    {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Barra de fortaleza */}
                {newPassword && (
                  <>
                    <div className="sec-bar-wrap">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="sec-bar-seg"
                          style={{ background: i <= score ? color : 'rgba(255,255,255,0.07)' }} />
                      ))}
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:5 }}>
                      <span style={{ fontSize:'.7rem', fontWeight:700, color, transition:'color .35s' }}>{label}</span>
                    </div>
                    {/* Checklist */}
                    <div className="sec-reqs">
                      {reqs.map((r, i) => (
                        <div key={i} className={`sec-req ${r.ok ? 'ok' : 'nok'}`}>
                          {r.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {r.label}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="s3" style={{ marginBottom:24 }}>
                <label className="sec-label">
                  <ShieldCheck size={10} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }} />
                  Confirmar contraseña
                </label>
                <div className="sec-input-wrap">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className={`sec-input ${matchOk ? 'ok' : matchErr ? 'err' : ''}`}
                    placeholder="Repite tu nueva contraseña…"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="sec-eye" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {matchOk  && <div className="sec-match ok"><CheckCircle2 size={13} />Las contraseñas coinciden</div>}
                {matchErr && <div className="sec-match err"><XCircle size={13} />No coinciden</div>}
              </div>

              {/* Error */}
              {error && (
                <div className="sec-err s4">
                  <ShieldAlert size={15} style={{ flexShrink:0 }} />
                  {error}
                </div>
              )}

              {/* CTA */}
              <div className="s5">
                <button type="submit" className="sec-btn" disabled={loading || score < 1}>
                  {loading
                    ? <><div className="sec-spinner" />Guardando…</>
                    : <><KeyRound size={16} />Cambiar contraseña<ArrowRight size={15} /></>}
                </button>
              </div>
            </form>
          )}

          {/* ── Estado éxito ── */}
          {success && (
            <div style={{ textAlign:'center', marginTop:8 }} className="s1">
              <div className="sec-success">
                <CheckCircle2 size={18} /> Contraseña actualizada con éxito
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="sec-footer">
            <ShieldCheck size={12} style={{ color:'#06b6d4' }} />
            Cifrado seguro · Política 90 días · Sesión protegida
          </div>
        </div>
      </div>
    </>
  )
}
