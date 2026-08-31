// GiveAll design tokens. Mirrors docs/05-design-tokens.md — keep both in
// sync if either changes. React Native doesn't take letterSpacing/fontSize
// as CSS shorthand strings, so numeric values here vs. the docs' "32px" etc.

export const colors = {
  // Darkened from the original #FF6B5B — that coral was only 2.66-2.80:1
  // against background/surface, failing WCAG AA both as the ~15 inline
  // link/kicker text colors across every screen (needs 4.5:1) and as the
  // solid CTA button background under white text (also needs 4.5:1 at
  // body-text size). This shade clears 4.75:1+ in every role it's used —
  // same hue family, shifted toward rust/brick rather than bright coral.
  primary: '#B34B40',
  primaryLight: '#FF8E7A',
  primaryDark: '#E85A4A',
  secondary: '#FFC857',
  secondaryLight: '#FFD97A',
  background: '#FFF8F0',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF1E6',
  textPrimary: '#2D2A26',
  // Darkened from the original #8C7E77 — that shade was only 3.72:1 against
  // `background`, below WCAG AA's 4.5:1 for normal text (this color labels
  // captions/secondary copy at 12-15px, not large text). This shade clears
  // 4.5:1 against background, surface, and surfaceAlt alike.
  textSecondary: '#776B65',
  textInverse: '#FFFFFF',
  success: '#A8D8B9',
  // `success` itself is a pale badge-fill color (correct as a background
  // under dark text, e.g. bids.tsx's "toward" button) — using it directly
  // as TEXT color on a light background was only 1.51:1, badly failing AA.
  // Found reading curiosity.tsx's and partner.tsx's "success" messages
  // during a UX pass; both were using `success` as a text color. This is
  // the same hue, darkened to actually be readable as text (5.16:1+).
  successText: '#546C5D',
  warning: '#FFC857',
  error: '#B34B40', // kept equal to `primary` — unused elsewhere, but would inherit the same contrast fix if that changes
  border: '#FFE4E1',
  blush: '#FFE4E1',
  sage: '#A8D8B9',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  full: 9999,
} as const;

// Google Fonts family names as loaded via @expo-google-fonts/inter in
// app/_layout.tsx's useFonts call — see typography below for which weight
// maps to which named family.
export const fontFamily = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export const typography = {
  heading1: { fontFamily: fontFamily.extraBold, fontSize: 32, lineHeight: 36 },
  heading2: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.semiBold, fontSize: 12, letterSpacing: 0.8 },
} as const;

export const button = {
  height: 52,
  radius: radius.md,
};

export const card = {
  radius: radius.lg,
  shadow: {
    shadowColor: 'rgba(45,42,38,0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 1,
    elevation: 4, // Android shadow approximation
  },
};
