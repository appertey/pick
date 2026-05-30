import { useState, useMemo } from 'react'
import { STEEL_SECTIONS, CONCRETE_SECTIONS } from '../data/sections'
import { designSteelColumn, designRCColumn } from '../engine/column'
import type { SteelColumnResult, RCColumnResult } from '../engine/column'

type MatType = 'steel' | 'concrete'

function PMDiagramSVG({
  curve, appliedP, appliedM, maxP, maxM, title,
}: {
  curve: { P: number; M: number }[]
  appliedP: number; appliedM: number
  maxP: number; maxM: number; title: string
}) {
  const W = 320, H = 300
  const pad = { l: 50, r: 16, t: 24, b: 40 }
  const IW = W - pad.l - pad.r
  const IH = H - pad.t - pad.b

  const toX = (m: number) => pad.l + (m / Math.max(maxM, 0.001)) * IW
  const toY = (p: number) => pad.t + IH - (p / Math.max(maxP, 0.001)) * IH

  const pts = curve.map(pt => `${toX(pt.M)},${toY(pt.P)}`).join(' ')
  const filledPts = `${toX(0)},${toY(maxP)} ` + pts + ` ${toX(0)},${toY(0)}`
  const isInside = appliedP <= maxP && appliedM <= maxM && curve.length > 2

  const ax = toX(appliedM)
  const ay = toY(appliedP)

  return (
    <svg width={W} height={H}>
      {/* Fill */}
      <polygon points={filledPts} fill="#3b82f6" fillOpacity="0.08" />
      {/* Curve */}
      {curve.length > 1 && <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2.5" />}

      {/* Axes */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+IH} stroke="#9ca3af" strokeWidth="1.5" />
      <line x1={pad.l} y1={pad.t+IH} x2={pad.l+IW} y2={pad.t+IH} stroke="#9ca3af" strokeWidth="1.5" />

      {/* Axis labels */}
      <text x={pad.l - 6} y={pad.t + 4} fontSize="9" fill="#6b7280" textAnchor="end">{maxP.toFixed(0)}</text>
      <text x={pad.l - 6} y={pad.t + IH} fontSize="9" fill="#6b7280" textAnchor="end">0</text>
      <text x={pad.l + IW} y={pad.t + IH + 14} fontSize="9" fill="#6b7280">{maxM.toFixed(0)}</text>
      <text x={pad.l} y={pad.t + IH + 14} fontSize="9" fill="#6b7280">0</text>

      {/* Axis names */}
      <text x={pad.l - 30} y={pad.t + IH/2} fontSize="10" fill="#374151" fontWeight="700"
        transform={`rotate(-90, ${pad.l - 30}, ${pad.t + IH/2})`} textAnchor="middle">φPn (kN)</text>
      <text x={pad.l + IW/2} y={H - 4} fontSize="10" fill="#374151" fontWeight="700" textAnchor="middle">φMn (kN·m)</text>

      {/* Title */}
      <text x={pad.l + IW/2} y={pad.t - 8} fontSize="11" fill="#1e40af" fontWeight="700" textAnchor="middle">{title}</text>

      {/* Applied load point */}
      <line x1={pad.l} y1={ay} x2={ax} y2={ay} stroke="#dc2626" strokeWidth="1" strokeDasharray="3,2" />
      <line x1={ax} y1={pad.t+IH} x2={ax} y2={ay} stroke="#dc2626" strokeWidth="1" strokeDasharray="3,2" />
      <circle cx={ax} cy={ay} r="6" fill={isInside ? '#16a34a' : '#dc2626'} stroke="white" strokeWidth="2" />
      <text x={ax+9} y={ay-4} fontSize="9" fill={isInside ? '#16a34a' : '#dc2626'} fontWeight="600">
        ({appliedM.toFixed(0)}, {appliedP.toFixed(0)})
      </text>
    </svg>
  )
}

export default function ColumnDesigner() {
  const [mat, setMat] = useState<MatType>('steel')
  const [secId, setSecId] = useState('W14x48')
  const [Pu, setPu] = useState(500)
  const [Mux, setMux] = useState(120)
  const [L, setL] = useState(4)
  const [K, setK] = useState(1.0)

  const sections = mat === 'steel' ? STEEL_SECTIONS : CONCRETE_SECTIONS

  const steelResult = useMemo<SteelColumnResult | null>(() => {
    if (mat !== 'steel') return null
    return designSteelColumn(secId, Pu, Mux, 0, L, K)
  }, [mat, secId, Pu, Mux, L, K])

  const rcResult = useMemo<RCColumnResult | null>(() => {
    if (mat !== 'concrete') return null
    return designRCColumn(secId, Pu, Mux)
  }, [mat, secId, Pu, Mux])

  const status = mat === 'steel' ? steelResult?.status : rcResult?.status

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left panel */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-4 bg-violet-700 text-white">
          <div className="font-bold text-base">Column Designer</div>
          <div className="text-violet-200 text-xs mt-0.5">P-M Interaction · AISC H1 / ACI 318</div>
        </div>

        <div className="p-3 flex flex-col gap-4 text-sm">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold block mb-1">Material</label>
            <div className="flex gap-1">
              {(['steel', 'concrete'] as MatType[]).map(m => (
                <button key={m} onClick={() => { setMat(m); setSecId(m==='steel'?'W14x48':'C400x700') }}
                  className={`flex-1 py-1 rounded text-xs font-medium border ${mat===m?'bg-violet-600 text-white border-violet-600':'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  {m === 'steel' ? 'Steel' : 'Concrete'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold block mb-1">Section</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" value={secId} onChange={e => setSecId(e.target.value)}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.designation}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumField label="Pu (kN)" value={Pu} onChange={setPu} />
            <NumField label="Mux (kN·m)" value={Mux} onChange={setMux} />
          </div>

          {mat === 'steel' && (
            <div className="grid grid-cols-2 gap-2">
              <NumField label="L (m)" value={L} onChange={setL} step={0.5} />
              <NumField label="K factor" value={K} onChange={setK} step={0.05} />
            </div>
          )}

          {/* Status */}
          {status && (
            <div className={`rounded-lg p-3 text-center font-bold text-sm ${status === 'OK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {status === 'OK' ? '✓ SECTION OK' : '✕ OVER-STRESSED'}
            </div>
          )}

          {/* Steel detail */}
          {steelResult && (
            <div className="text-xs bg-gray-50 rounded border border-gray-200 p-2 flex flex-col gap-1">
              <Row label="φPn (compression)" val={`${steelResult.phiPn_compression.toFixed(0)} kN`} />
              <Row label="φPn (tension)" val={`${steelResult.phiPn_tension.toFixed(0)} kN`} />
              <Row label="φMnx" val={`${steelResult.phiMnx.toFixed(0)} kN·m`} />
              <Row label="KL/r" val={steelResult.lambda_c.toFixed(1)} />
              <Row label="H1 ratio" val={`${(steelResult.ratio_H1 * 100).toFixed(0)}%`} highlight={steelResult.ratio_H1 >= 1} />
            </div>
          )}

          {/* RC detail */}
          {rcResult && (
            <div className="text-xs bg-gray-50 rounded border border-gray-200 p-2 flex flex-col gap-1">
              <Row label="φPn (pure comp)" val={`${rcResult.phiPn0.toFixed(0)} kN`} />
              <Row label="φMn (pure bend)" val={`${rcResult.phiMn0.toFixed(0)} kN·m`} />
              <Row label="Balanced P" val={`${rcResult.Pbalanced.toFixed(0)} kN`} />
              <Row label="Balanced M" val={`${rcResult.Mbalanced.toFixed(0)} kN·m`} />
              <Row label="D/C ratio" val={`${(rcResult.ratio * 100).toFixed(0)}%`} highlight={rcResult.ratio >= 1} />
            </div>
          )}
        </div>
      </div>

      {/* Right: P-M diagram */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          {steelResult && (
            <PMDiagramSVG
              curve={steelResult.interaction}
              appliedP={Pu} appliedM={Mux}
              maxP={steelResult.phiPn_compression * 1.1}
              maxM={steelResult.phiMnx * 1.1}
              title={`AISC H1 Interaction — ${secId}`}
            />
          )}
          {rcResult && rcResult.interaction.length > 0 && (
            <PMDiagramSVG
              curve={rcResult.interaction}
              appliedP={Pu} appliedM={Mux}
              maxP={rcResult.phiPn0 * 1.1}
              maxM={rcResult.phiMn0 * 1.5}
              title={`ACI 318 P-M Interaction — ${secId}`}
            />
          )}
          {!steelResult && !rcResult && (
            <div className="text-gray-400 text-sm">Select material and section to see diagram</div>
          )}
          <div className="mt-3 text-xs text-gray-400 text-center">
            <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-1 align-middle" />Capacity curve &nbsp;
            <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-1 align-middle" />Applied (inside) &nbsp;
            <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-1 align-middle" />Applied (outside)
          </div>
        </div>
      </div>
    </div>
  )
}

function NumField({ label, value, onChange, step = 10 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
      <input type="number" step={step} className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
        value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  )
}

function Row({ label, val, highlight = false }: { label: string; val: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold font-mono ${highlight ? 'text-red-600' : 'text-gray-700'}`}>{val}</span>
    </div>
  )
}
