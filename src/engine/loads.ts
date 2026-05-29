import type { LoadCase } from '../types/structure'

export interface LoadCombination {
  name: string
  code: string
  factors: Record<LoadCase, number>
}

// ASCE 7-22 LRFD combinations (simplified)
export const LRFD_COMBINATIONS: LoadCombination[] = [
  { name: '1.4D',            code: 'LRFD-1', factors: { dead: 1.4, live: 0,   wind: 0,   seismic: 0   } },
  { name: '1.2D + 1.6L',    code: 'LRFD-2', factors: { dead: 1.2, live: 1.6, wind: 0,   seismic: 0   } },
  { name: '1.2D + 1.0W + L',code: 'LRFD-3', factors: { dead: 1.2, live: 1.0, wind: 1.0, seismic: 0   } },
  { name: '0.9D + 1.0W',    code: 'LRFD-4', factors: { dead: 0.9, live: 0,   wind: 1.0, seismic: 0   } },
  { name: '1.2D + 1.0E + L',code: 'LRFD-5', factors: { dead: 1.2, live: 1.0, wind: 0,   seismic: 1.0 } },
  { name: '0.9D + 1.0E',    code: 'LRFD-6', factors: { dead: 0.9, live: 0,   wind: 0,   seismic: 1.0 } },
]

// ASD combinations
export const ASD_COMBINATIONS: LoadCombination[] = [
  { name: 'D',         code: 'ASD-1', factors: { dead: 1.0, live: 0,   wind: 0,   seismic: 0   } },
  { name: 'D + L',     code: 'ASD-2', factors: { dead: 1.0, live: 1.0, wind: 0,   seismic: 0   } },
  { name: 'D + W',     code: 'ASD-3', factors: { dead: 1.0, live: 0,   wind: 1.0, seismic: 0   } },
  { name: 'D + L + W', code: 'ASD-4', factors: { dead: 1.0, live: 1.0, wind: 0.75, seismic: 0  } },
  { name: 'D + E',     code: 'ASD-5', factors: { dead: 1.0, live: 0,   wind: 0,   seismic: 0.7 } },
]

export const ALL_COMBINATIONS = [...LRFD_COMBINATIONS, ...ASD_COMBINATIONS]
