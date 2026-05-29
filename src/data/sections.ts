import type { SteelSection, ConcreteSection } from '../types/structure'

// AISC W-shapes (selected common sections)
// A[mm²], Ix[mm⁴], Iy[mm⁴], Sx[mm³], Zx[mm³], rx[mm], d[mm], bf[mm], tf[mm], tw[mm], W[kg/m]
export const STEEL_SECTIONS: SteelSection[] = [
  { id: 'W4x13',   designation: 'W4x13',   A: 2480,  Ix: 8.49e6,   Iy: 1.27e6,  Sx: 60.8e3,  Zx: 68.0e3,  rx: 41.7,  d: 106, bf: 103, tf: 6.9, tw: 7.5, W: 19.3 },
  { id: 'W6x15',   designation: 'W6x15',   A: 2840,  Ix: 21.8e6,   Iy: 3.35e6,  Sx: 115e3,   Zx: 131e3,   rx: 62.0,  d: 152, bf: 152, tf: 6.7, tw: 5.8, W: 22.3 },
  { id: 'W8x18',   designation: 'W8x18',   A: 3420,  Ix: 47.9e6,   Iy: 7.23e6,  Sx: 186e3,   Zx: 209e3,   rx: 83.8,  d: 207, bf: 133, tf: 8.4, tw: 5.8, W: 26.8 },
  { id: 'W8x31',   designation: 'W8x31',   A: 5890,  Ix: 86.8e6,   Iy: 17.7e6,  Sx: 310e3,   Zx: 356e3,   rx: 83.8,  d: 210, bf: 203, tf: 11.0, tw: 7.2, W: 46.1 },
  { id: 'W10x22',  designation: 'W10x22',  A: 4160,  Ix: 98.5e6,   Iy: 7.93e6,  Sx: 298e3,   Zx: 336e3,   rx: 104,   d: 257, bf: 102, tf: 9.7, tw: 6.1, W: 32.7 },
  { id: 'W10x33',  designation: 'W10x33',  A: 6240,  Ix: 170e6,    Iy: 36.7e6,  Sx: 480e3,   Zx: 549e3,   rx: 104,   d: 247, bf: 203, tf: 11.0, tw: 7.4, W: 49.1 },
  { id: 'W10x49',  designation: 'W10x49',  A: 9290,  Ix: 280e6,    Iy: 93.2e6,  Sx: 690e3,   Zx: 793e3,   rx: 109,   d: 253, bf: 254, tf: 14.3, tw: 9.1, W: 72.8 },
  { id: 'W12x26',  designation: 'W12x26',  A: 4940,  Ix: 204e6,    Iy: 11.7e6,  Sx: 533e3,   Zx: 604e3,   rx: 128,   d: 310, bf: 165, tf: 9.7, tw: 5.8, W: 38.7 },
  { id: 'W12x40',  designation: 'W12x40',  A: 7580,  Ix: 348e6,    Iy: 44.8e6,  Sx: 801e3,   Zx: 913e3,   rx: 135,   d: 303, bf: 203, tf: 13.1, tw: 7.5, W: 59.5 },
  { id: 'W12x58',  designation: 'W12x58',  A: 11000, Ix: 562e6,    Iy: 134e6,   Sx: 1160e3,  Zx: 1322e3,  rx: 142,   d: 311, bf: 254, tf: 16.3, tw: 9.1, W: 86.5 },
  { id: 'W14x30',  designation: 'W14x30',  A: 5680,  Ix: 378e6,    Iy: 12.4e6,  Sx: 831e3,   Zx: 942e3,   rx: 147,   d: 354, bf: 171, tf: 9.7, tw: 6.9, W: 44.6 },
  { id: 'W14x48',  designation: 'W14x48',  A: 9100,  Ix: 660e6,    Iy: 68.1e6,  Sx: 1270e3,  Zx: 1434e3,  rx: 155,   d: 351, bf: 203, tf: 14.3, tw: 7.6, W: 71.5 },
  { id: 'W14x68',  designation: 'W14x68',  A: 12900, Ix: 1010e6,   Iy: 186e6,   Sx: 1730e3,  Zx: 1960e3,  rx: 160,   d: 360, bf: 254, tf: 18.0, tw: 10.0, W: 101 },
  { id: 'W14x99',  designation: 'W14x99',  A: 18700, Ix: 1600e6,   Iy: 528e6,   Sx: 2530e3,  Zx: 2860e3,  rx: 167,   d: 376, bf: 305, tf: 19.6, tw: 11.2, W: 147 },
  { id: 'W16x31',  designation: 'W16x31',  A: 5890,  Ix: 565e6,    Iy: 11.7e6,  Sx: 1100e3,  Zx: 1230e3,  rx: 163,   d: 403, bf: 140, tf: 11.2, tw: 7.0, W: 46.1 },
  { id: 'W16x40',  designation: 'W16x40',  A: 7580,  Ix: 748e6,    Iy: 32.7e6,  Sx: 1380e3,  Zx: 1560e3,  rx: 166,   d: 397, bf: 178, tf: 12.8, tw: 7.5, W: 59.5 },
  { id: 'W18x35',  designation: 'W18x35',  A: 6640,  Ix: 852e6,    Iy: 12.7e6,  Sx: 1490e3,  Zx: 1680e3,  rx: 179,   d: 450, bf: 152, tf: 10.8, tw: 7.6, W: 52.1 },
  { id: 'W18x50',  designation: 'W18x50',  A: 9480,  Ix: 1270e6,   Iy: 35.7e6,  Sx: 2010e3,  Zx: 2270e3,  rx: 183,   d: 457, bf: 190, tf: 14.5, tw: 9.0, W: 74.3 },
  { id: 'W21x44',  designation: 'W21x44',  A: 8390,  Ix: 1640e6,   Iy: 17.8e6,  Sx: 2330e3,  Zx: 2620e3,  rx: 203,   d: 525, bf: 165, tf: 11.4, tw: 9.1, W: 65.5 },
  { id: 'W21x57',  designation: 'W21x57',  A: 10800, Ix: 2200e6,   Iy: 36.7e6,  Sx: 2890e3,  Zx: 3260e3,  rx: 206,   d: 536, bf: 166, tf: 13.3, tw: 10.3, W: 84.5 },
  { id: 'W24x55',  designation: 'W24x55',  A: 10500, Ix: 3010e6,   Iy: 23.1e6,  Sx: 3680e3,  Zx: 4160e3,  rx: 231,   d: 599, bf: 178, tf: 12.8, tw: 9.7, W: 81.6 },
  { id: 'W24x76',  designation: 'W24x76',  A: 14400, Ix: 4170e6,   Iy: 81.6e6,  Sx: 4690e3,  Zx: 5280e3,  rx: 237,   d: 612, bf: 229, tf: 15.2, tw: 11.2, W: 113 },
  { id: 'W30x90',  designation: 'W30x90',  A: 17100, Ix: 9630e6,   Iy: 63.3e6,  Sx: 9530e3,  Zx: 10700e3, rx: 274,   d: 762, bf: 267, tf: 16.0, tw: 9.5, W: 134 },
  { id: 'W33x118', designation: 'W33x118', A: 22400, Ix: 17400e6,  Iy: 165e6,   Sx: 15800e3, Zx: 17500e3, rx: 312,   d: 855, bf: 292, tf: 18.8, tw: 10.5, W: 176 },
]

// Rectangular concrete sections
export const CONCRETE_SECTIONS: ConcreteSection[] = [
  { id: 'C200x400', designation: '200x400 mm',  b: 200, h: 400,  cover: 40, fc: 28, fy: 415, As: 1520 },
  { id: 'C250x450', designation: '250x450 mm',  b: 250, h: 450,  cover: 40, fc: 28, fy: 415, As: 1900 },
  { id: 'C300x500', designation: '300x500 mm',  b: 300, h: 500,  cover: 40, fc: 32, fy: 415, As: 2400 },
  { id: 'C300x600', designation: '300x600 mm',  b: 300, h: 600,  cover: 40, fc: 32, fy: 415, As: 3060 },
  { id: 'C350x600', designation: '350x600 mm',  b: 350, h: 600,  cover: 40, fc: 32, fy: 415, As: 3560 },
  { id: 'C400x700', designation: '400x700 mm',  b: 400, h: 700,  cover: 50, fc: 35, fy: 415, As: 5030 },
  { id: 'C400x800', designation: '400x800 mm',  b: 400, h: 800,  cover: 50, fc: 35, fy: 415, As: 6030 },
  { id: 'C500x900', designation: '500x900 mm',  b: 500, h: 900,  cover: 50, fc: 40, fy: 415, As: 8480 },
]

export const STEEL_MATERIAL = { E: 200000, Fy: 250, Fu: 400, G: 77000 }  // MPa
export const CONCRETE_MATERIAL = { E: (fc: number) => 4700 * Math.sqrt(fc), fc: 28, fy: 415 }

export function getSteelSection(id: string): SteelSection | undefined {
  return STEEL_SECTIONS.find(s => s.id === id)
}

export function getConcreteSection(id: string): ConcreteSection | undefined {
  return CONCRETE_SECTIONS.find(s => s.id === id)
}
