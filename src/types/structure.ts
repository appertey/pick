export type SupportType = 'fixed' | 'pinned' | 'roller_x' | 'roller_y' | 'free'
export type MaterialType = 'steel' | 'concrete' | 'timber'
export type MemberType = 'beam' | 'column' | 'brace'
export type LoadCase = 'dead' | 'live' | 'wind' | 'seismic'

export interface StructNode {
  id: string
  x: number     // meters
  y: number     // meters
  support: SupportType
}

export interface Member {
  id: string
  startNodeId: string
  endNodeId: string
  material: MaterialType
  sectionId: string
  type: MemberType
  releases?: { startMz?: boolean; endMz?: boolean }  // moment releases (pins)
}

export interface PointLoad {
  id: string
  nodeId: string
  Fx: number   // kN  (positive = right)
  Fy: number   // kN  (positive = up)
  Mz: number   // kN·m
  loadCase: LoadCase
}

export interface DistributedLoad {
  id: string
  memberId: string
  wStart: number  // kN/m (positive = downward in global Y)
  wEnd: number    // kN/m
  loadCase: LoadCase
}

export interface SteelSection {
  id: string
  designation: string
  A: number    // mm²   cross-sectional area
  Ix: number   // mm⁴   moment of inertia (major)
  Iy: number   // mm⁴   moment of inertia (minor)
  Sx: number   // mm³   elastic section modulus
  Zx: number   // mm³   plastic section modulus
  rx: number   // mm    radius of gyration
  d: number    // mm    depth
  bf: number   // mm    flange width
  tf: number   // mm    flange thickness
  tw: number   // mm    web thickness
  W: number    // kg/m  self-weight
}

export interface ConcreteSection {
  id: string
  designation: string
  b: number    // mm  width
  h: number    // mm  height
  cover: number // mm cover
  fc: number   // MPa compressive strength
  fy: number   // MPa rebar yield strength
  As: number   // mm² steel area
}

export type AnySection = SteelSection | ConcreteSection

export interface NodeResult {
  nodeId: string
  dx: number   // m
  dy: number   // m
  rz: number   // rad
}

export interface Reaction {
  nodeId: string
  Rx: number   // kN
  Ry: number   // kN
  Mz: number   // kN·m
}

export interface MemberResult {
  memberId: string
  axialStart: number   // kN (tension +)
  shearStart: number   // kN
  momentStart: number  // kN·m
  axialEnd: number
  shearEnd: number
  momentEnd: number
  maxMoment: number    // kN·m absolute max
  maxShear: number
  maxAxial: number
  utilization: number  // design ratio 0..1+
}

export interface AnalysisResult {
  loadCombination: string
  factors: Record<LoadCase, number>
  nodeResults: NodeResult[]
  reactions: Reaction[]
  memberResults: MemberResult[]
  maxDeflection: number  // m
  converged: boolean
  error?: string
}

export interface Project {
  name: string
  description: string
  units: 'metric' | 'imperial'
  nodes: StructNode[]
  members: Member[]
  pointLoads: PointLoad[]
  distributedLoads: DistributedLoad[]
  analysisResults: AnalysisResult[]
  selectedNodeIds: string[]
  selectedMemberIds: string[]
  tool: 'select' | 'addNode' | 'addMember' | 'addLoad' | 'delete'
  showDeformed: boolean
  deformationScale: number
}
