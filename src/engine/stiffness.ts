/**
 * 2D frame direct stiffness analysis.
 * DOFs per node: [dx, dy, rz]   (x=right, y=up, z out-of-plane)
 * Forces: kN, lengths: m, moments: kN·m
 */
import type {
  StructNode, Member, PointLoad, DistributedLoad,
  NodeResult, Reaction, MemberResult, AnalysisResult, LoadCase,
} from '../types/structure'
import { getSteelSection, getConcreteSection, STEEL_MATERIAL, CONCRETE_MATERIAL } from '../data/sections'

const DOF = 3  // dofs per node

function nodeIndex(nodeId: string, nodes: StructNode[]): number {
  return nodes.findIndex(n => n.id === nodeId)
}

function memberLength(m: Member, nodes: StructNode[]): number {
  const s = nodes.find(n => n.id === m.startNodeId)!
  const e = nodes.find(n => n.id === m.endNodeId)!
  return Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2)
}

function memberAngle(m: Member, nodes: StructNode[]): number {
  const s = nodes.find(n => n.id === m.startNodeId)!
  const e = nodes.find(n => n.id === m.endNodeId)!
  return Math.atan2(e.y - s.y, e.x - s.x)
}

interface SectionProps { E: number; A: number; I: number }

function getSectionProps(m: Member): SectionProps {
  if (m.material === 'steel') {
    const sec = getSteelSection(m.sectionId)
    if (!sec) return { E: 200e3, A: 5e3, I: 200e6 }
    return { E: STEEL_MATERIAL.E, A: sec.A, I: sec.Ix }
  } else {
    // concrete
    const sec = getConcreteSection(m.sectionId)
    if (!sec) return { E: 25e3, A: 60000, I: 2e9 }
    const Ec = CONCRETE_MATERIAL.E(sec.fc)
    const Ic = (sec.b * sec.h ** 3) / 12
    return { E: Ec, A: sec.b * sec.h, I: Ic }
  }
}

/**
 * Local stiffness matrix for 2D frame element [6x6].
 * DOF order: [u1, v1, θ1, u2, v2, θ2]
 * Units: E in MPa, A in mm², I in mm⁴, L in m → convert to kN, m
 */
function localStiffness(L: number, props: SectionProps, releases?: Member['releases']): number[][] {
  const { E, A, I } = props
  // Convert: E[MPa] * A[mm²] = N, * 1e-3 = kN. E[MPa] = kN/mm² → * 1e6/1e6 = kN/m²
  // Use SI: E in kN/m², A in m², I in m⁴, L in m → result in kN, kN·m
  const Ekn = E * 1e3        // kN/m²   (MPa → kN/m²: 1 MPa = 1000 kN/m²)
  const Am = A * 1e-6        // m²
  const Im = I * 1e-12       // m⁴

  const EA = Ekn * Am
  const EI = Ekn * Im

  const a = EA / L
  const b = 12 * EI / L ** 3
  const c = 6 * EI / L ** 2
  const d = 4 * EI / L
  const e2 = 2 * EI / L

  // Standard 2D frame element stiffness (no releases)
  let K: number[][] = [
    [ a,  0,   0,  -a,  0,   0  ],
    [ 0,  b,   c,   0, -b,   c  ],
    [ 0,  c,   d,   0, -c,   e2 ],
    [-a,  0,   0,   a,  0,   0  ],
    [ 0, -b,  -c,   0,  b,  -c  ],
    [ 0,  c,   e2,  0, -c,   d  ],
  ]

  // Apply moment releases (pin connections) via static condensation
  if (releases?.startMz) {
    K = condense(K, 2)
  }
  if (releases?.endMz) {
    K = condense(K, 5)
  }

  return K
}

/** Zero out row/col at dof index (simple release approximation) */
function condense(K: number[][], dof: number): number[][] {
  const n = K.length
  const Kc = K.map(r => [...r])
  for (let i = 0; i < n; i++) {
    Kc[i][dof] = 0
    Kc[dof][i] = 0
  }
  return Kc
}

function transformMatrix(angle: number): number[][] {
  const c = Math.cos(angle), s = Math.sin(angle)
  const T0 = [[c, s, 0], [-s, c, 0], [0, 0, 1]]
  const T: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0))
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    T[i][j] = T0[i][j]
    T[i + 3][j + 3] = T0[i][j]
  }
  return T
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, k = B.length
  const C = Array.from({ length: n }, () => Array(m).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++)
    for (let p = 0; p < k; p++) C[i][j] += A[i][p] * B[p][j]
  return C
}

function matTranspose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map(row => row[j]))
}

/** Global stiffness for one member [6x6] */
function globalMemberStiffness(m: Member, nodes: StructNode[]): number[][] {
  const L = memberLength(m, nodes)
  const angle = memberAngle(m, nodes)
  const props = getSectionProps(m)
  const Kl = localStiffness(L, props, m.releases)
  const T = transformMatrix(angle)
  const Tt = matTranspose(T)
  return matMul(matMul(Tt, Kl), T)
}

/** Assemble global stiffness matrix [nDOF x nDOF] */
function assembleGlobalK(nodes: StructNode[], members: Member[]): number[][] {
  const n = nodes.length * DOF
  const K = Array.from({ length: n }, () => Array(n).fill(0))

  for (const m of members) {
    const si = nodeIndex(m.startNodeId, nodes)
    const ei = nodeIndex(m.endNodeId, nodes)
    const Kg = globalMemberStiffness(m, nodes)
    const dofs = [si * 3, si * 3 + 1, si * 3 + 2, ei * 3, ei * 3 + 1, ei * 3 + 2]
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++)
      K[dofs[i]][dofs[j]] += Kg[i][j]
  }
  return K
}

/** Distributed load equivalent nodal loads (fixed-end forces in global coords) */
function distLoadFixedEnd(
  m: Member, nodes: StructNode[], wStart: number, wEnd: number
): number[] {
  const L = memberLength(m, nodes)
  const angle = memberAngle(m, nodes)

  // Uniform part and triangular part
  const wu = wStart
  const wt = wEnd - wStart

  // Fixed-end reactions (local) for uniform w downward
  // (positive w = downward in global → transforms based on angle)
  // Local y-axis fixed-end forces for uniform load w_local (downward in local = -y direction in local)
  // But we'll work in global: project load onto member local axes

  // The load acts in -y global direction
  // In local coords: perpendicular component = -w * cos(angle), axial = w * sin(angle)
  // For simplicity, assume load is transverse (perpendicular to member local axis)
  const w_perp_u = wu  // kN/m transverse in local (negative y)
  const w_perp_t = wt

  // Uniform transverse load fixed-end forces (local)
  const Vy1u = w_perp_u * L / 2
  const Vy2u = w_perp_u * L / 2
  const M1u = w_perp_u * L * L / 12
  const M2u = -w_perp_u * L * L / 12

  // Triangular part (wt at end)
  const Vy1t = 7 * w_perp_t * L / 20
  const Vy2t = 3 * w_perp_t * L / 20
  const M1t = w_perp_t * L * L / 20
  const M2t = -w_perp_t * L * L / 30

  const fLocal = [0, Vy1u + Vy1t, M1u + M1t, 0, Vy2u + Vy2t, M2u + M2t]

  // Transform to global
  const T = transformMatrix(angle)
  const Tt = matTranspose(T)
  const fGlobal: number[] = Array(6).fill(0)
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++)
    fGlobal[i] += Tt[i][j] * fLocal[j]

  // Map to full DOF vector [sx, sy, srz, ex, ey, erz]
  const si = nodeIndex(m.startNodeId, nodes)
  const ei = nodeIndex(m.endNodeId, nodes)
  const full: number[] = Array(nodes.length * DOF).fill(0)
  ;[si * 3, si * 3 + 1, si * 3 + 2, ei * 3, ei * 3 + 1, ei * 3 + 2].forEach((d, k) => {
    full[d] += fGlobal[k]
  })
  return full
}

/** Apply support conditions and solve K·u = f (Gaussian elimination) */
function solve(Kfull: number[][], f: number[], nodes: StructNode[]): number[] {
  const n = Kfull.length
  const K = Kfull.map(r => [...r])
  const rhs = [...f]

  // Find restrained DOFs
  const restrained: Set<number> = new Set()
  for (let i = 0; i < nodes.length; i++) {
    const { support } = nodes[i]
    const base = i * 3
    if (support === 'fixed') { restrained.add(base); restrained.add(base + 1); restrained.add(base + 2) }
    else if (support === 'pinned') { restrained.add(base); restrained.add(base + 1) }
    else if (support === 'roller_x') { restrained.add(base) }
    else if (support === 'roller_y') { restrained.add(base + 1) }
  }

  // Apply penalty method for restrained DOFs
  const penalty = 1e15
  for (const d of restrained) {
    K[d][d] = penalty
    rhs[d] = 0
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(K[row][col]) > Math.abs(K[maxRow][col])) maxRow = row
    }
    ;[K[col], K[maxRow]] = [K[maxRow], K[col]]
    ;[rhs[col], rhs[maxRow]] = [rhs[maxRow], rhs[col]]

    if (Math.abs(K[col][col]) < 1e-12) continue
    const pivot = K[col][col]
    for (let row = col + 1; row < n; row++) {
      const factor = K[row][col] / pivot
      for (let j = col; j < n; j++) K[row][j] -= factor * K[col][j]
      rhs[row] -= factor * rhs[col]
    }
  }

  // Back substitution
  const u = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = rhs[i]
    for (let j = i + 1; j < n; j++) sum -= K[i][j] * u[j]
    u[i] = Math.abs(K[i][i]) > 1e-12 ? sum / K[i][i] : 0
  }
  return u
}

/** Extract member end forces in local coordinates */
function memberEndForces(
  m: Member, nodes: StructNode[], u: number[], distLoads: DistributedLoad[]
): { local: number[] } {
  const si = nodeIndex(m.startNodeId, nodes)
  const ei = nodeIndex(m.endNodeId, nodes)
  const uElem = [
    u[si * 3], u[si * 3 + 1], u[si * 3 + 2],
    u[ei * 3], u[ei * 3 + 1], u[ei * 3 + 2],
  ]

  const L = memberLength(m, nodes)
  const angle = memberAngle(m, nodes)
  const props = getSectionProps(m)
  const Kl = localStiffness(L, props, m.releases)
  const T = transformMatrix(angle)

  // Transform u to local
  const uLocal: number[] = Array(6).fill(0)
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++)
    uLocal[i] += T[i][j] * uElem[j]

  // End forces = Kl * uLocal
  const fLocal: number[] = Array(6).fill(0)
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++)
    fLocal[i] += Kl[i][j] * uLocal[j]

  // Add fixed-end forces from distributed loads
  const mDistLoads = distLoads.filter(d => d.memberId === m.id)
  for (const dl of mDistLoads) {
    const L2 = memberLength(m, nodes)
    const wu = dl.wStart, wt = dl.wEnd - dl.wStart
    fLocal[1] -= wu * L2 / 2 + 7 * wt * L2 / 20
    fLocal[2] -= wu * L2 * L2 / 12 + wt * L2 * L2 / 20
    fLocal[4] -= wu * L2 / 2 + 3 * wt * L2 / 20
    fLocal[5] += wu * L2 * L2 / 12 + wt * L2 * L2 / 30
  }

  return { local: fLocal }
}

export function runAnalysis(
  nodes: StructNode[],
  members: Member[],
  pointLoads: PointLoad[],
  distributedLoads: DistributedLoad[],
  combination: string,
  factors: Record<LoadCase, number>,
): AnalysisResult {
  if (nodes.length === 0) {
    return { loadCombination: combination, factors, nodeResults: [], reactions: [], memberResults: [], maxDeflection: 0, converged: false, error: 'No nodes defined.' }
  }
  if (members.length === 0) {
    return { loadCombination: combination, factors, nodeResults: [], reactions: [], memberResults: [], maxDeflection: 0, converged: false, error: 'No members defined.' }
  }

  const hasSupportNode = nodes.some(n => n.support !== 'free')
  if (!hasSupportNode) {
    return { loadCombination: combination, factors, nodeResults: [], reactions: [], memberResults: [], maxDeflection: 0, converged: false, error: 'No supports defined — structure is unstable.' }
  }

  try {
    const nDOF = nodes.length * DOF
    const K = assembleGlobalK(nodes, members)

    // Build load vector
    const f: number[] = Array(nDOF).fill(0)

    // Point loads
    for (const pl of pointLoads) {
      const fi = factors[pl.loadCase] ?? 0
      if (fi === 0) continue
      const ni = nodeIndex(pl.nodeId, nodes)
      if (ni < 0) continue
      f[ni * 3] += fi * pl.Fx
      f[ni * 3 + 1] += fi * pl.Fy
      f[ni * 3 + 2] += fi * pl.Mz
    }

    // Distributed loads → equivalent nodal forces
    for (const dl of distributedLoads) {
      const fi = factors[dl.loadCase] ?? 0
      if (fi === 0) continue
      const m = members.find(m => m.id === dl.memberId)
      if (!m) continue
      const equiv = distLoadFixedEnd(m, nodes, fi * dl.wStart, fi * dl.wEnd)
      for (let i = 0; i < nDOF; i++) f[i] += equiv[i]
    }

    const u = solve(K, f, nodes)

    // Node results
    const nodeResults: NodeResult[] = nodes.map((nd, i) => ({
      nodeId: nd.id,
      dx: u[i * 3],
      dy: u[i * 3 + 1],
      rz: u[i * 3 + 2],
    }))

    // Reactions at supported nodes
    const Kfull = assembleGlobalK(nodes, members)
    const reactions: Reaction[] = []
    for (let i = 0; i < nodes.length; i++) {
      const nd = nodes[i]
      if (nd.support === 'free') continue
      let Rx = 0, Ry = 0, Mz = 0
      for (let j = 0; j < nDOF; j++) {
        Rx += Kfull[i * 3][j] * u[j]
        Ry += Kfull[i * 3 + 1][j] * u[j]
        Mz += Kfull[i * 3 + 2][j] * u[j]
      }
      reactions.push({ nodeId: nd.id, Rx: Rx - f[i * 3], Ry: Ry - f[i * 3 + 1], Mz: Mz - f[i * 3 + 2] })
    }

    // Member results
    const activeDist = distributedLoads.filter(dl => (factors[dl.loadCase] ?? 0) !== 0)
      .map(dl => ({ ...dl, wStart: dl.wStart * (factors[dl.loadCase] ?? 0), wEnd: dl.wEnd * (factors[dl.loadCase] ?? 0) }))

    const memberResults: MemberResult[] = members.map(m => {
      const { local: f6 } = memberEndForces(m, nodes, u, activeDist)
      const axialStart = f6[0]
      const shearStart = f6[1]
      const momentStart = f6[2]
      const axialEnd = -f6[3]
      const shearEnd = -f6[4]
      const momentEnd = f6[5]

      const maxMoment = Math.max(Math.abs(momentStart), Math.abs(momentEnd))
      const maxShear = Math.max(Math.abs(shearStart), Math.abs(shearEnd))
      const maxAxial = Math.max(Math.abs(axialStart), Math.abs(axialEnd))

      const util = computeUtilization(m, axialStart, shearStart, momentStart)

      return { memberId: m.id, axialStart, shearStart, momentStart, axialEnd, shearEnd, momentEnd, maxMoment, maxShear, maxAxial, utilization: util }
    })

    const maxDeflection = Math.max(...nodeResults.map(nr => Math.sqrt(nr.dx ** 2 + nr.dy ** 2)))

    return { loadCombination: combination, factors, nodeResults, reactions, memberResults, maxDeflection, converged: true }
  } catch (err) {
    return { loadCombination: combination, factors, nodeResults: [], reactions: [], memberResults: [], maxDeflection: 0, converged: false, error: String(err) }
  }
}

function computeUtilization(m: Member, N: number, V: number, M: number): number {
  if (m.material === 'steel') {
    const sec = getSteelSection(m.sectionId)
    if (!sec) return 0
    const Fy = STEEL_MATERIAL.Fy  // MPa
    const phi = 0.9
    const phiMn = phi * Fy * sec.Zx * 1e-6  // kN·m  (Zx[mm³] * Fy[MPa] → N·mm / 1e6 → kN·m)
    const phiVn = phi * 0.6 * Fy * sec.d * sec.tw * 1e-3  // kN
    const phiPn = phi * Fy * sec.A * 1e-3    // kN
    const mRatio = Math.abs(M) / Math.max(phiMn, 0.001)
    const vRatio = Math.abs(V) / Math.max(phiVn, 0.001)
    const aRatio = Math.abs(N) / Math.max(phiPn, 0.001)
    return Math.max(mRatio, vRatio, aRatio, mRatio + aRatio / 9)
  } else {
    const sec = getConcreteSection(m.sectionId)
    if (!sec) return 0
    const phi = 0.9
    const d_eff = sec.h - sec.cover - 10
    const phiMn = phi * sec.As * sec.fy * (d_eff - sec.As * sec.fy / (1.7 * sec.fc * sec.b)) * 1e-6
    const phiVn = phi * (0.17 * Math.sqrt(sec.fc) * sec.b * d_eff) * 1e-3
    return Math.max(Math.abs(M) / Math.max(phiMn, 0.001), Math.abs(V) / Math.max(phiVn, 0.001))
  }
}
