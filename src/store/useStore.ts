import { useState, useCallback } from 'react'
import type { Project, StructNode, Member, PointLoad, DistributedLoad, SupportType, MaterialType, MemberType, LoadCase } from '../types/structure'
import { runAnalysis } from '../engine/stiffness'
import { LRFD_COMBINATIONS } from '../engine/loads'

let _nodeCounter = 1
let _memberCounter = 1
let _loadCounter = 1
let _distLoadCounter = 1

function newNodeId() { return `N${_nodeCounter++}` }
function newMemberId() { return `M${_memberCounter++}` }
function newLoadId() { return `P${_loadCounter++}` }
function newDistId() { return `D${_distLoadCounter++}` }

function defaultProject(): Project {
  // Simple portal frame example
  const n1: StructNode = { id: 'N1', x: 0, y: 0, support: 'fixed' }
  const n2: StructNode = { id: 'N2', x: 0, y: 4, support: 'free' }
  const n3: StructNode = { id: 'N3', x: 6, y: 4, support: 'free' }
  const n4: StructNode = { id: 'N4', x: 6, y: 0, support: 'fixed' }

  const m1: Member = { id: 'M1', startNodeId: 'N1', endNodeId: 'N2', material: 'steel', sectionId: 'W10x33', type: 'column' }
  const m2: Member = { id: 'M2', startNodeId: 'N2', endNodeId: 'N3', material: 'steel', sectionId: 'W12x26', type: 'beam' }
  const m3: Member = { id: 'M3', startNodeId: 'N4', endNodeId: 'N3', material: 'steel', sectionId: 'W10x33', type: 'column' }

  const dl1: DistributedLoad = { id: 'D1', memberId: 'M2', wStart: 20, wEnd: 20, loadCase: 'dead' }
  const dl2: DistributedLoad = { id: 'D2', memberId: 'M2', wStart: 15, wEnd: 15, loadCase: 'live' }
  const pl1: PointLoad = { id: 'P1', nodeId: 'N2', Fx: 10, Fy: 0, Mz: 0, loadCase: 'wind' }

  _nodeCounter = 5
  _memberCounter = 4
  _distLoadCounter = 3
  _loadCounter = 2

  return {
    name: 'Portal Frame Example',
    description: 'Simple single-bay portal frame with fixed supports',
    units: 'metric',
    nodes: [n1, n2, n3, n4],
    members: [m1, m2, m3],
    pointLoads: [pl1],
    distributedLoads: [dl1, dl2],
    analysisResults: [],
    selectedNodeIds: [],
    selectedMemberIds: [],
    tool: 'select',
    showDeformed: false,
    deformationScale: 100,
  }
}

export function useStore() {
  const [project, setProject] = useState<Project>(defaultProject)

  const update = useCallback((fn: (p: Project) => Project) => {
    setProject(prev => fn(prev))
  }, [])

  // --- Node ops ---
  const addNode = useCallback((x: number, y: number) => {
    const node: StructNode = { id: newNodeId(), x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, support: 'free' }
    update(p => ({ ...p, nodes: [...p.nodes, node], selectedNodeIds: [node.id], selectedMemberIds: [] }))
    return node.id
  }, [update])

  const updateNode = useCallback((id: string, changes: Partial<StructNode>) => {
    update(p => ({ ...p, nodes: p.nodes.map(n => n.id === id ? { ...n, ...changes } : n) }))
  }, [update])

  const deleteNodes = useCallback((ids: string[]) => {
    update(p => ({
      ...p,
      nodes: p.nodes.filter(n => !ids.includes(n.id)),
      members: p.members.filter(m => !ids.includes(m.startNodeId) && !ids.includes(m.endNodeId)),
      pointLoads: p.pointLoads.filter(pl => !ids.includes(pl.nodeId)),
      selectedNodeIds: [],
    }))
  }, [update])

  // --- Member ops ---
  const addMember = useCallback((startNodeId: string, endNodeId: string, material: MaterialType, sectionId: string, type: MemberType) => {
    if (startNodeId === endNodeId) return null
    const member: Member = { id: newMemberId(), startNodeId, endNodeId, material, sectionId, type }
    update(p => ({ ...p, members: [...p.members, member], selectedMemberIds: [member.id], selectedNodeIds: [] }))
    return member.id
  }, [update])

  const updateMember = useCallback((id: string, changes: Partial<Member>) => {
    update(p => ({ ...p, members: p.members.map(m => m.id === id ? { ...m, ...changes } : m) }))
  }, [update])

  const deleteMembers = useCallback((ids: string[]) => {
    update(p => ({
      ...p,
      members: p.members.filter(m => !ids.includes(m.id)),
      distributedLoads: p.distributedLoads.filter(dl => !ids.includes(dl.memberId)),
      selectedMemberIds: [],
    }))
  }, [update])

  // --- Load ops ---
  const addPointLoad = useCallback((nodeId: string, Fx: number, Fy: number, Mz: number, loadCase: LoadCase) => {
    const load: PointLoad = { id: newLoadId(), nodeId, Fx, Fy, Mz, loadCase }
    update(p => ({ ...p, pointLoads: [...p.pointLoads, load] }))
  }, [update])

  const updatePointLoad = useCallback((id: string, changes: Partial<PointLoad>) => {
    update(p => ({ ...p, pointLoads: p.pointLoads.map(l => l.id === id ? { ...l, ...changes } : l) }))
  }, [update])

  const deletePointLoad = useCallback((id: string) => {
    update(p => ({ ...p, pointLoads: p.pointLoads.filter(l => l.id !== id) }))
  }, [update])

  const addDistributedLoad = useCallback((memberId: string, wStart: number, wEnd: number, loadCase: LoadCase) => {
    const load: DistributedLoad = { id: newDistId(), memberId, wStart, wEnd, loadCase }
    update(p => ({ ...p, distributedLoads: [...p.distributedLoads, load] }))
  }, [update])

  const updateDistributedLoad = useCallback((id: string, changes: Partial<DistributedLoad>) => {
    update(p => ({ ...p, distributedLoads: p.distributedLoads.map(l => l.id === id ? { ...l, ...changes } : l) }))
  }, [update])

  const deleteDistributedLoad = useCallback((id: string) => {
    update(p => ({ ...p, distributedLoads: p.distributedLoads.filter(l => l.id !== id) }))
  }, [update])

  // --- Selection ---
  const selectNodes = useCallback((ids: string[]) => {
    update(p => ({ ...p, selectedNodeIds: ids, selectedMemberIds: [] }))
  }, [update])

  const selectMembers = useCallback((ids: string[]) => {
    update(p => ({ ...p, selectedMemberIds: ids, selectedNodeIds: [] }))
  }, [update])

  const clearSelection = useCallback(() => {
    update(p => ({ ...p, selectedNodeIds: [], selectedMemberIds: [] }))
  }, [update])

  const setTool = useCallback((tool: Project['tool']) => {
    update(p => ({ ...p, tool }))
  }, [update])

  // --- Analysis ---
  const runAllAnalysis = useCallback(() => {
    update(p => {
      const results = LRFD_COMBINATIONS.map(combo =>
        runAnalysis(p.nodes, p.members, p.pointLoads, p.distributedLoads, combo.name, combo.factors)
      )
      return { ...p, analysisResults: results }
    })
  }, [update])

  const setShowDeformed = useCallback((show: boolean) => {
    update(p => ({ ...p, showDeformed: show }))
  }, [update])

  const setDeformationScale = useCallback((scale: number) => {
    update(p => ({ ...p, deformationScale: scale }))
  }, [update])

  const setProjectName = useCallback((name: string) => {
    update(p => ({ ...p, name }))
  }, [update])

  const resetProject = useCallback(() => {
    _nodeCounter = 1; _memberCounter = 1; _loadCounter = 1; _distLoadCounter = 1
    setProject(defaultProject())
  }, [])

  const setSupportType = useCallback((nodeId: string, support: SupportType) => {
    update(p => ({ ...p, nodes: p.nodes.map(n => n.id === nodeId ? { ...n, support } : n) }))
  }, [update])

  return {
    project,
    addNode, updateNode, deleteNodes,
    addMember, updateMember, deleteMembers,
    addPointLoad, updatePointLoad, deletePointLoad,
    addDistributedLoad, updateDistributedLoad, deleteDistributedLoad,
    selectNodes, selectMembers, clearSelection,
    setTool, setSupportType,
    runAllAnalysis,
    setShowDeformed, setDeformationScale,
    setProjectName, resetProject,
  }
}

export type StoreType = ReturnType<typeof useStore>
