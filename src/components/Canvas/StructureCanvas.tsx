import { useRef, useState, useCallback, useEffect } from 'react'
import type { StoreType } from '../../store/useStore'

const GRID = 1.0  // 1m grid snap

interface Props { store: StoreType }

interface ViewState {
  panX: number
  panY: number
  scale: number
}

function snap(v: number): number {
  return Math.round(v / GRID) * GRID
}

function utilizationColor(u: number): string {
  if (u < 0.5) return '#16a34a'
  if (u < 0.75) return '#ca8a04'
  if (u < 1.0) return '#ea580c'
  return '#dc2626'
}

export default function StructureCanvas({ store }: Props) {
  const { project, addNode, addMember, selectNodes, selectMembers, clearSelection } = store
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<ViewState>({ panX: 200, panY: 400, scale: 60 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [pendingMemberStart, setPendingMemberStart] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const { nodes, members, pointLoads, distributedLoads, analysisResults, showDeformed, deformationScale } = project
  const result = analysisResults[1] // LRFD-2: 1.2D+1.6L (governing for gravity)

  function toSvg(worldX: number, worldY: number) {
    return { x: view.panX + worldX * view.scale, y: view.panY - worldY * view.scale }
  }

  function toWorld(svgX: number, svgY: number) {
    return { x: (svgX - view.panX) / view.scale, y: (view.panY - svgY) / view.scale }
  }

  function getSvgPoint(e: React.MouseEvent): DOMPoint | null {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const sp = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    setView(v => {
      const newScale = Math.max(20, Math.min(300, v.scale * factor))
      return {
        scale: newScale,
        panX: sp.x - (sp.x - v.panX) * (newScale / v.scale),
        panY: sp.y - (sp.y - v.panY) * (newScale / v.scale),
      }
    })
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => svg.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - view.panX, y: e.clientY - view.panY })
      e.preventDefault()
      return
    }
    if (project.tool === 'select') {
      clearSelection()
    }
    if (project.tool === 'addNode') {
      const sp = getSvgPoint(e)
      if (!sp) return
      const w = toWorld(sp.x, sp.y)
      addNode(snap(w.x), snap(w.y))
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setView(v => ({ ...v, panX: e.clientX - panStart.x, panY: e.clientY - panStart.y }))
      return
    }
    const sp = getSvgPoint(e)
    if (!sp) return
    const w = toWorld(sp.x, sp.y)
    setMousePos({ x: snap(w.x), y: snap(w.y) })
  }

  function handleMouseUp() {
    setIsPanning(false)
  }

  function handleNodeClick(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation()
    if (project.tool === 'select') {
      selectNodes([nodeId])
    } else if (project.tool === 'addMember') {
      if (!pendingMemberStart) {
        setPendingMemberStart(nodeId)
      } else {
        addMember(pendingMemberStart, nodeId, 'steel', 'W12x26', 'beam')
        setPendingMemberStart(null)
      }
    } else if (project.tool === 'delete') {
      store.deleteNodes([nodeId])
    }
  }

  function handleMemberClick(e: React.MouseEvent, memberId: string) {
    e.stopPropagation()
    if (project.tool === 'select') {
      selectMembers([memberId])
    } else if (project.tool === 'delete') {
      store.deleteMembers([memberId])
    }
  }

  const deformedPos = (nodeId: string): { x: number; y: number } => {
    const nd = nodes.find(n => n.id === nodeId)!
    if (!showDeformed || !result) return { x: nd.x, y: nd.y }
    const nr = result.nodeResults.find(r => r.nodeId === nodeId)
    if (!nr) return { x: nd.x, y: nd.y }
    return { x: nd.x + nr.dx * deformationScale, y: nd.y + nr.dy * deformationScale }
  }

  // Grid lines
  const gridLines: React.ReactElement[] = []
  const worldBounds = { minX: toWorld(0, 0).x, maxX: toWorld(800, 0).x, minY: toWorld(0, 600).y, maxY: toWorld(0, 0).y }
  for (let gx = Math.floor(worldBounds.minX / 2) * 2; gx <= worldBounds.maxX + 2; gx += 2) {
    const s = toSvg(gx, worldBounds.minY)
    const e2 = toSvg(gx, worldBounds.maxY)
    gridLines.push(<line key={`gx${gx}`} x1={s.x} y1={s.y} x2={e2.x} y2={e2.y} stroke="#e5e7eb" strokeWidth="0.5" />)
  }
  for (let gy = Math.floor(worldBounds.minY / 2) * 2; gy <= worldBounds.maxY + 2; gy += 2) {
    const s = toSvg(worldBounds.minX, gy)
    const e2 = toSvg(worldBounds.maxX, gy)
    gridLines.push(<line key={`gy${gy}`} x1={s.x} y1={s.y} x2={e2.x} y2={e2.y} stroke="#e5e7eb" strokeWidth="0.5" />)
  }

  return (
    <div className="relative flex-1 bg-gray-50 overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : project.tool === 'select' ? 'default' : 'crosshair' }}
      >
        {/* Grid */}
        {gridLines}

        {/* Axes */}
        {(() => {
          const o = toSvg(0, 0)
          return <>
            <line x1={o.x - 5} y1={o.y} x2={o.x + 30} y2={o.y} stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <line x1={o.x} y1={o.y + 5} x2={o.x} y2={o.y - 30} stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x={o.x + 33} y={o.y + 4} fill="#6b7280" fontSize="11">X</text>
            <text x={o.x - 4} y={o.y - 33} fill="#6b7280" fontSize="11">Y</text>
          </>
        })()}

        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#9ca3af" />
          </marker>
          <marker id="loadArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" />
          </marker>
          <marker id="loadArrowDown" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* Distributed loads */}
        {distributedLoads.map(dl => {
          const m = members.find(mb => mb.id === dl.memberId)
          if (!m) return null
          const s = nodes.find(n => n.id === m.startNodeId)
          const e = nodes.find(n => n.id === m.endNodeId)
          if (!s || !e) return null
          const ss = toSvg(s.x, s.y), es = toSvg(e.x, e.y)
          const mid = { x: (ss.x + es.x) / 2, y: (ss.y + es.y) / 2 }
          const color = dl.loadCase === 'dead' ? '#6366f1' : dl.loadCase === 'live' ? '#f59e0b' : '#10b981'
          const steps = 5
          const arrows = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const ax = ss.x + t * (es.x - ss.x)
            const ay = ss.y + t * (es.y - ss.y)
            const len = 20
            arrows.push(<line key={i} x1={ax} y1={ay - len} x2={ax} y2={ay - 2} stroke={color} strokeWidth="1.5" markerEnd="url(#loadArrow)" />)
          }
          return (
            <g key={dl.id}>
              {arrows}
              <text x={mid.x} y={mid.y - 28} textAnchor="middle" fill={color} fontSize="10" fontWeight="500">
                {dl.wStart}kN/m ({dl.loadCase})
              </text>
            </g>
          )
        })}

        {/* Members */}
        {members.map(m => {
          const s = nodes.find(n => n.id === m.startNodeId)
          const e = nodes.find(n => n.id === m.endNodeId)
          if (!s || !e) return null
          const ds = deformedPos(m.startNodeId)
          const de = deformedPos(m.endNodeId)
          const ss = toSvg(s.x, s.y), es = toSvg(e.x, e.y)
          const dss = toSvg(ds.x, ds.y), des = toSvg(de.x, de.y)
          const mr = result?.memberResults.find(r => r.memberId === m.id)
          const util = mr?.utilization ?? 0
          const color = result ? utilizationColor(util) : '#3b82f6'
          const isSelected = project.selectedMemberIds.includes(m.id)

          return (
            <g key={m.id} onClick={e2 => handleMemberClick(e2, m.id)} style={{ cursor: 'pointer' }}>
              {/* Undeformed (ghost) */}
              <line x1={ss.x} y1={ss.y} x2={es.x} y2={es.y} stroke="#d1d5db" strokeWidth="3" strokeDasharray="4,3" />
              {/* Deformed / actual */}
              <line
                x1={showDeformed ? dss.x : ss.x}
                y1={showDeformed ? dss.y : ss.y}
                x2={showDeformed ? des.x : es.x}
                y2={showDeformed ? des.y : es.y}
                stroke={isSelected ? '#8b5cf6' : color}
                strokeWidth={isSelected ? 5 : 4}
                strokeLinecap="round"
              />
              {/* Click target */}
              <line
                x1={ss.x} y1={ss.y} x2={es.x} y2={es.y}
                stroke="transparent" strokeWidth="12"
              />
              {/* Member label */}
              <text
                x={(ss.x + es.x) / 2 + 6}
                y={(ss.y + es.y) / 2 - 6}
                fill={isSelected ? '#6d28d9' : '#374151'}
                fontSize="10"
                fontWeight="600"
              >
                {m.id} {mr ? `(${(util * 100).toFixed(0)}%)` : ''}
              </text>
            </g>
          )
        })}

        {/* Point loads */}
        {pointLoads.map(pl => {
          const nd = nodes.find(n => n.id === pl.nodeId)
          if (!nd) return null
          const p = toSvg(nd.x, nd.y)
          const scale2 = 35
          const color = pl.loadCase === 'dead' ? '#6366f1' : pl.loadCase === 'live' ? '#f59e0b' : '#10b981'
          return (
            <g key={pl.id}>
              {pl.Fx !== 0 && (
                <line
                  x1={p.x - Math.sign(pl.Fx) * scale2} y1={p.y}
                  x2={p.x - Math.sign(pl.Fx) * 5} y2={p.y}
                  stroke={color} strokeWidth="2.5" markerEnd="url(#loadArrow)"
                />
              )}
              {pl.Fy !== 0 && (
                <line
                  x1={p.x} y1={p.y + Math.sign(pl.Fy) * scale2}
                  x2={p.x} y2={p.y + Math.sign(pl.Fy) * 5}
                  stroke={color} strokeWidth="2.5" markerEnd="url(#loadArrow)"
                />
              )}
              <text x={p.x + 4} y={p.y - 18} fill={color} fontSize="9">
                {pl.loadCase} {pl.Fx !== 0 ? `Fx=${pl.Fx}kN` : ''}{pl.Fy !== 0 ? ` Fy=${pl.Fy}kN` : ''}
              </text>
            </g>
          )
        })}

        {/* Support symbols */}
        {nodes.map(nd => {
          const p = toSvg(nd.x, nd.y)
          if (nd.support === 'free') return null
          if (nd.support === 'fixed') {
            return (
              <g key={`sup-${nd.id}`}>
                <rect x={p.x - 10} y={p.y - 2} width="20" height="12" fill="#374151" rx="1" />
                {[-8, -4, 0, 4, 8].map(offset => (
                  <line key={offset} x1={p.x + offset} y1={p.y + 10} x2={p.x + offset - 6} y2={p.y + 16} stroke="#374151" strokeWidth="1.5" />
                ))}
              </g>
            )
          }
          if (nd.support === 'pinned') {
            return (
              <g key={`sup-${nd.id}`}>
                <polygon points={`${p.x},${p.y} ${p.x - 10},${p.y + 14} ${p.x + 10},${p.y + 14}`} fill="#374151" />
                {[-8, -3, 3, 8].map(offset => (
                  <line key={offset} x1={p.x + offset - 4} y1={p.y + 14} x2={p.x + offset - 10} y2={p.y + 20} stroke="#374151" strokeWidth="1.5" />
                ))}
              </g>
            )
          }
          if (nd.support === 'roller_y') {
            return (
              <g key={`sup-${nd.id}`}>
                <polygon points={`${p.x},${p.y} ${p.x - 10},${p.y + 14} ${p.x + 10},${p.y + 14}`} fill="#374151" />
                <line x1={p.x - 12} y1={p.y + 16} x2={p.x + 12} y2={p.y + 16} stroke="#374151" strokeWidth="2" />
                <circle cx={p.x - 6} cy={p.y + 19} r="2.5" fill="#374151" />
                <circle cx={p.x + 6} cy={p.y + 19} r="2.5" fill="#374151" />
              </g>
            )
          }
          return null
        })}

        {/* Nodes */}
        {nodes.map(nd => {
          const p = toSvg(nd.x, nd.y)
          const dp = toSvg(deformedPos(nd.id).x, deformedPos(nd.id).y)
          const isSelected = project.selectedNodeIds.includes(nd.id)
          const isPendingStart = pendingMemberStart === nd.id
          return (
            <g key={nd.id} onClick={e => handleNodeClick(e, nd.id)} style={{ cursor: 'pointer' }}>
              {showDeformed && (
                <circle cx={dp.x} cy={dp.y} r="5" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
              )}
              <circle
                cx={p.x} cy={p.y} r={isSelected || isPendingStart ? 7 : 5.5}
                fill={isPendingStart ? '#f59e0b' : isSelected ? '#8b5cf6' : '#1e40af'}
                stroke="white" strokeWidth="2"
              />
              <text x={p.x + 9} y={p.y + 4} fill="#1e40af" fontSize="11" fontWeight="700">{nd.id}</text>
              <text x={p.x + 9} y={p.y + 14} fill="#6b7280" fontSize="9">({nd.x},{nd.y})m</text>
              {/* Click target */}
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
            </g>
          )
        })}

        {/* Ghost line for member drawing */}
        {pendingMemberStart && mousePos && (() => {
          const startNode = nodes.find(n => n.id === pendingMemberStart)
          if (!startNode) return null
          const sp = toSvg(startNode.x, startNode.y)
          const ep = toSvg(mousePos.x, mousePos.y)
          return <line x1={sp.x} y1={sp.y} x2={ep.x} y2={ep.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,3" />
        })()}

        {/* Mouse coordinate display */}
        {mousePos && project.tool !== 'select' && (
          <text x="10" y="20" fill="#6b7280" fontSize="11">
            ({mousePos.x.toFixed(1)}, {mousePos.y.toFixed(1)}) m
          </text>
        )}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          className="w-8 h-8 bg-white border border-gray-300 rounded shadow text-gray-700 hover:bg-gray-50 font-bold text-lg flex items-center justify-center"
          onClick={() => setView(v => ({ ...v, scale: Math.min(300, v.scale * 1.3) }))}
        >+</button>
        <button
          className="w-8 h-8 bg-white border border-gray-300 rounded shadow text-gray-700 hover:bg-gray-50 font-bold text-lg flex items-center justify-center"
          onClick={() => setView(v => ({ ...v, scale: Math.max(20, v.scale / 1.3) }))}
        >−</button>
        <button
          className="w-8 h-8 bg-white border border-gray-300 rounded shadow text-gray-700 hover:bg-gray-50 text-xs flex items-center justify-center"
          onClick={() => setView({ panX: 200, panY: 400, scale: 60 })}
          title="Reset view"
        >⊙</button>
      </div>

      {/* Hint */}
      {project.tool === 'addMember' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-300 text-amber-800 text-xs px-3 py-1 rounded-full shadow">
          {pendingMemberStart ? `Click end node — started at ${pendingMemberStart}` : 'Click start node'}
        </div>
      )}
      {project.tool === 'addNode' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-50 border border-blue-300 text-blue-800 text-xs px-3 py-1 rounded-full shadow">
          Click canvas to place node (snaps to 1m grid)
        </div>
      )}
    </div>
  )
}
