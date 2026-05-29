import { useStore } from './store/useStore'
import Header from './components/Header/Header'
import Sidebar from './components/Sidebar/Sidebar'
import StructureCanvas from './components/Canvas/StructureCanvas'

export default function App() {
  const store = useStore()

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <Header store={store} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar store={store} side="left" />
        <StructureCanvas store={store} />
        <Sidebar store={store} side="right" />
      </div>
    </div>
  )
}
