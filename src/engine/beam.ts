/**
 * Euler-Bernoulli beam FE analysis
 * Sign convention: v positive = upward, θ positive = CCW, loads positive = downward
 * M positive = sagging (tension bottom), V positive = upward on left face
 */

import { getSteelSection, getConcreteSection, STEEL_MATERIAL, CONCRETE_MATERIAL } from '../data/sections'

const N_ELEM = 80  // elements per beam

export type SupportKind = 'pin' | 'roller' | 'fixed' | 'free'

export interface BeamSupport {
  x: number
  type: SupportKind
}

export interface BeamLoad {
  id: string
  type: 'udl' | 'point' | 'moment'
  x1: number    // m from left
  x2?: number   // udl right end
  w: number     // kN/m | kN | kN·m (positive = downward / CW)
  loadCase: string
}

export interface BeamConfig {
  length: number    // m
  material: 'steel' | 'concrete'
  sectionId: string
  supports: BeamSupport[]
  loads: BeamLoad[]
  factors?: Record<string, number>  // load case factors (default 1.0)
}

export interface BeamResult {
  x: number[]
  V: number[]
  M: number[]
  delta: number[]     // m, positive = downward
  reactions: { x: number; Ry: number; Mz: number }[]
  maxM: number; xMaxM: number
  minM: number; xMinM: number
  maxV: number; minV: number
  maxDelta: number; xMaxDelta: number
  EI: number
  L: number
  utilization: { moment: number; shear: number; deflection: number }
}

function getEI(material: 'steel' | 'concrete', sectionId: string): number {
  if (material === 'steel') {
    const s = getSteelSection(sectionId)
    if (!s) return 10000
    return STEEL_MATERIAL.E * 1e3 * s.Ix * 1e-12   // kN·m²
  } else {
    const s = getConcreteSection(sectionId)
    if (!s) return 5000
    const Ec = CONCRETE_MATERIAL.E(s.fc) * 1e3       // kN/m²
    const I = (s.b * s.h ** 3) / 12 * 1e-12           // m⁴
    return Ec * I
  }
}

// Hermite shape function integrals over [ξ1, ξ2]
function integN1(a: number, b: number) { return (b - b**3 + b**4/2) - (a - a**3 + a**4/2) }
function integN2(a: number, b: number) { return (b**2/2 - 2*b**3/3 + b**4/4) - (a**2/2 - 2*a**3/3 + a**4/4) }
function integN3(a: number, b: number) { return (b**3 - b**4/2) - (a**3 - a**4/2) }
function integN4(a: number, b: number) { return (b**4/4 - b**3/3) - (a**4/4 - a**3/3) }

function beamElemK(EI: number, Le: number): number[][] {
  const L = Le
  return [
    [ 12*EI/L**3,  6*EI/L**2, -12*EI/L**3,  6*EI/L**2],
    [  6*EI/L**2,  4*EI/L,    - 6*EI/L**2,  2*EI/L   ],
    [-12*EI/L**3, -6*EI/L**2,  12*EI/L**3, -6*EI/L**2],
    [  6*EI/L**2,  2*EI/L,    - 6*EI/L**2,  4*EI/L   ],
  ]
}

function gaussSolve(K: number[][], f: number[]): number[] {
  const n = K.length
  const A = K.map((r, i) => [...r, f[i]])
  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++)
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row
    ;[A[col], A[maxRow]] = [A[maxRow], A[col]]
    if (Math.abs(A[col][col]) < 1e-15) continue
    for (let row = col + 1; row < n; row++) {
      const f2 = A[row][col] / A[col][col]
      for (let j = col; j <= n; j++) A[row][j] -= f2 * A[col][j]
    }
  }
  const u = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n]
    for (let j = i + 1; j < n; j++) s -= A[i][j] * u[j]
    u[i] = Math.abs(A[i][i]) > 1e-15 ? s / A[i][i] : 0
  }
  return u
}

export function analyzeBeam(config: BeamConfig): BeamResult {
  const { length: L, material, sectionId, supports, loads, factors = {} } = config
  const EI = getEI(material, sectionId)
  const Le = L / N_ELEM
  const nNodes = N_ELEM + 1
  const nDOF = 2 * nNodes

  // Scale loads by factors
  const scaledLoads = loads.map(ld => ({
    ...ld,
    w: ld.w * (factors[ld.loadCase] ?? 1.0),
  }))

  // Assemble K
  const K = Array.from({ length: nDOF }, () => Array(nDOF).fill(0))
  const Ke = beamElemK(EI, Le)
  for (let e = 0; e < N_ELEM; e++) {
    const d = [2*e, 2*e+1, 2*e+2, 2*e+3]
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        K[d[i]][d[j]] += Ke[i][j]
  }

  // Assemble f (equivalent nodal loads from distributed + point + moment)
  const f = Array(nDOF).fill(0)
  const fOrig = Array(nDOF).fill(0)

  for (const ld of scaledLoads) {
    if (ld.type === 'udl') {
      const x2 = ld.x2 ?? L
      for (let e = 0; e < N_ELEM; e++) {
        const xe = e * Le
        const xeEnd = xe + Le
        const a = Math.max(ld.x1, xe)
        const b2 = Math.min(x2, xeEnd)
        if (a >= b2) continue
        const xi1 = (a - xe) / Le
        const xi2 = (b2 - xe) / Le
        const d = [2*e, 2*e+1, 2*e+2, 2*e+3]
        f[d[0]] += -ld.w * Le * integN1(xi1, xi2)
        f[d[1]] += -ld.w * Le * Le * integN2(xi1, xi2)
        f[d[2]] += -ld.w * Le * integN3(xi1, xi2)
        f[d[3]] += -ld.w * Le * Le * integN4(xi1, xi2)
      }
    } else if (ld.type === 'point') {
      const e = Math.min(Math.floor(ld.x1 / Le), N_ELEM - 1)
      const xi = (ld.x1 - e * Le) / Le
      const d = [2*e, 2*e+1, 2*e+2, 2*e+3]
      f[d[0]] += -ld.w * (1 - 3*xi**2 + 2*xi**3)
      f[d[1]] += -ld.w * Le * xi * (1 - xi)**2
      f[d[2]] += -ld.w * (3*xi**2 - 2*xi**3)
      f[d[3]] += -ld.w * Le * xi**2 * (xi - 1)
    } else if (ld.type === 'moment') {
      // Applied CCW moment → derivative of shape functions
      const e = Math.min(Math.floor(ld.x1 / Le), N_ELEM - 1)
      const xi = (ld.x1 - e * Le) / Le
      const d = [2*e, 2*e+1, 2*e+2, 2*e+3]
      f[d[0]] += ld.w * (6*xi*(xi - 1)) / Le
      f[d[1]] += ld.w * (1 - xi) * (1 - 3*xi)
      f[d[2]] += ld.w * (-6*xi*(xi - 1)) / Le
      f[d[3]] += ld.w * xi * (3*xi - 2)
    }
  }

  // Save original f for reaction extraction
  for (let i = 0; i < nDOF; i++) fOrig[i] = f[i]

  // Apply BCs (penalty method)
  const K_orig = K.map(r => [...r])
  const PENALTY = 1e14
  for (const sup of supports) {
    const ni = Math.round(Math.min(sup.x, L) / Le)
    if (sup.type === 'pin' || sup.type === 'roller' || sup.type === 'fixed') {
      K[2*ni][2*ni] += PENALTY
      f[2*ni] = 0
    }
    if (sup.type === 'fixed') {
      K[2*ni+1][2*ni+1] += PENALTY
      f[2*ni+1] = 0
    }
  }

  // Solve
  const u = gaussSolve(K, f)

  // Reactions: R = K_orig * u - f_applied
  const reactions: BeamResult['reactions'] = []
  for (const sup of supports) {
    const ni = Math.round(Math.min(sup.x, L) / Le)
    let Ry = 0, Mz = 0
    if (sup.type === 'pin' || sup.type === 'roller' || sup.type === 'fixed') {
      for (let j = 0; j < nDOF; j++) Ry += K_orig[2*ni][j] * u[j]
      Ry -= fOrig[2*ni]
    }
    if (sup.type === 'fixed') {
      for (let j = 0; j < nDOF; j++) Mz += K_orig[2*ni+1][j] * u[j]
      Mz -= fOrig[2*ni+1]
    }
    reactions.push({ x: sup.x, Ry, Mz })
  }

  // V and M via equilibrium integration (200 sample points)
  const nPts = 201
  const xArr = Array.from({ length: nPts }, (_, i) => i * L / (nPts - 1))
  const V: number[] = []
  const M: number[] = []

  for (let i = 0; i < nPts; i++) {
    const x = xArr[i]
    let v = 0, m = 0

    for (const rxn of reactions) {
      if (rxn.x <= x + 1e-9) {
        v += rxn.Ry
        m += rxn.Ry * (x - rxn.x) + rxn.Mz
      }
    }

    for (const ld of scaledLoads) {
      if (ld.type === 'point' && ld.x1 < x - 1e-9) {
        v -= ld.w
        m -= ld.w * (x - ld.x1)
      } else if (ld.type === 'udl') {
        const x2 = ld.x2 ?? L
        if (ld.x1 < x - 1e-9) {
          const xr = Math.min(x2, x)
          const loaded = xr - ld.x1
          v -= ld.w * loaded
          const centroid = ld.x1 + loaded / 2
          m -= ld.w * loaded * (x - centroid)
        }
      } else if (ld.type === 'moment' && ld.x1 < x - 1e-9) {
        m -= ld.w   // applied CW moment reduces sagging M
      }
    }

    V.push(v)
    M.push(m)
  }

  // Deflection via Hermite interpolation
  const delta: number[] = []
  for (let i = 0; i < nPts; i++) {
    const x = xArr[i]
    const e = Math.min(Math.floor(x / Le), N_ELEM - 1)
    const xi = (x - e * Le) / Le
    const [v1, t1, v2, t2] = [u[2*e], u[2*e+1], u[2*e+2], u[2*e+3]]
    const N1 = 1 - 3*xi**2 + 2*xi**3
    const N2h = Le * xi * (1 - xi)**2
    const N3 = 3*xi**2 - 2*xi**3
    const N4h = Le * xi**2 * (xi - 1)
    delta.push(-(N1*v1 + N2h*t1 + N3*v2 + N4h*t2))  // positive = downward
  }

  const maxM = Math.max(...M), minM = Math.min(...M)
  const maxV = Math.max(...V), minV = Math.min(...V)
  const maxDelta = Math.max(...delta.map(Math.abs))
  const xMaxM = xArr[M.indexOf(maxM)]
  const xMinM = xArr[M.indexOf(minM)]
  const xMaxDelta = xArr[delta.map(Math.abs).indexOf(maxDelta)]

  // Design utilization
  const util = computeBeamUtilization(material, sectionId, maxM, minM, maxV, maxDelta, L)

  return { x: xArr, V, M, delta, reactions, maxM, xMaxM, minM, xMinM, maxV, minV, maxDelta, xMaxDelta, EI, L, utilization: util }
}

function computeBeamUtilization(
  material: 'steel' | 'concrete', sectionId: string,
  maxM: number, minM: number, maxV: number, maxDelta: number, L: number
) {
  const absMmax = Math.max(Math.abs(maxM), Math.abs(minM))

  if (material === 'steel') {
    const s = getSteelSection(sectionId)
    if (!s) return { moment: 0, shear: 0, deflection: 0 }
    const phiMn = 0.9 * STEEL_MATERIAL.Fy * s.Zx * 1e-6
    const phiVn = 0.9 * 0.6 * STEEL_MATERIAL.Fy * s.d * s.tw * 1e-3
    const L240 = L / 240
    return {
      moment: absMmax / Math.max(phiMn, 0.001),
      shear: Math.abs(maxV) / Math.max(phiVn, 0.001),
      deflection: maxDelta / Math.max(L240, 0.001),
    }
  } else {
    const s = getConcreteSection(sectionId)
    if (!s) return { moment: 0, shear: 0, deflection: 0 }
    const dEff = s.h - s.cover - 10
    const phiMn = 0.9 * s.As * s.fy * (dEff - s.As * s.fy / (1.7 * s.fc * s.b)) * 1e-6
    const phiVn = 0.9 * (0.17 * Math.sqrt(s.fc) * s.b * dEff) * 1e-3
    const L360 = L / 360
    return {
      moment: absMmax / Math.max(phiMn, 0.001),
      shear: Math.abs(maxV) / Math.max(phiVn, 0.001),
      deflection: maxDelta / Math.max(L360, 0.001),
    }
  }
}
