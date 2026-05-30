import { useState } from 'react'
import { Layers, BarChart2, Columns, BookOpen, LayoutDashboard } from 'lucide-react'
import { useStore } from './store/useStore'
import Dashboard from './pages/Dashboard'
import FrameAnalyzer from './pages/FrameAnalyzer'
import BeamDesigner from './pages/BeamDesigner'
import ColumnDesigner from './pages/ColumnDesigner'
import SectionLibrary from './pages/SectionLibrary'

export type Module = 'dashboard' | 'frame' | 'beam' | 'column' | 'sections'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'frame',     label: 'Frame',        icon: Layers },
  { id: 'beam',      label: 'Beam Design',  icon: BarChart2 },
  { id: 'column',    label: 'Column',       icon: Columns },
  { id: 'sections',  label: 'Sections',     icon: BookOpen },
] as const

export default function App() {
  const store = useStore()
  const [module, setModule] = useState<Module>('dashboard')

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left nav rail */}
      <nav className="w-16 bg-slate-900 flex flex-col items-center py-3 gap-1 flex-shrink-0 z-10 shadow-xl">
        <div className="mb-3">
          <Layers size={26} className="text-blue-400" />
        </div>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setModule(id as Module)}
            title={label}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs ${
              module === id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <Icon size={18} />
            <span style={{ fontSize: 9 }} className="leading-none">{label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {module === 'dashboard' && <Dashboard setModule={setModule} />}
        {module === 'frame'     && <FrameAnalyzer store={store} />}
        {module === 'beam'      && <BeamDesigner />}
        {module === 'column'    && <ColumnDesigner />}
        {module === 'sections'  && <SectionLibrary />}
      </div>
    </div>
  )
}
