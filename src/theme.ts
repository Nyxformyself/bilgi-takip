export const colors = {
  bg: '#0B0910',
  card: '#17141F',
  cardAlt: '#1E1A2B',
  text: '#F2EFF7',
  subtext: '#8E88A0',
  border: '#2A2438',
  primary: '#A78BFA',
  primarySoft: 'rgba(167,139,250,0.16)',
  income: '#4ADE80',
  incomeSoft: 'rgba(74,222,128,0.12)',
  expense: '#FB7185',
  expenseSoft: 'rgba(251,113,133,0.12)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.12)',
  chart: [
    '#A78BFA',
    '#FBBF24',
    '#4ADE80',
    '#FB7185',
    '#22D3EE',
    '#818CF8',
    '#F472B6',
    '#A3E635',
    '#94A3B8',
  ],
};

export const shadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.45,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};

export const glow = {
  shadowColor: '#A78BFA',
  shadowOpacity: 0.5,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
};

export const navTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.expense,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};
