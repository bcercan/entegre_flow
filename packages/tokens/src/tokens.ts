/**
 * Platform-neutral token values.
 *
 * Web consumes `tokens.css` (CSS variables, OKLCH + color-mix). This TS map is
 * the bridge for non-CSS targets (React Native / Tauri native shells), which
 * resolve a flat palette. Keep names in lockstep with `tokens.css`.
 */

export const radii = {
  sm: 6,
  md: 8,
  lg: 11,
  pill: 999,
} as const;

export const density = {
  comfortable: { pad: 16, padSm: 12, gap: 12, rowPy: 13, fz: 14, lh: 1.55 },
  compact: { pad: 10, padSm: 6, gap: 8, rowPy: 5, fz: 12.5, lh: 1.45 },
} as const;

export const fonts = {
  sans: '"Plus Jakarta Sans", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

/** Semantic color tokens. `oklch(...)` strings are CSS; RN needs resolved hex (TODO P3). */
export const colors = {
  light: {
    accent: "#2563eb",
    ai: "#6d5ae6",
    bg: "oklch(0.968 0.004 255)",
    surface: "oklch(1 0 0)",
    surface2: "oklch(0.985 0.003 255)",
    surface3: "oklch(0.955 0.005 255)",
    border: "oklch(0.915 0.006 255)",
    text: "oklch(0.27 0.012 262)",
    text2: "oklch(0.46 0.013 262)",
    text3: "oklch(0.62 0.011 262)",
    ok: "#16936c",
    warn: "#c5790b",
    danger: "#d1453b",
  },
  dark: {
    accent: "#2563eb",
    ai: "#8b7bf0",
    bg: "oklch(0.175 0.012 263)",
    surface: "oklch(0.215 0.014 264)",
    surface2: "oklch(0.245 0.015 264)",
    surface3: "oklch(0.285 0.017 264)",
    border: "oklch(0.32 0.016 264)",
    text: "oklch(0.955 0.005 255)",
    text2: "oklch(0.78 0.012 258)",
    text3: "oklch(0.62 0.014 260)",
    ok: "#16936c",
    warn: "#c5790b",
    danger: "#d1453b",
  },
} as const;

export type AccentColorId = "blue" | "purple" | "emerald" | "amber" | "rose" | "teal";

export interface AccentOption {
  id: AccentColorId;
  label: string;
  light: string;
  dark: string;
}

export const accentColors: AccentOption[] = [
  { id: "blue", label: "Mavi", light: "#0f6cbd", dark: "#479ef5" },
  { id: "purple", label: "Mor", light: "#7c3aed", dark: "#a78bfa" },
  { id: "emerald", label: "Zümrüt", light: "#059669", dark: "#34d399" },
  { id: "amber", label: "Amber", light: "#d97706", dark: "#fbbf24" },
  { id: "rose", label: "Gül", light: "#e11d48", dark: "#fb7185" },
  { id: "teal", label: "Turkuaz", light: "#0891b2", dark: "#22d3ee" },
];

/** Accent presets surfaced as tenant-selectable options (from the prototype). */
export const accentPresets = ["#2563eb", "#6d5ae6", "#0e9e8e", "#1f8a5b", "#c2410c"] as const;

export type ThemeMode = keyof typeof colors;
export type DensityMode = keyof typeof density;
export type ColorToken = keyof typeof colors.light;
