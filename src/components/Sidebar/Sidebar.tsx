import { useState } from 'react'
import type { StoreType } from '../../store/useStore'
import NodePanel from './NodePanel'
import MemberPanel from './MemberPanel'
import LoadPanel from './LoadPanel'
import ResultsPanel from '../Results/ResultsPanel'

interface Props { store: StoreType; side: 'left' | 'right' }

const LEFT_TABS = ['Nodes', 'Members', 'Loads'] as const
const RIGHT_TABS = ['Results'] as const

export default function Sidebar({ store, side }: Props) {
  const tabs = side === 'left' ? LEFT_TABS : RIGHT_TABS
  const [active, setActive] = useState<string>(tabs[0])

  return (
    <div className={`flex flex-col bg-white border-gray-200 ${side === 'left' ? 'w-72 border-r' : 'w-80 border-l'} flex-shrink-0`}>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              active === tab
                ? 'text-blue-700 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3">
        {active === 'Nodes' && <NodePanel store={store} />}
        {active === 'Members' && <MemberPanel store={store} />}
        {active === 'Loads' && <LoadPanel store={store} />}
        {active === 'Results' && <ResultsPanel store={store} />}
      </div>
    </div>
  )
}
