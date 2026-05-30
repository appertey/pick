import { useState, useMemo } from 'react'
import { Play, Plus, Trash2 } from 'lucide-react'
import type { BeamConfig, BeamLoad, BeamResult, SupportKind } from '../engine/beam'
import { analyzeBeam } from '../engine/beam'
import { STEEL_SECTIONS, CONCRETE_SECTIONS } from '../data/sections'
import { LRFD_COMBINATIONS } from '../engine/loads'

// ── default config ───────────────────────────────────────────────────────────
const DEF_CONFIG: BeamConfig = {
  length: 8,
  material: 'steel',
  sectionId: 'W18x35',
  supports: [
    { x: 0, type: 'pin' },
    { x: 8, type: 'roller' as SupportKind },
  ],
  loads: [
    { id: 'L1', type: 'udl', x1: 0, x2: 8, w: 20, loadCase: 'dead' },
    { id: 'L2', type: 'udl', x1: 0, x2: 8, w: 15, loadCase: 'live' },
  ],
}

// ── diagram helpers ──────────────────────────────────────────────────────────
function DiagramSVG({
  data, label, color, unit, fillBelowZero = false,
  width = 560, height = 110,
}: {
  data: { x: number[]; y: number[] }
  label: string; color: string; unit: string
  fillBelowZero?: boolean
  width?: number; height?: number
}) {
  const pad = { l: 50, r: 12, t: 14, b: 24 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b
  const { x, y } = data

  if (x.length === 0) return null
  const maxX = x[x.length - 1]
  const maxY = Math.max(...y.map(Math.abs), 0.001)
  const minY = Math.min(...y)
  const hasNeg = minY < -0.001

  const ySpan = hasNeg ? maxY * 2 : maxY
  const yMid = hasNeg ? H / 2 : H

  const toSvgX = (v: number) => pad.l + (v / maxX) * W
  const toSvgY = (v: number) => {
    const frac = v / ySpan
    return pad.t + yMid - frac * yMid * (hasNeg ? 2 : 1)
  }

  const pts = x.map((xi, i) => `${toSvgX(xi)},${toSvgY(y[i])}`).join(' ')
  const baseY = toSvgY(0)

  // Fill polygon
  const polyPos = `${toSvgX(x[0])},${baseY} ` + x.map((xi, i) => y[i] > 0 ? `${toSvgX(xi)},${toSvgY(y[i])}` : null).filter(Boolean).join(' ') + ` ${toSvgX(x[x.length - 1])},${baseY}`
  const polyNeg = `${toSvgX(x[0])},${baseY} ` + x.map((xi, i) => y[i] < 0 ? `${toSvgX(xi)},${toSvgY(y[i])}` : null).filter(Boolean).join(' ') + ` ${toSvgX(x[x.length - 1])},${baseY}`

  const maxVal = y.reduce((a, v) => Math.abs(v) > Math.abs(a) ? v : a, 0)
  const maxIdx = y.indexOf(maxVal)

  return (
    <svg width={width} height={height} className="w-full">
      <text x={pad.l - 2} y={pad.t + 2} fontSize="9" fill="#6b7280" textAnchor="end">{(maxY).toFixed(1)}</text>
      {hasNeg && <text x={pad.l - 2} y={pad.t + H - 4} fontSize="9" fill="#6b7280" textAnchor="end">{(-maxY).toFixed(1)}</text>}

      {/* Zero axis */}
      <line x1={pad.l} y1={baseY} x2={pad.l + W} y2={baseY} stroke="#d1d5db" strokeWidth="1" />

      {/* Positive fill */}
      <polygon points={polyPos} fill={color} fillOpacity="0.15" />
      {/* Negative fill */}
      {fillBelowZero && <polygon points={polyNeg} fill="#ef4444" fillOpacity="0.15" />}

      {/* Main line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />

      {/* Max annotation */}
      <circle cx={toSvgX(x[maxIdx])} cy={toSvgY(y[maxIdx])} r="3" fill={color} />
      <text x={toSvgX(x[maxIdx])} y={toSvgY(y[maxIdx]) - 5} fontSize="9" fill={color} textAnchor="middle" fontWeight="600">
        {maxVal.toFixed(1)} {unit}
      </text>

      {/* X-axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <g key={f}>
          <line x1={pad.l + f*W} y1={pad.t+H} x2={pad.l + f*W} y2={pad.t+H+4} stroke="#9ca3af" strokeWidth="1" />
          <text x={pad.l + f*W} y={pad.t+H+13} fontSize="9" fill="#6b7280" textAnchor="middle">{(f*maxX).toFixed(1)}</text>
        </g>
      ))}

      {/* Y axis */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + H} stroke="#9ca3af" strokeWidth="1" />

      {/* Label */}
      <text x={6} y={pad.t + H/2} fontSize="10" fill="#374151" fontWeight="700"
        transform={`rotate(-90, 6, ${pad.t + H/2})`} textAnchor="middle">{label} ({unit})</text>

      {/* Units label right */}
      <text x={pad.l + W} y={pad.t + H + 13} fontSize="9" fill="#9ca3af">x (m)</text>
    </svg>
  )
}

function BeamElevationSVG({ config, result, width = 560, height = 90 }: {
  config: BeamConfig; result: BeamResult | null; width?: number; height?: number
}) {
  const pad = { l: 50, r: 12 }
  const W = width - pad.l - pad.r
  const beamY = 45
  const L = config.length

  const toX = (x: number) => pad.l + (x / L) * W

  return (
    <svg width={width} height={height} className="w-full">
      {/* Beam */}
      <rect x={pad.l} y={beamY - 6} width={W} height={12} fill="#3b82f6" rx="2" />

      {/* Distributed loads */}
      {config.loads.filter(l => l.type === 'udl').map(ld => {
        const x1 = toX(ld.x1)
        const x2 = toX(ld.x2 ?? L)
        const color = ld.loadCase === 'dead' ? '#6366f1' : ld.loadCase === 'live' ? '#f59e0b' : '#10b981'
        const arrows = []
        const nArrows = Math.max(2, Math.floor((x2 - x1) / 25))
        for (let i = 0; i <= nArrows; i++) {
          const ax = x1 + (i / nArrows) * (x2 - x1)
          arrows.push(<line key={i} x1={ax} y1={beamY - 28} x2={ax} y2={beamY - 8} stroke={color} strokeWidth="1.5" markerEnd="url(#arr)" />)
        }
        return <g key={ld.id}>
          <line x1={x1} y1={beamY - 28} x2={x2} y2={beamY - 28} stroke={color} strokeWidth="1.5" />
          {arrows}
          <text x={(x1+x2)/2} y={beamY - 32} fill={color} fontSize="9" textAnchor="middle">{ld.w} kN/m ({ld.loadCase})</text>
        </g>
      })}

      {/* Point loads */}
      {config.loads.filter(l => l.type === 'point').map(ld => {
        const px = toX(ld.x1)
        const color = '#f97316'
        return <g key={ld.id}>
          <line x1={px} y1={beamY - 32} x2={px} y2={beamY - 8} stroke={color} strokeWidth="2.5" markerEnd="url(#arr)" />
          <text x={px} y={beamY - 36} fill={color} fontSize="9" textAnchor="middle">{ld.w}kN</text>
        </g>
      })}

      {/* Supports */}
      {config.supports.map((sup, i) => {
        const sx = toX(Math.min(sup.x, L))
        if (sup.type === 'fixed') return (
          <g key={i}>
            <rect x={sx - 6} y={beamY + 6} width="12" height="8" fill="#374151" />
            {[-4, 0, 4].map(o => <line key={o} x1={sx+o} y1={beamY+14} x2={sx+o-4} y2={beamY+20} stroke="#374151" strokeWidth="1.5" />)}
          </g>
        )
        if (sup.type === 'pin' || sup.type === 'roller') return (
          <g key={i}>
            <polygon points={`${sx},${beamY+6} ${sx-9},${beamY+18} ${sx+9},${beamY+18}`} fill="#374151" />
            {sup.type === 'roller' && <>
              <line x1={sx-11} y1={beamY+19} x2={sx+11} y2={beamY+19} stroke="#374151" strokeWidth="1.5" />
              <circle cx={sx-5} cy={beamY+22} r="2" fill="#374151" />
              <circle cx={sx+5} cy={beamY+22} r="2" fill="#374151" />
            </>}
            {sup.type === 'pin' && [[-6,0],[0,-4],[6,0]].map(([ox,oy], k) => <line key={k} x1={sx+ox} y1={beamY+19+oy} x2={sx+ox-4} y2={beamY+24} stroke="#374151" strokeWidth="1.5" />)}
          </g>
        )
        return null
      })}

      {/* Reactions */}
      {result && result.reactions.map((rxn, i) => {
        const rx = toX(Math.min(rxn.x, L))
        if (Math.abs(rxn.Ry) < 0.01) return null
        const dir = rxn.Ry > 0 ? 1 : -1
        return <g key={i}>
          <line x1={rx} y1={beamY + 30 * dir + 6} x2={rx} y2={beamY + 6 + 3*dir} stroke="#dc2626" strokeWidth="2" markerEnd="url(#arrRed)" />
          <text x={rx+6} y={beamY + 36*dir + 6} fontSize="9" fill="#dc2626" fontWeight="600">{rxn.Ry.toFixed(1)}kN</text>
        </g>
      })}

      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#6b7280" />
        </marker>
        <marker id="arrRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
        </marker>
      </defs>

      {/* Span label */}
      <text x={pad.l + W/2} y={height - 2} fontSize="9" fill="#6b7280" textAnchor="middle">L = {L.toFixed(1)} m</text>
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
let loadIdCounter = 10

export default function BeamDesigner() {
  const [cfg, setCfg] = useState<BeamConfig>(DEF_CONFIG)
  const [combo, setCombo] = useState('1.2D + 1.6L')
  const [result, setResult] = useState<BeamResult | null>(null)

  const sections = cfg.material === 'steel' ? STEEL_SECTIONS : CONCRETE_SECTIONS

  const factors = useMemo(() => {
    const c = LRFD_COMBINATIONS.find(c => c.name === combo)
    return c ? c.factors : { dead: 1.2, live: 1.6, wind: 0, seismic: 0 }
  }, [combo])

  function runAnalysis() {
    const r = analyzeBeam({ ...cfg, factors: factors as Record<string, number> })
    setResult(r)
  }

  function updateLoad(id: string, changes: Partial<BeamLoad>) {
    setCfg(c => ({ ...c, loads: c.loads.map(l => l.id === id ? { ...l, ...changes } : l) }))
    setResult(null)
  }

  function addLoad() {
    const id = `L${++loadIdCounter}`
    setCfg(c => ({ ...c, loads: [...c.loads, { id, type: 'udl', x1: 0, x2: c.length, w: 10, loadCase: 'live' }] }))
    setResult(null)
  }

  function removeLoad(id: string) {
    setCfg(c => ({ ...c, loads: c.loads.filter(l => l.id !== id) }))
    setResult(null)
  }

  function setSupportType(idx: number, type: SupportKind) {
    setCfg(c => { const s = [...c.supports]; s[idx] = { ...s[idx], type }; return { ...c, supports: s } })
    setResult(null)
  }

  const util = result?.utilization

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left config panel */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-4 bg-emerald-700 text-white">
          <div className="font-bold text-base">Beam Design Calculator</div>
          <div className="text-emerald-200 text-xs mt-0.5">Euler-Bernoulli FE · AISC / ACI checks</div>
        </div>

        <div className="p-3 flex flex-col gap-4 text-sm">
          {/* Geometry */}
          <Section title="Geometry">
            <Field label="Span L (m)">
              <input type="number" step="0.5" min="0.5" className="input"
                value={cfg.length}
                onChange={e => { const L = parseFloat(e.target.value) || 1; setCfg(c => ({ ...c, length: L, supports: c.supports.map(s => ({ ...s, x: s.x > 0 ? L : 0 })) })); setResult(null) }}
              />
            </Field>
          </Section>

          {/* Supports */}
          <Section title="Supports">
            {cfg.supports.map((sup, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-8">{sup.x.toFixed(0)}m:</span>
                <select className="input flex-1" value={sup.type} onChange={e => setSupportType(i, e.target.value as SupportKind)}>
                  <option value="pin">Pin</option>
                  <option value="roller">Roller</option>
                  <option value="fixed">Fixed</option>
                  <option value="free">Free</option>
                </select>
              </div>
            ))}
          </Section>

          {/* Material & section */}
          <Section title="Section">
            <Field label="Material">
              <select className="input" value={cfg.material}
                onChange={e => { const mat = e.target.value as 'steel'|'concrete'; setCfg(c => ({ ...c, material: mat, sectionId: mat==='steel'?'W18x35':'C300x500' })); setResult(null) }}>
                <option value="steel">Steel</option>
                <option value="concrete">Concrete (RC)</option>
              </select>
            </Field>
            <Field label="Section">
              <select className="input" value={cfg.sectionId}
                onChange={e => { setCfg(c => ({ ...c, sectionId: e.target.value })); setResult(null) }}>
                {sections.map(s => <option key={s.id} value={s.id}>{s.designation}</option>)}
              </select>
            </Field>
          </Section>

          {/* Loads */}
          <Section title="Loads">
            <div className="flex flex-col gap-2">
              {cfg.loads.map(ld => (
                <div key={ld.id} className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <select className="input flex-1 text-xs" value={ld.type}
                      onChange={e => updateLoad(ld.id, { type: e.target.value as BeamLoad['type'] })}>
                      <option value="udl">UDL (kN/m)</option>
                      <option value="point">Point (kN)</option>
                      <option value="moment">Moment (kN·m)</option>
                    </select>
                    <select className="input w-16 text-xs" value={ld.loadCase}
                      onChange={e => updateLoad(ld.id, { loadCase: e.target.value })}>
                      <option value="dead">D</option>
                      <option value="live">L</option>
                      <option value="wind">W</option>
                      <option value="seismic">E</option>
                    </select>
                    <button onClick={() => removeLoad(ld.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <div className="text-xs text-gray-500">x1 (m)</div>
                      <input type="number" step="0.5" className="input text-xs"
                        value={ld.x1} onChange={e => updateLoad(ld.id, { x1: parseFloat(e.target.value)||0 })} />
                    </div>
                    {ld.type === 'udl' && (
                      <div>
                        <div className="text-xs text-gray-500">x2 (m)</div>
                        <input type="number" step="0.5" className="input text-xs"
                          value={ld.x2 ?? cfg.length} onChange={e => updateLoad(ld.id, { x2: parseFloat(e.target.value)||0 })} />
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-500">w (kN{ld.type==='udl'?'/m':''})</div>
                      <input type="number" step="1" className="input text-xs"
                        value={ld.w} onChange={e => updateLoad(ld.id, { w: parseFloat(e.target.value)||0 })} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addLoad} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800">
                <Plus size={13} /> Add Load
              </button>
            </div>
          </Section>

          {/* Load combination */}
          <Section title="Load Combination">
            <select className="input" value={combo} onChange={e => { setCombo(e.target.value); setResult(null) }}>
              {LRFD_COMBINATIONS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </Section>

          <button onClick={runAnalysis}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
            <Play size={14} /> Run Analysis
          </button>

          {/* Utilization */}
          {util && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="font-semibold text-gray-700 text-xs mb-2">Design Checks — {combo}</div>
              {([['Moment', util.moment, 'φMn'], ['Shear', util.shear, 'φVn'], ['Deflection', util.deflection, 'L/240']] as const).map(([name, v, cap]) => (
                <div key={name} className="mb-1.5">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>{name} (vs {cap})</span>
                    <span className={`font-semibold ${v >= 1 ? 'text-red-600' : v >= 0.75 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {(v*100).toFixed(0)}% {v >= 1 ? '✕ NG' : '✓ OK'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${v>=1?'bg-red-500':v>=0.75?'bg-orange-500':'bg-emerald-500'}`}
                      style={{ width: `${Math.min(v*100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right diagrams */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {/* Beam elevation */}
          <DiagramCard title="Beam Elevation & Loading" subtitle={`${cfg.length}m span · ${cfg.sectionId}`}>
            <BeamElevationSVG config={cfg} result={result} />
          </DiagramCard>

          {result ? <>
            <DiagramCard title="Bending Moment Diagram (BMD)"
              subtitle={`Max: ${result.maxM.toFixed(1)} kN·m at x=${result.xMaxM.toFixed(2)}m`}>
              <DiagramSVG data={{ x: result.x, y: result.M }} label="M" color="#2563eb" unit="kN·m" fillBelowZero />
            </DiagramCard>

            <DiagramCard title="Shear Force Diagram (SFD)"
              subtitle={`Max: ${Math.max(result.maxV, Math.abs(result.minV)).toFixed(1)} kN`}>
              <DiagramSVG data={{ x: result.x, y: result.V }} label="V" color="#7c3aed" unit="kN" fillBelowZero />
            </DiagramCard>

            <DiagramCard title="Deflection Diagram"
              subtitle={`Max: ${(result.maxDelta*1000).toFixed(2)}mm at x=${result.xMaxDelta.toFixed(2)}m · EI = ${result.EI.toFixed(0)} kN·m²`}>
              <DiagramSVG data={{ x: result.x, y: result.delta.map(d => d * 1000) }} label="δ" color="#059669" unit="mm" />
            </DiagramCard>

            {/* Reaction table */}
            <DiagramCard title="Support Reactions">
              <div className="overflow-hidden rounded border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-gray-500">Support</th>
                      <th className="px-3 py-1.5 text-right text-gray-500">x (m)</th>
                      <th className="px-3 py-1.5 text-right text-gray-500">Ry (kN)</th>
                      <th className="px-3 py-1.5 text-right text-gray-500">Mz (kN·m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.reactions.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium text-blue-700">{cfg.supports[i]?.type ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{r.x.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{r.Ry.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{r.Mz.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DiagramCard>
          </> : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Configure beam and click <strong className="mx-1">Run Analysis</strong> to see diagrams
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-600 block mb-0.5">{label}</label>
      {children}
    </div>
  )
}

function DiagramCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 flex items-baseline gap-2">
        <span className="font-semibold text-sm text-gray-800">{title}</span>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

// Add .input class via inline style injection
const style = document.createElement('style')
style.textContent = `.input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; outline: none; } .input:focus { border-color: #3b82f6; }`
document.head.appendChild(style)
