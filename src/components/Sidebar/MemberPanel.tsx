import type { StoreType } from '../../store/useStore'
import type { MaterialType, MemberType } from '../../types/structure'
import { STEEL_SECTIONS, CONCRETE_SECTIONS } from '../../data/sections'

interface Props { store: StoreType }

function utilizationBadge(u: number) {
  const pct = (u * 100).toFixed(0)
  if (u < 0.5) return <span className="text-emerald-700 font-semibold">{pct}%</span>
  if (u < 0.75) return <span className="text-yellow-700 font-semibold">{pct}%</span>
  if (u < 1.0) return <span className="text-orange-600 font-semibold">{pct}%</span>
  return <span className="text-red-700 font-bold">{pct}% ⚠</span>
}

export default function MemberPanel({ store }: Props) {
  const { project, updateMember, deleteMembers } = store
  const { members, selectedMemberIds, nodes, analysisResults } = project
  const result = analysisResults[1]

  const selectedMember = selectedMemberIds.length === 1 ? members.find(m => m.id === selectedMemberIds[0]) : null

  const sections = selectedMember?.material === 'concrete' ? CONCRETE_SECTIONS : STEEL_SECTIONS

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Members ({members.length})</div>

      {/* Member list */}
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {members.map(m => {
          const isSelected = selectedMemberIds.includes(m.id)
          const mr = result?.memberResults.find(r => r.memberId === m.id)
          const startNode = nodes.find(n => n.id === m.startNodeId)
          const endNode = nodes.find(n => n.id === m.endNodeId)
          const L = startNode && endNode
            ? Math.sqrt((endNode.x - startNode.x) ** 2 + (endNode.y - startNode.y) ** 2).toFixed(2)
            : '?'
          return (
            <button
              key={m.id}
              onClick={() => store.selectMembers([m.id])}
              className={`flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors ${
                isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="font-semibold text-blue-800 w-8">{m.id}</span>
              <span className="text-gray-600 w-20">{m.startNodeId}→{m.endNodeId}</span>
              <span className="text-gray-500 w-16 text-right">{m.sectionId}</span>
              <span className="text-gray-400 w-10 text-right">{L}m</span>
              {mr ? utilizationBadge(mr.utilization) : <span className="text-gray-300">—</span>}
            </button>
          )
        })}
      </div>

      {/* Editor for selected member */}
      {selectedMember && (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
          <div className="font-semibold text-blue-800 text-sm mb-2">Edit Member {selectedMember.id}</div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-gray-600">Start Node</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                value={selectedMember.startNodeId}
                onChange={e => updateMember(selectedMember.id, { startNodeId: e.target.value })}
              >
                {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">End Node</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                value={selectedMember.endNodeId}
                onChange={e => updateMember(selectedMember.id, { endNodeId: e.target.value })}
              >
                {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-gray-600">Material</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                value={selectedMember.material}
                onChange={e => {
                  const mat = e.target.value as MaterialType
                  const defaultSec = mat === 'steel' ? 'W12x26' : 'C300x500'
                  updateMember(selectedMember.id, { material: mat, sectionId: defaultSec })
                }}
              >
                <option value="steel">Steel</option>
                <option value="concrete">Concrete</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Type</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                value={selectedMember.type}
                onChange={e => updateMember(selectedMember.id, { type: e.target.value as MemberType })}
              >
                <option value="beam">Beam</option>
                <option value="column">Column</option>
                <option value="brace">Brace</option>
              </select>
            </div>
          </div>

          <div className="mb-2">
            <label className="text-xs text-gray-600">Section</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
              value={selectedMember.sectionId}
              onChange={e => updateMember(selectedMember.id, { sectionId: e.target.value })}
            >
              {sections.map(s => <option key={s.id} value={s.id}>{s.designation}</option>)}
            </select>
          </div>

          <div className="flex gap-2 mb-2">
            <label className="text-xs text-gray-600 flex items-center gap-1">
              <input
                type="checkbox"
                checked={!!selectedMember.releases?.startMz}
                onChange={e => updateMember(selectedMember.id, { releases: { ...selectedMember.releases, startMz: e.target.checked } })}
              />
              Pin Start
            </label>
            <label className="text-xs text-gray-600 flex items-center gap-1">
              <input
                type="checkbox"
                checked={!!selectedMember.releases?.endMz}
                onChange={e => updateMember(selectedMember.id, { releases: { ...selectedMember.releases, endMz: e.target.checked } })}
              />
              Pin End
            </label>
          </div>

          {/* Force results */}
          {result?.memberResults.find(r => r.memberId === selectedMember.id) && (() => {
            const mr = result.memberResults.find(r => r.memberId === selectedMember.id)!
            return (
              <div className="bg-white rounded border border-gray-200 p-2 text-xs mt-1">
                <div className="font-semibold text-gray-700 mb-1">Forces — 1.2D+1.6L</div>
                <div className="grid grid-cols-2 gap-x-3 font-mono">
                  <div><span className="text-gray-500">N:</span> {mr.axialStart.toFixed(1)} kN</div>
                  <div><span className="text-gray-500">Nmax:</span> {mr.maxAxial.toFixed(1)} kN</div>
                  <div><span className="text-gray-500">V:</span> {mr.shearStart.toFixed(1)} kN</div>
                  <div><span className="text-gray-500">Vmax:</span> {mr.maxShear.toFixed(1)} kN</div>
                  <div><span className="text-gray-500">M:</span> {mr.momentStart.toFixed(1)} kN·m</div>
                  <div><span className="text-gray-500">Mmax:</span> {mr.maxMoment.toFixed(1)} kN·m</div>
                </div>
                <div className="mt-1 font-semibold">
                  Utilization: {utilizationBadge(mr.utilization)}
                </div>
              </div>
            )
          })()}

          <button
            onClick={() => deleteMembers([selectedMember.id])}
            className="mt-2 w-full py-1 rounded text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
          >
            Delete Member
          </button>
        </div>
      )}
    </div>
  )
}
