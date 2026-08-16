export const theme = {
  bg: '#0B0E14',
  bgElevated: '#151A24',
  card: '#1C2331',
  text: '#F5F7FA',
  textDim: '#8B97A8',
  accent: '#4ADE80',
  accentDim: '#166534',
  danger: '#F87171',
  dangerDim: '#7F1D1D',
  border: '#2A3444',
} as const;

export const radius = { sm: 8, md: 14, lg: 22 } as const;

/** 1,234,567 — grouped digits are far easier to compare at a glance. */
export function formatValue(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
