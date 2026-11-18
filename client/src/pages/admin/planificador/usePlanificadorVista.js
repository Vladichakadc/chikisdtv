// Vista derivada del Planificador: filas filtradas/ordenadas, indicadores y
// listas de las tarjetas inteligentes. Lógica pura sobre la respuesta de la
// API (sin efectos), separada de PlanificadorPage para poder razonarla aparte.
import { useMemo } from 'react'
import { calcDias, getRowVariant, getPlanSortVal } from './rowHelpers'

export function usePlanificadorVista(data, { search, filterStatus, sortConfig }) {
  const { rows, stats } = useMemo(() => {
    if (!data) return { rows: [], stats: {} }
    const { pantallas, diasAlerta } = data

    const cuentas       = new Set(pantallas.map(p => p.cuentaId)).size
    const variantes     = pantallas.map(p => getRowVariant(p, diasAlerta))
    const activas       = pantallas.reduce((sum, p) => sum + (Number(p.pantallas) || 0), 0)
    const proximaVencer = variantes.filter(v => v === 'alerta').length
    const libres        = variantes.filter(v => v === 'libre').length

    // ── Indicadores financieros y de negocio ──────────────────────────────
    const asignadas     = pantallas.length - libres
    const vencidas      = variantes.filter(v => v === 'vencido').length
    const deudores        = pantallas.filter(p => p.debe).length
    const montoCartera    = pantallas.reduce((s, p) => s + (p.debe ? (Number(p.montoDebe) || 0) : 0), 0)
    const montoCarteraUSD = pantallas.reduce((s, p) => s + (p.debe ? (Number(p.montoDebeUSD) || 0) : 0), 0)
    const cortesias     = variantes.filter(v => v === 'cortesia').length
    
    const ocupacion     = pantallas.length ? Math.round((asignadas / pantallas.length) * 100) : 0

    let filtered = pantallas
    const sq = search.toLowerCase()
    if (sq) {
      filtered = filtered.filter(p => {
        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase()
        const apellidoNombre = `${p.apellido || ''} ${p.nombre || ''}`.toLowerCase()
        return (
          (p.cuentaId || '').toLowerCase().includes(sq) ||
          (p.cuenta || '').toLowerCase().includes(sq) ||
          (p.nombre || '').toLowerCase().includes(sq) ||
          (p.apellido || '').toLowerCase().includes(sq) ||
          nombreCompleto.includes(sq) ||
          apellidoNombre.includes(sq) ||
          (p.nickname || '').toLowerCase().includes(sq) ||
          (p.customerId || '').toLowerCase().includes(sq)
        )
      })
    }
    if (filterStatus !== 'ALL') {
      const target = filterStatus.toLowerCase()
      filtered = filtered.filter(p => getRowVariant(p, diasAlerta) === target)
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortConfig.key) {
        const aVal = getPlanSortVal(a, sortConfig.key)
        const bVal = getPlanSortVal(b, sortConfig.key)
        if (aVal !== bVal) {
          if (aVal == null) return 1
          if (bVal == null) return -1
          const cmp = typeof aVal === 'string'
            ? aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
            : Number(aVal) - Number(bVal)
          if (cmp !== 0) return sortConfig.dir === 'asc' ? cmp : -cmp
        }
      }
      if (a.cuentaId !== b.cuentaId) return a.cuentaId < b.cuentaId ? -1 : 1
      return a.idPantalla < b.idPantalla ? -1 : 1
    })

    const rows = filtered.map((p, i) => ({
      ...p,
      isGroupStart: i === 0 || filtered[i - 1].cuentaId !== p.cuentaId,
    }))

    return {
      rows,
      stats: {
        cuentas, activas, proximaVencer, libres, diasAlerta, total: pantallas.length,
        vencidas, deudores, cortesias, montoCartera, montoCarteraUSD, ocupacion, asignadas,
      },
    }
  }, [data, search, filterStatus, sortConfig])

  // ── Listas de detalle para las tarjetas inteligentes ──────────────────────
  // Independientes de los filtros de la tabla: cada tarjeta siempre muestra el panorama
  // completo de su categoría de negocio (riesgo, cobranza, cortesías, inventario, cartera).
  const categoryLists = useMemo(() => {
    if (!data) return {}
    const { pantallas, diasAlerta } = data
    const enriched = pantallas.map(p => ({
      ...p,
      _variant: getRowVariant(p, diasAlerta),
      _dias: calcDias(p.duracionReal || p.finalizacion) ?? p.diasVencimientoReal ?? p.diasVencimiento ?? null,
    }))
    const byDiasAsc = (a, b) => (a._dias ?? Infinity) - (b._dias ?? Infinity)
    const byNombre  = (a, b) => [a.nombre, a.apellido].join(' ').localeCompare([b.nombre, b.apellido].join(' '), 'es', { sensitivity: 'base' })
    return {
      alerta:   enriched.filter(p => p._variant === 'alerta').sort(byDiasAsc),
      vencido:  enriched.filter(p => p._variant === 'vencido').sort(byDiasAsc),
      libre:    enriched.filter(p => p._variant === 'libre').sort(byNombre),
      debe:     enriched.filter(p => p.debe).sort((a, b) => (Number(b.montoDebe) || 0) - (Number(a.montoDebe) || 0)),
      cortesia: enriched.filter(p => p._variant === 'cortesia').sort(byDiasAsc),
    }
  }, [data])

  const cpVencidas    = useMemo(() => (data?.cuentasPadreStatus || []).filter(cp => cp.variante === 'vencida'), [data])
  const cpAlerta      = useMemo(() => (data?.cuentasPadreStatus || []).filter(cp => cp.variante === 'alerta'),  [data])

  return { rows, stats, categoryLists, cpVencidas, cpAlerta }
}
