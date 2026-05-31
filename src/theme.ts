// Design token system — Material Design 3 naming conventions.
// Custom tokens (graph-specific) follow the same pattern where MD3 has no equivalent.

export interface Theme {
  name: 'dark' | 'light';

  // ── MD3 Surface tokens ─────────────────────────────────────────────────────
  surface: string;                  // main app background
  surfaceContainer: string;         // card / panel background
  surfaceContainerHighest: string;  // topmost overlay surfaces

  // ── MD3 Border tokens ─────────────────────────────────────────────────────
  outline: string;                  // standard border
  outlineVariant: string;           // subtle border

  // ── MD3 Content tokens ────────────────────────────────────────────────────
  onSurface: string;                // primary text / icons on surface
  onSurfaceVariant: string;         // secondary text
  onSurfaceMuted: string;           // muted / tertiary text (no direct MD3 equiv)
  scrim: string;                    // MD3 scrim — very dim overlay / almost invisible text

  // ── MD3 Accent tokens ─────────────────────────────────────────────────────
  primary: string;                  // primary brand color

  // ── Custom graph tokens ───────────────────────────────────────────────────
  outgoing: string;                 // outgoing edge: musician → their hero
  incoming: string;                 // incoming edge: students who cited them
  nodeSurface: string;              // node fill
  nodeOutline: string;              // default node ring
  edgeDefault: string;
  edgeDimmed: string;
  edgeDimmedArrow: string;

  // ── Typography ────────────────────────────────────────────────────────────
  fontSans: string;
  fontSerif: string;
  fontMono: string;
}

// Palette: #141413 "Distinctive Lack of Hue" · #272727 "Dire Wolf"
// #8B8A87 "Heavy Rain" · #C1C1A9 "Swing Sage" · #E3E2C3 "Healing Springs"
export const darkTheme: Theme = {
  name: 'dark',

  surface:                 '#141413',
  surfaceContainer:        '#1e1e1c',
  surfaceContainerHighest: 'rgba(20, 20, 19, 0.97)',

  outline:        '#323230',
  outlineVariant: '#252523',

  onSurface:        '#e3e2c3',
  onSurfaceVariant: '#c1c1a9',
  onSurfaceMuted:   '#8b8a87',
  scrim:            '#454542',

  primary:  '#c8ca42',
  outgoing: '#c8a93a',
  incoming: '#9b7fe8',

  nodeSurface:     '#1a1a18',
  nodeOutline:     '#4a4a47',
  edgeDefault:     '#3a3a38',
  edgeDimmed:      '#1e1e1c',
  edgeDimmedArrow: '#181816',

  fontSans:  "'Poppins', system-ui, sans-serif",
  fontSerif: "'Newsreader', Georgia, serif",
  fontMono:  "'Space Mono', ui-monospace, monospace",
};

// Light theme — folk-llm warm paper palette
export const lightTheme: Theme = {
  name: 'light',

  surface:                 '#f0ebe0',
  surfaceContainer:        '#faf6f0',
  surfaceContainerHighest: 'rgba(240, 235, 224, 0.97)',

  outline:        '#d8d0c0',
  outlineVariant: '#e8e0d0',

  onSurface:        '#1a1810',
  onSurfaceVariant: '#4a4038',
  onSurfaceMuted:   '#8a8070',
  scrim:            '#c8c0b0',

  primary:  '#c0392b',
  outgoing: '#c0392b',
  incoming: '#7c5cbf',

  nodeSurface:     '#faf6f0',
  nodeOutline:     '#a09888',
  edgeDefault:     '#bdb5a5',
  edgeDimmed:      '#ddd8ce',
  edgeDimmedArrow: '#d0c8b8',

  fontSans:  "'Poppins', system-ui, sans-serif",
  fontSerif: "'Newsreader', Georgia, serif",
  fontMono:  "'Space Mono', ui-monospace, monospace",
};
