import { useState } from 'react'
import type { StoreType } from '../../store/useStore'
import type { LoadCase } from '../../types/structure'

interface Props { store: StoreType }

const LOAD_CASE_COLORS: Record<LoadCase, string> = {
  dead: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  live: 'bg-amber-100 text-amber-800 border-amber-200',
  wind: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  seismic: 'bg-red-100 text-red-800 border-red-200',
}

export default function LoadPanel({ store }: Props) {
  const { project, addPointLoad, addDistributedLoad, deletePointLoad, deleteDistributedLoad } = store
  const { pointLoads, distributedLoads, nodes, members } = project

  const [newPoint, setNewPoint] = useState({ nodeId: nodes[0]?.id ?? '', Fx: 0, Fy: 0, Mz: 0, loadCase: 'live' as LoadCase })
  const [newDist, setNewDist] = useState({ memberId: members[0]?.id ?? '', wStart: 0, wEnd: 0, loadCase: 'dead' as LoadCase })

  return (
    <div className="flex flex-col gap-4">
      {/* Point loads */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Point Loads ({pointLoads.length})</div>
        <div className="flex flex-col gap-1 mb-2 max-h-36 overflow-y-auto">
          {pointLoads.map(pl => (
            <div key={pl.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border ${LOAD_CASE_COLORS[pl.loadCase]}`}>
              <span className="font-semibold w-6">{pl.id}</span>
              <span className="w-10">{pl.nodeId}</span>
              <span className="font-mono flex-1">Fx={pl.Fx} Fy={pl.Fy} Mz={pl.Mz}</span>
              <span className="w-14">[{pl.loadCase}]</span>
              <button onClick={() => deletePointLoad(pl.id)} className="text-red-500 hover:text-red-700 ml-1">✕</button>
            </div>
          ))}
        </div>

        {/* Add point load form */}
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 text-xs font-medium py-1">+ Add Point Load</summary>
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Node</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-0.5"
                  value={newPoint.nodeId} onChange={e => setNewPoint(p => ({ ...p, nodeId: e.target.value }))}>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.id} ({n.x},{n.y})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Load Case</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-0.5"
                  value={newPoint.loadCase} onChange={e => setNewPoint(p => ({ ...p, loadCase: e.target.value as LoadCase }))}>
                  <option value="dead">Dead (D)</option>
                  <option value="live">Live (L)</option>
                  <option value="wind">Wind (W)</option>
                  <option value="seismic">Seismic (E)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Fx', 'Fy', 'Mz'] as const).map(f => (
                <div key={f}>
                  <label className="text-xs text-gray-600">{f} (kN{f === 'Mz' ? '·m' : ''})</label>
                  <input type="number" step="1"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-0.5"
                    value={(newPoint as Record<string, number | string>)[f] as number}
                    onChange={e => setNewPoint(p => ({ ...p, [f]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                addPointLoad(newPoint.nodeId, newPoint.Fx, newPoint.Fy, newPoint.Mz, newPoint.loadCase)
              }}
              className="bg-blue-600 text-white text-xs rounded py-1 hover:bg-blue-700"
            >
              Add Point Load
            </button>
          </div>
        </details>
      </div>

      {/* Distributed loads */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Distributed Loads ({distributedLoads.length})</div>
        <div className="flex flex-col gap-1 mb-2 max-h-36 overflow-y-auto">
          {distributedLoads.map(dl => (
            <div key={dl.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border ${LOAD_CASE_COLORS[dl.loadCase]}`}>
              <span className="font-semibold w-6">{dl.id}</span>
              <span className="w-10">{dl.memberId}</span>
              <span className="font-mono flex-1">{dl.wStart}→{dl.wEnd} kN/m</span>
              <span className="w-14">[{dl.loadCase}]</span>
              <button onClick={() => deleteDistributedLoad(dl.id)} className="text-red-500 hover:text-red-700 ml-1">✕</button>
            </div>
          ))}
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 text-xs font-medium py-1">+ Add Distributed Load</summary>
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Member</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-0.5"
                  value={newDist.memberId} onChange={e => setNewDist(d => ({ ...d, memberId: e.target.value }))}>
                  {members.map(m => <option key={m.id} value={m.id}>{m.id} ({m.startNodeId}→{m.endNodeId})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Load Case</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-0.5"
                  value={newDist.loadCase} onChange={e => setNewDist(d => ({ ...d, loadCase: e.target.value as LoadCase }))}>
                  <option value="dead">Dead (D)</option>
                  <option value="live">Live (L)</option>
                  <option value="wind">Wind (W)</option>
                  <option value="seismic">Seismic (E)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">w Start (kN/m ↓)</label>
                <input type="number" step="1"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-0.5"
                  value={newDist.wStart}
                  onChange={e => setNewDist(d => ({ ...d, wStart: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">w End (kN/m ↓)</label>
                <input type="number" step="1"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-0.5"
                  value={newDist.wEnd}
                  onChange={e => setNewDist(d => ({ ...d, wEnd: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <button
              onClick={() => addDistributedLoad(newDist.memberId, newDist.wStart, newDist.wEnd, newDist.loadCase)}
              className="bg-blue-600 text-white text-xs rounded py-1 hover:bg-blue-700"
            >
              Add Distributed Load
            </button>
          </div>
        </details>
      </div>

      {/* Load summary */}
      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
        <div className="font-semibold text-gray-600 mb-1">Load Summary</div>
        {(['dead', 'live', 'wind', 'seismic'] as LoadCase[]).map(lc => {
          const pts = pointLoads.filter(p => p.loadCase === lc)
          const dists = distributedLoads.filter(d => d.loadCase === lc)
          if (pts.length + dists.length === 0) return null
          return (
            <div key={lc} className={`flex justify-between rounded px-2 py-0.5 mb-0.5 border ${LOAD_CASE_COLORS[lc]}`}>
              <span className="capitalize font-medium">{lc}</span>
              <span>{pts.length} point, {dists.length} distributed</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
