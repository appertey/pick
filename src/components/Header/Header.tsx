import { Play, RotateCcw, Eye, EyeOff, Layers } from 'lucide-react'
import type { StoreType } from '../../store/useStore'

interface Props { store: StoreType }

const TOOLS = [
  { id: 'select',    label: 'Select',     key: 'S', icon: '↖' },
  { id: 'addNode',   label: 'Add Node',   key: 'N', icon: '⬤' },
  { id: 'addMember', label: 'Add Member', key: 'M', icon: '━' },
  { id: 'delete',    label: 'Delete',     key: 'Del', icon: '✕' },
] as const

export default function Header({ store }: Props) {
  const { project, setTool, runAllAnalysis, setShowDeformed, setDeformationScale, setProjectName, resetProject } = store
  const hasResults = project.analysisResults.length > 0

  return (
    <header className="bg-slate-900 text-white flex items-center gap-4 px-4 py-2 shadow-lg flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-4">
        <Layers size={22} className="text-blue-400" />
        <div>
          <div className="text-sm font-bold text-blue-300 leading-none">StructPro</div>
          <div className="text-xs text-slate-400 leading-none">Structural Engineering</div>
        </div>
      </div>

      {/* Project name */}
      <input
        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white w-52 focus:outline-none focus:border-blue-400"
        value={project.name}
        onChange={e => setProjectName(e.target.value)}
      />

      {/* Tools */}
      <div className="flex gap-1 mx-2">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id as typeof project.tool)}
            title={`${t.label} [${t.key}]`}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              project.tool === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span className="mr-1 text-xs">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Deformed shape toggle */}
      {hasResults && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeformed(!project.showDeformed)}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
              project.showDeformed ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {project.showDeformed ? <Eye size={14} /> : <EyeOff size={14} />}
            Deformed
          </button>
          {project.showDeformed && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">×</span>
              <input
                type="range" min="10" max="500" step="10"
                value={project.deformationScale}
                onChange={e => setDeformationScale(Number(e.target.value))}
                className="w-20 accent-blue-400"
              />
              <span className="text-xs text-slate-300 w-8">{project.deformationScale}</span>
            </div>
          )}
        </div>
      )}

      {/* Reset */}
      <button
        onClick={resetProject}
        className="flex items-center gap-1 px-3 py-1 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
        title="Reset to example"
      >
        <RotateCcw size={14} />
      </button>

      {/* Run Analysis */}
      <button
        onClick={runAllAnalysis}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors shadow"
      >
        <Play size={14} />
        Run Analysis
      </button>
    </header>
  )
}
