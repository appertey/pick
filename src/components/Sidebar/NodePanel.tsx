import type { StoreType } from '../../store/useStore'
import type { SupportType } from '../../types/structure'

interface Props { store: StoreType }

const SUPPORT_OPTIONS: { value: SupportType; label: string; icon: string }[] = [
  { value: 'free',     label: 'Free',     icon: '○' },
  { value: 'pinned',   label: 'Pinned',   icon: '△' },
  { value: 'roller_x', label: 'Roller X', icon: '→' },
  { value: 'roller_y', label: 'Roller Y', icon: '↑' },
  { value: 'fixed',    label: 'Fixed',    icon: '▪' },
]

export default function NodePanel({ store }: Props) {
  const { project, updateNode, deleteNodes, setSupportType } = store
  const { nodes, selectedNodeIds, analysisResults } = project
  const result = analysisResults[1]  // 1.2D + 1.6L

  const selectedNode = selectedNodeIds.length === 1 ? nodes.find(n => n.id === selectedNodeIds[0]) : null

  return (
    <div className="flex flex-col gap-3">
      {/* Node list */}
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nodes ({nodes.length})</div>
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {nodes.map(nd => {
          const isSelected = selectedNodeIds.includes(nd.id)
          const nr = result?.nodeResults.find(r => r.nodeId === nd.id)
          return (
            <button
              key={nd.id}
              onClick={() => store.selectNodes([nd.id])}
              className={`flex items-center justify-between px-2 py-1.5 rounded text-xs text-left transition-colors ${
                isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="font-semibold text-blue-800">{nd.id}</span>
              <span className="text-gray-600">({nd.x}, {nd.y}) m</span>
              <span className="text-gray-500 text-xs">{nd.support}</span>
              {nr && (
                <span className="text-emerald-700 font-mono">
                  δ={Math.sqrt(nr.dx ** 2 + nr.dy ** 2).toFixed(3)}m
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected node editor */}
      {selectedNode && (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
          <div className="font-semibold text-blue-800 text-sm mb-2">Edit Node {selectedNode.id}</div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-gray-600">X (m)</label>
              <input
                type="number" step="0.5"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                value={selectedNode.x}
                onChange={e => updateNode(selectedNode.id, { x: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Y (m)</label>
              <input
                type="number" step="0.5"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                value={selectedNode.y}
                onChange={e => updateNode(selectedNode.id, { y: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="text-xs text-gray-600 block mb-1">Support condition</label>
            <div className="grid grid-cols-3 gap-1">
              {SUPPORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSupportType(selectedNode.id, opt.value)}
                  className={`py-1 rounded text-xs font-medium border transition-colors ${
                    selectedNode.support === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Displacement results */}
          {result?.nodeResults.find(r => r.nodeId === selectedNode.id) && (() => {
            const nr = result.nodeResults.find(r => r.nodeId === selectedNode.id)!
            return (
              <div className="bg-white rounded border border-gray-200 p-2 text-xs mt-2">
                <div className="font-semibold text-gray-700 mb-1">Displacements (LRFD-2)</div>
                <div className="grid grid-cols-3 gap-1 font-mono">
                  <div><span className="text-gray-500">δx:</span> {(nr.dx * 1000).toFixed(1)}mm</div>
                  <div><span className="text-gray-500">δy:</span> {(nr.dy * 1000).toFixed(1)}mm</div>
                  <div><span className="text-gray-500">θz:</span> {(nr.rz * 1000).toFixed(2)}mrad</div>
                </div>
              </div>
            )
          })()}

          <button
            onClick={() => deleteNodes([selectedNode.id])}
            className="mt-2 w-full py-1 rounded text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
          >
            Delete Node
          </button>
        </div>
      )}

      {/* Reactions */}
      {result && result.reactions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reactions (LRFD-2)</div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-2 py-1 text-left text-gray-500">Node</th>
                  <th className="px-2 py-1 text-right text-gray-500">Rx (kN)</th>
                  <th className="px-2 py-1 text-right text-gray-500">Ry (kN)</th>
                  <th className="px-2 py-1 text-right text-gray-500">Mz (kN·m)</th>
                </tr>
              </thead>
              <tbody>
                {result.reactions.map(r => (
                  <tr key={r.nodeId} className="border-b last:border-0">
                    <td className="px-2 py-1 font-semibold text-blue-700">{r.nodeId}</td>
                    <td className="px-2 py-1 text-right font-mono">{r.Rx.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right font-mono">{r.Ry.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right font-mono">{r.Mz.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
