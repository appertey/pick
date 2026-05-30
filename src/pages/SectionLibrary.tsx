import { useState, useMemo } from 'react'
import { STEEL_SECTIONS, CONCRETE_SECTIONS, STEEL_MATERIAL } from '../data/sections'
import type { SteelSection, ConcreteSection } from '../types/structure'

type Tab = 'steel' | 'concrete'

function SectionViewer({ sec }: { sec: SteelSection }) {
  const scale = 140 / sec.d   // pixels per mm
  const W = 180, H = 200
  const cx = W / 2, cy = H / 2
  const d = sec.d * scale, bf = sec.bf * scale, tf = sec.tf * scale, tw = sec.tw * scale

  return (
    <svg width={W} height={H} className="border border-gray-200 rounded bg-gray-50">
      {/* Flanges */}
      <rect x={cx - bf/2} y={cy - d/2} width={bf} height={tf} fill="#3b82f6" rx="1" />
      <rect x={cx - bf/2} y={cy + d/2 - tf} width={bf} height={tf} fill="#3b82f6" rx="1" />
      {/* Web */}
      <rect x={cx - tw/2} y={cy - d/2 + tf} width={tw} height={d - 2*tf} fill="#60a5fa" rx="1" />
      {/* Labels */}
      <text x={cx} y={cy - d/2 - 4} fontSize="9" fill="#374151" textAnchor="middle">b={sec.bf}mm</text>
      <text x={cx + bf/2 + 4} y={cy} fontSize="9" fill="#374151">d={sec.d}mm</text>
      <text x={cx + tw/2 + 3} y={cy + 12} fontSize="8" fill="#6b7280">tw={sec.tw}mm</text>
    </svg>
  )
}

function ConcreteSectionViewer({ sec }: { sec: ConcreteSection }) {
  const W = 180, H = 180
  const maxDim = Math.max(sec.b, sec.h)
  const scale = 130 / maxDim
  const bpx = sec.b * scale, hpx = sec.h * scale
  const cx = W/2, cy = H/2
  const cover = sec.cover * scale
  const barR = 5

  return (
    <svg width={W} height={H} className="border border-gray-200 rounded bg-gray-50">
      {/* Section */}
      <rect x={cx - bpx/2} y={cy - hpx/2} width={bpx} height={hpx} fill="#d1d5db" stroke="#6b7280" strokeWidth="1.5" rx="2" />
      {/* Cover line */}
      <rect x={cx - bpx/2 + cover} y={cy - hpx/2 + cover} width={bpx - 2*cover} height={hpx - 2*cover}
        fill="none" stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="3,2" />
      {/* Rebar (corner bars) */}
      {[[-1,-1],[-1,1],[1,-1],[1,1]].map(([dx, dy], i) => (
        <circle key={i}
          cx={cx + dx * (bpx/2 - cover - barR*0.6)}
          cy={cy + dy * (hpx/2 - cover - barR*0.6)}
          r={barR} fill="#1e40af" />
      ))}
      {/* Labels */}
      <text x={cx} y={cy - hpx/2 - 5} fontSize="9" fill="#374151" textAnchor="middle">b={sec.b}mm</text>
      <text x={cx + bpx/2 + 5} y={cy} fontSize="9" fill="#374151">h={sec.h}mm</text>
    </svg>
  )
}

export default function SectionLibrary() {
  const [tab, setTab] = useState<Tab>('steel')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null>('W18x35')
  const [compare, setCompare] = useState<string[]>([])

  const steelFiltered = useMemo(() =>
    STEEL_SECTIONS.filter(s => s.designation.toLowerCase().includes(filter.toLowerCase())),
    [filter]
  )
  const concreteFiltered = useMemo(() =>
    CONCRETE_SECTIONS.filter(s => s.designation.toLowerCase().includes(filter.toLowerCase())),
    [filter]
  )
  const list = tab === 'steel' ? steelFiltered : concreteFiltered
  const selectedSec = tab === 'steel'
    ? STEEL_SECTIONS.find(s => s.id === selected)
    : CONCRETE_SECTIONS.find(s => s.id === selected)

  const phiMn = (s: SteelSection) => (0.9 * STEEL_MATERIAL.Fy * s.Zx * 1e-6).toFixed(1)
  const phiVn = (s: SteelSection) => (0.9 * 0.6 * STEEL_MATERIAL.Fy * s.d * s.tw * 1e-3).toFixed(1)

  function toggleCompare(id: string) {
    setCompare(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev)
  }

  const compareItems = STEEL_SECTIONS.filter(s => compare.includes(s.id))

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* List panel */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-3 bg-amber-600 text-white">
          <div className="font-bold">Section Library</div>
          <div className="text-amber-200 text-xs">AISC W-shapes · RC sections</div>
        </div>

        <div className="flex border-b">
          {(['steel','concrete'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(t==='steel'?'W18x35':'C300x500') }}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${tab===t?'border-amber-600 text-amber-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'steel' ? 'Steel (AISC)' : 'Concrete (RC)'}
            </button>
          ))}
        </div>

        <div className="p-2 border-b">
          <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" placeholder="Filter sections..."
            value={filter} onChange={e => setFilter(e.target.value)} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {list.map(sec => (
            <div key={sec.id}
              onClick={() => setSelected(sec.id)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs border-b border-gray-100 ${selected===sec.id?'bg-amber-50 border-l-2 border-l-amber-600':''} hover:bg-gray-50`}
            >
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{sec.designation}</div>
                {'A' in sec && <div className="text-gray-400">A={sec.A} mm² · d={sec.d} mm</div>}
                {'b' in sec && !('bf' in sec) && <div className="text-gray-400">{(sec as ConcreteSection).b}×{(sec as ConcreteSection).h} mm · f'c={(sec as ConcreteSection).fc} MPa</div>}
              </div>
              {tab === 'steel' && (
                <button
                  onClick={e => { e.stopPropagation(); toggleCompare(sec.id) }}
                  className={`text-xs px-1.5 py-0.5 rounded border ${compare.includes(sec.id)?'bg-amber-600 text-white border-amber-600':'text-gray-400 border-gray-300 hover:border-amber-400'}`}
                >cmp</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedSec && tab === 'steel' && 'Zx' in selectedSec && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedSec.designation}</h2>
                  <div className="text-xs text-gray-500">Wide Flange — ASTM A992 (Fy = 345 MPa)</div>
                </div>
                <div className="ml-auto">
                  <SectionViewer sec={selectedSec as SteelSection} />
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                  <PropCard label="Area A" val={`${(selectedSec as SteelSection).A.toLocaleString()} mm²`} />
                  <PropCard label="Depth d" val={`${(selectedSec as SteelSection).d} mm`} />
                  <PropCard label="Flange bf" val={`${(selectedSec as SteelSection).bf} mm`} />
                  <PropCard label="Ix" val={`${((selectedSec as SteelSection).Ix / 1e6).toFixed(1)} × 10⁶ mm⁴`} />
                  <PropCard label="Sx" val={`${((selectedSec as SteelSection).Sx / 1e3).toFixed(0)} × 10³ mm³`} />
                  <PropCard label="Zx" val={`${((selectedSec as SteelSection).Zx / 1e3).toFixed(0)} × 10³ mm³`} />
                  <PropCard label="rx" val={`${(selectedSec as SteelSection).rx} mm`} />
                  <PropCard label="tf / tw" val={`${(selectedSec as SteelSection).tf} / ${(selectedSec as SteelSection).tw} mm`} />
                  <PropCard label="Weight" val={`${(selectedSec as SteelSection).W} kg/m`} />
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Design Capacities (Fy = 250 MPa, φ = 0.9)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <PropCard label="φMnx" val={`${phiMn(selectedSec as SteelSection)} kN·m`} accent />
                    <PropCard label="φVn" val={`${phiVn(selectedSec as SteelSection)} kN`} accent />
                    <PropCard label="φPn (axial)" val={`${(0.9 * STEEL_MATERIAL.Fy * (selectedSec as SteelSection).A * 1e-3).toFixed(0)} kN`} accent />
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison table */}
            {compareItems.length >= 2 && (
              <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm text-gray-700">Section Comparison</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">Property</th>
                        {compareItems.map(s => <th key={s.id} className="px-3 py-2 text-right text-amber-700 font-semibold">{s.designation}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'A (mm²)',    fn: (s: SteelSection) => s.A.toLocaleString() },
                        { label: 'd (mm)',     fn: (s: SteelSection) => s.d.toString() },
                        { label: 'Ix (×10⁶)', fn: (s: SteelSection) => (s.Ix/1e6).toFixed(1) },
                        { label: 'Zx (×10³)', fn: (s: SteelSection) => (s.Zx/1e3).toFixed(0) },
                        { label: 'φMnx (kN·m)', fn: (s: SteelSection) => phiMn(s) },
                        { label: 'φVn (kN)',    fn: (s: SteelSection) => phiVn(s) },
                        { label: 'W (kg/m)',    fn: (s: SteelSection) => s.W.toString() },
                      ].map(row => (
                        <tr key={row.label} className="border-b last:border-0">
                          <td className="px-3 py-1.5 text-gray-500">{row.label}</td>
                          {compareItems.map(s => <td key={s.id} className="px-3 py-1.5 text-right font-mono text-gray-700">{row.fn(s)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 text-xs text-gray-400">Click "cmp" on up to 3 sections to compare · <button onClick={() => setCompare([])} className="text-amber-600 hover:underline">Clear</button></div>
              </div>
            )}
          </div>
        )}

        {selectedSec && tab === 'concrete' && 'b' in selectedSec && !('bf' in selectedSec) && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedSec.designation}</h2>
                <div className="text-xs text-gray-500">Rectangular RC section · ACI 318</div>
              </div>
              <div className="ml-auto">
                <ConcreteSectionViewer sec={selectedSec as ConcreteSection} />
              </div>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4 text-sm">
              <PropCard label="Width b" val={`${(selectedSec as ConcreteSection).b} mm`} />
              <PropCard label="Height h" val={`${(selectedSec as ConcreteSection).h} mm`} />
              <PropCard label="Cover" val={`${(selectedSec as ConcreteSection).cover} mm`} />
              <PropCard label="f'c" val={`${(selectedSec as ConcreteSection).fc} MPa`} />
              <PropCard label="fy" val={`${(selectedSec as ConcreteSection).fy} MPa`} />
              <PropCard label="As" val={`${(selectedSec as ConcreteSection).As} mm²`} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PropCard({ label, val, accent = false }: { label: string; val: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${accent ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`font-semibold text-sm ${accent ? 'text-blue-700' : 'text-gray-800'}`}>{val}</div>
    </div>
  )
}
