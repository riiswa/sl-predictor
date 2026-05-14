export const PHASES = [
    { key: 'mu', name: 'Muscle-up', color: '#D85A30', textColor: '#712B13' },
    { key: 'pu', name: 'Pull-up',   color: '#378ADD', textColor: '#0C447C' },
    { key: 'di', name: 'Dips',      color: '#7F77DD', textColor: '#3C3489' },
    { key: 'sq', name: 'Squat',     color: '#1D9E75', textColor: '#085041' },
] as const

export type PhaseKey = typeof PHASES[number]['key']
