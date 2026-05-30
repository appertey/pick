import Header from '../components/Header/Header'
import Sidebar from '../components/Sidebar/Sidebar'
import StructureCanvas from '../components/Canvas/StructureCanvas'
import type { StoreType } from '../store/useStore'

export default function FrameAnalyzer({ store }: { store: StoreType }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header store={store} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar store={store} side="left" />
        <StructureCanvas store={store} />
        <Sidebar store={store} side="right" />
      </div>
    </div>
  )
}
