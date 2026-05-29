import type { StoreType } from '../../store/useStore'

interface Props { store: StoreType }

function UtilBar({ value }: { value: number }) {
  const pct = Math.min(value * 100, 100)
  const color = value < 0.5 ? 'bg-emerald-500' : value < 0.75 ? 'bg-yellow-500' : value < 1.0 ? 'bg-orange-500' : 'bg-red-600'
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${value >= 1 ? 'text-red-700' : 'text-gray-700'}`}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}

export default function ResultsPanel({ store }: Props) {
  const { project } = store
  const { analysisResults, members } = project

  if (analysisResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
        <div className="text-4xl mb-3">📐</div>
        <div className="font-medium text-gray-600 mb-1">No results yet</div>
        <div className="text-xs">Click <strong>Run Analysis</strong> to compute member forces and deflections</div>
      </div>
    )
  }

  // Find envelope (worst utilization per member across all combos)
  const envelope: Record<string, { util: number; combo: string; maxM: number; maxV: number; maxN: number }> = {}
  for (const result of analysisResults) {
    for (const mr of result.memberResults) {
      const prev = envelope[mr.memberId]
      if (!prev || mr.utilization > prev.util) {
        envelope[mr.memberId] = { util: mr.utilization, combo: result.loadCombination, maxM: mr.maxMoment, maxV: mr.maxShear, maxN: mr.maxAxial }
      }
    }
  }

  const maxDeflection = Math.max(...analysisResults.map(r => r.maxDeflection))
  const govResult = analysisResults.find(r => r.maxDeflection === maxDeflection) ?? analysisResults[0]

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-700">{(maxDeflection * 1000).toFixed(1)}</div>
          <div className="text-xs text-blue-600">Max δ (mm)</div>
          <div className="text-xs text-gray-500 mt-0.5">{govResult.loadCombination}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-700">
            {analysisResults.filter(r => r.converged).length}/{analysisResults.length}
          </div>
          <div className="text-xs text-emerald-600">Converged</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-orange-700">
            {Object.values(envelope).filter(e => e.util >= 1).length}
          </div>
          <div className="text-xs text-orange-600">Overstressed</div>
        </div>
      </div>

      {/* Member utilization envelope */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Member Utilization Envelope</div>
        <div className="flex flex-col gap-1.5">
          {members.map(m => {
            const env = envelope[m.id]
            if (!env) return null
            return (
              <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-2">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-xs text-blue-800">{m.id}</span>
                  <span className="text-xs text-gray-500">{m.sectionId} · {env.combo}</span>
                </div>
                <UtilBar value={env.util} />
                <div className="grid grid-cols-3 gap-1 mt-1 font-mono text-xs text-gray-600">
                  <span>N={env.maxN.toFixed(1)}kN</span>
                  <span>V={env.maxV.toFixed(1)}kN</span>
                  <span>M={env.maxM.toFixed(1)}kN·m</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-combination summary */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Load Combinations</div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Combination</th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium">Max δ</th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium">Max Util</th>
                <th className="px-2 py-1.5 text-center text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {analysisResults.map(r => {
                const maxUtil = r.memberResults.length > 0 ? Math.max(...r.memberResults.map(m => m.utilization)) : 0
                const ok = r.converged && maxUtil < 1.0
                return (
                  <tr key={r.loadCombination} className={`border-b last:border-0 ${!r.converged ? 'bg-red-50' : ''}`}>
                    <td className="px-2 py-1.5 font-medium text-gray-700">{r.loadCombination}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                      {r.converged ? `${(r.maxDeflection * 1000).toFixed(2)}mm` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {r.converged ? <span className={maxUtil >= 1 ? 'text-red-700 font-bold' : 'text-gray-600'}>{(maxUtil * 100).toFixed(0)}%</span> : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {!r.converged
                        ? <span className="text-red-600" title={r.error}>⚠ Error</span>
                        : ok
                        ? <span className="text-emerald-600">✓ OK</span>
                        : <span className="text-red-600 font-bold">✕ NG</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error messages */}
      {analysisResults.filter(r => r.error).map(r => (
        <div key={r.loadCombination} className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
          <strong>{r.loadCombination}:</strong> {r.error}
        </div>
      ))}
    </div>
  )
}
