/**
 * Column design module.
 * RC: P-M interaction diagram (ACI 318)
 * Steel: AISC H1 interaction check + Euler compression
 */
import { getSteelSection, getConcreteSection, STEEL_MATERIAL } from '../data/sections'

export interface PMPoint { P: number; M: number }   // kN, kN·m (both positive)

// ─── Steel column ────────────────────────────────────────────────────────────

export interface SteelColumnResult {
  phiPn_tension: number    // kN
  phiPn_compression: number // kN (accounts for buckling)
  phiMnx: number           // kN·m
  phiMny: number           // kN·m
  lambda_c: number         // slenderness ratio KL/r
  ratio_H1: number         // AISC H1 interaction ratio (≤1.0 OK)
  status: 'OK' | 'NG'
  interaction: PMPoint[]   // H1 envelope for plotting
}

export function designSteelColumn(
  sectionId: string,
  Pu: number, Mux: number, _Muy: number,
  L: number, Kx = 1.0, Ky = 1.0
): SteelColumnResult {
  const s = getSteelSection(sectionId)
  if (!s) return { phiPn_tension: 0, phiPn_compression: 0, phiMnx: 0, phiMny: 0, lambda_c: 0, ratio_H1: 0, status: 'NG', interaction: [] }

  const Fy = STEEL_MATERIAL.Fy   // MPa
  const E  = STEEL_MATERIAL.E    // MPa
  const phi_c = 0.90, phi_b = 0.90

  const phiPn_tension = phi_c * Fy * s.A * 1e-3   // kN

  // Euler compression
  const KL_r = Math.max(Kx * L * 1000 / s.rx, Ky * L * 1000 / (s.rx * 0.7))   // approx ry≈0.7rx for W-shapes
  const Fe = Math.PI**2 * E / KL_r**2   // MPa (Euler)
  const Fcr = KL_r / (Math.sqrt(E / Fy) * Math.PI) <= 1.5
    ? (0.658 ** (Fy / Fe)) * Fy
    : (0.877 / (KL_r / (Math.PI * Math.sqrt(E / Fy)))**2) * Fy

  const phiPn_compression = phi_c * Fcr * s.A * 1e-3  // kN

  const phiMnx = phi_b * Fy * s.Zx * 1e-6   // kN·m (plastic)
  const phiMny = phi_b * Fy * (s.Ix / (s.bf / 2)) * 1e-6   // kN·m (elastic approx for minor axis)

  const phiPn = Math.min(phiPn_tension, phiPn_compression)

  const ratio_H1 = Pu / phiPn >= 0.2
    ? Pu / phiPn + (8 / 9) * (Mux / Math.max(phiMnx, 0.001))
    : Pu / (2 * phiPn) + Mux / Math.max(phiMnx, 0.001)

  // Interaction envelope (AISC H1)
  const nPts = 50
  const interaction: PMPoint[] = []
  for (let i = 0; i <= nPts; i++) {
    const p = phiPn * (i / nPts)
    const mAllowed = p / phiPn >= 0.2
      ? phiMnx * Math.max(0, 1 - p / phiPn) * (9 / 8)
      : phiMnx * (1 - p / (2 * phiPn))
    interaction.push({ P: p, M: Math.max(0, mAllowed) })
  }

  return { phiPn_tension, phiPn_compression, phiMnx, phiMny, lambda_c: KL_r, ratio_H1, status: ratio_H1 <= 1.0 ? 'OK' : 'NG', interaction }
}

// ─── RC column ───────────────────────────────────────────────────────────────

export interface RCColumnResult {
  interaction: PMPoint[]    // factored (φP, φM) curve
  phiPn0: number           // pure compression
  phiMn0: number           // pure bending
  Pbalanced: number
  Mbalanced: number
  ratio: number            // (Pu, Mu) vs capacity → min distance ratio ≤ 1
  status: 'OK' | 'NG'
}

export function designRCColumn(
  sectionId: string,
  Pu: number, Mu: number
): RCColumnResult {
  const s = getConcreteSection(sectionId)
  if (!s) return { interaction: [], phiPn0: 0, phiMn0: 0, Pbalanced: 0, Mbalanced: 0, ratio: 0, status: 'NG' }

  const { b, h, cover: d_prime, fc, fy } = s
  const As = s.As / 2    // mm² each face (symmetric)
  const Es = 200000      // MPa
  const eps_y = fy / Es
  const beta1 = fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 28) / 7)

  const interaction: PMPoint[] = []
  const nPts = 80

  for (let k = 0; k <= nPts; k++) {
    // Vary neutral axis depth c from tiny to large
    const c = (k === 0 ? 0.001 : k / nPts) * h * 2.5 + 0.001

    const a = Math.min(beta1 * c, h)
    const Cc = 0.85 * fc * a * b   // N

    // Top steel (compression face, at d')
    const eps_s_top = 0.003 * (c - d_prime) / c
    const fs_top = Math.max(-fy, Math.min(fy, eps_s_top * Es))
    const Cs_top = As * fs_top - (c > d_prime ? 0.85 * fc * As : 0)  // N, subtract displaced concrete

    // Bottom steel (tension face, at h-d')
    const eps_s_bot = 0.003 * (c - (h - d_prime)) / c
    const fs_bot = Math.max(-fy, Math.min(fy, eps_s_bot * Es))
    const Cs_bot = As * fs_bot    // N (negative = tension)

    const P = (Cc + Cs_top + Cs_bot) * 1e-3    // kN, compression positive
    const M = (Cc * (h/2 - a/2) + Cs_top * (h/2 - d_prime) - Cs_bot * (h/2 - d_prime)) * 1e-6  // kN·m

    // φ factor (ACI 21.2)
    const eps_t = -eps_s_bot  // tensile strain at tension steel
    const phi = eps_t >= 0.005 ? 0.90
              : eps_t <= eps_y ? 0.65
              : 0.65 + 0.25 * (eps_t - eps_y) / (0.005 - eps_y)

    const phiP = Math.max(phi * P, 0)   // can't have negative (tensile) column in this model
    const phiM = Math.abs(phi * M)

    if (phiP >= 0) interaction.push({ P: phiP, M: phiM })
  }

  // Cap at φ*0.80*(0.85*fc*(Ag-Ast)+fy*Ast) for pure compression
  const Ag = b * h, Ast = s.As
  const phiPn0 = 0.65 * 0.80 * (0.85 * fc * (Ag - Ast) + fy * Ast) * 1e-3
  const phiMn0 = interaction.reduce((max, pt) => pt.M > max ? pt.M : max, 0)

  // Find balanced point (max M on curve)
  const balanced = interaction.reduce((best, pt) => pt.M > best.M ? pt : best, { P: 0, M: 0 })

  // Check if (Pu, Mu) is inside curve
  const ratio = checkInsideCurve(interaction, Pu, Mu)

  return { interaction, phiPn0, phiMn0, Pbalanced: balanced.P, Mbalanced: balanced.M, ratio, status: ratio <= 1.0 ? 'OK' : 'NG' }
}

/** Returns the demand/capacity ratio by scaling (Pu,Mu) toward origin */
function checkInsideCurve(curve: PMPoint[], Pu: number, Mu: number): number {
  if (curve.length < 2) return 1.0
  // Find the point on the curve where ray from origin through (Pu,Mu) intersects
  // Use angle-based approach
  if (Mu < 0.001) {
    const maxP = Math.max(...curve.map(p => p.P))
    return Pu / Math.max(maxP, 0.001)
  }
  // Scale factor: find intersection of line from origin through (Pu,Mu) with curve
  let minScale = 1e9
  for (let i = 0; i < curve.length - 1; i++) {
    const { P: P1, M: M1 } = curve[i]
    const { P: P2, M: M2 } = curve[i + 1]
    // Parametric: curve(t) = (P1+t*(P2-P1), M1+t*(M2-M1))
    // Ray: (s*Pu, s*Mu)
    // s*Pu = P1 + t*(P2-P1) → s = (P1 + t*(P2-P1)) / Pu
    // s*Mu = M1 + t*(M2-M1)
    const denom = Mu * (P2 - P1) - Pu * (M2 - M1)
    if (Math.abs(denom) < 1e-9) continue
    const t = (Mu * P1 - Pu * M1) / denom
    if (t < -0.001 || t > 1.001) continue
    const s = Mu > 0.001 ? (M1 + t * (M2 - M1)) / Mu : 0
    if (s > 0) minScale = Math.min(minScale, s)
  }
  return minScale >= 1e8 ? 1.5 : Pu / (minScale * Pu || 0.001) // ratio = demand/capacity
}
