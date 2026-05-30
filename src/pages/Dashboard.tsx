import type { Module } from '../App'
import { Layers, BarChart2, Columns, BookOpen, ChevronRight } from 'lucide-react'

const MODULES = [
  {
    id: 'frame' as Module,
    icon: Layers,
    color: 'bg-blue-600',
    title: '2D Frame Analyzer',
    desc: 'Model and analyze 2D frames and continuous beams. Stiffness method with ASCE 7 LRFD combinations. Steel and concrete members.',
    tags: ['Direct Stiffness', 'LRFD', 'ASCE 7'],
  },
  {
    id: 'beam' as Module,
    icon: BarChart2,
    color: 'bg-emerald-600',
    title: 'Beam Design Calculator',
    desc: 'Single and multi-span beam analysis with interactive M, V and deflection diagrams. AISC LRFD and ACI 318 member checks.',
    tags: ['BMD / SFD', 'Deflection', 'AISC / ACI'],
  },
  {
    id: 'column' as Module,
    icon: Columns,
    color: 'bg-violet-600',
    title: 'Column Designer',
    desc: 'Axial + biaxial bending interaction for steel (AISC H1) and RC columns (ACI 318 P-M interaction diagram). Euler buckling.',
    tags: ['P-M Diagram', 'Euler', 'AISC H1'],
  },
  {
    id: 'sections' as Module,
    icon: BookOpen,
    color: 'bg-amber-600',
    title: 'Section Library',
    desc: 'Browse and compare 24 AISC W-shapes and 8 RC presets. Cross-section viewer with full geometric and material properties.',
    tags: ['AISC W-shapes', 'RC Sections', 'Compare'],
  },
]

const STATS = [
  { label: 'AISC W-shapes', value: '24' },
  { label: 'RC Sections', value: '8' },
  { label: 'LRFD combos', value: '6' },
  { label: 'Analysis DOFs', value: '3/node' },
]

export default function Dashboard({ setModule }: { setModule: (m: Module) => void }) {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Hero */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Layers size={36} className="text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">StructPro</h1>
            <p className="text-slate-400 text-sm">Professional Structural Engineering Design Suite</p>
          </div>
        </div>

        <p className="text-slate-300 mt-4 max-w-2xl text-sm leading-relaxed">
          A browser-based structural analysis and design platform for practicing engineers.
          Model frames, design beams and columns, check code compliance per AISC LRFD, ACI 318, and ASCE 7.
        </p>

        {/* Stats */}
        <div className="flex gap-6 mt-6 mb-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-blue-300">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-2 gap-4">
          {MODULES.map(m => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                onClick={() => setModule(m.id)}
                className="text-left bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-500 hover:bg-slate-750 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`${m.color} p-3 rounded-xl flex-shrink-0`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-white text-base">{m.title}</h2>
                      <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
                    </div>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{m.desc}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {m.tags.map(tag => (
                        <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Code reference */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Design Codes Implemented</div>
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
            <div><span className="text-blue-400 font-medium">AISC 360-22</span> — Steel member design, LRFD</div>
            <div><span className="text-blue-400 font-medium">ACI 318-19</span> — Concrete beam & column design</div>
            <div><span className="text-blue-400 font-medium">ASCE 7-22</span> — Load combinations (LRFD & ASD)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
