// Design token system — swap themes by passing a different Theme object.
// Font stack matches folk-llm (Poppins / Newsreader / Space Mono).

export interface Theme {
  name: 'dark' | 'light';

  // Backgrounds
  bgBase: string;
  bgSurface: string;
  bgOverlay: string;

  // Borders
  borderBase: string;
  borderSubtle: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;

  // Accents
  accentPrimary: string; // header / selected node label
  accentOut: string;     // outgoing edge: musician → their hero
  accentIn: string;      // incoming edge: students who cited them

  // Graph chrome
  nodeFill: string;
  nodeStroke: string;   // default (unselected) ring
  edgeDefault: string;
  edgeDim: string;
  edgeDimArrow: string;

  // Fonts
  fontSans: string;
  fontSerif: string;
  fontMono: string;
}

// Palette derived from the dark music app reference:
// #141413 "Distinctive Lack of Hue" · #272727 "Dire Wolf"
// #6A6A67 "Iron-ic" · #8B8A87 "Heavy Rain"
// #C1C1A9 "Swing Sage" · #E3E2C3 "Healing Springs"
// Yellow-green accent from the upload button (#C8CA42)
export const darkTheme: Theme = {
  name: 'dark',

  bgBase:    '#141413',
  bgSurface: '#1e1e1c',
  bgOverlay: 'rgba(20, 20, 19, 0.97)',

  borderBase:   '#323230',
  borderSubtle: '#252523',

  textPrimary:   '#e3e2c3', // Healing Springs — warm sage
  textSecondary: '#c1c1a9', // Swing Sage
  textMuted:     '#8b8a87', // Heavy Rain
  textDim:       '#454542', // Iron-ic (dark)

  accentPrimary: '#c8ca42', // yellow-green — header, selected node
  accentOut:     '#c8a93a', // warm gold — outgoing (studied)
  accentIn:      '#9b7fe8', // purple — incoming (cited by)

  nodeFill:     '#1a1a18',
  nodeStroke:   '#4a4a47',
  edgeDefault:  '#3a3a38',
  edgeDim:      '#1e1e1c',
  edgeDimArrow: '#181816',

  fontSans:  "'Poppins', system-ui, sans-serif",
  fontSerif: "'Newsreader', Georgia, serif",
  fontMono:  "'Space Mono', ui-monospace, monospace",
};

// Light theme mirrors folk-llm's warm paper palette
export const lightTheme: Theme = {
  name: 'light',

  bgBase:    '#f0ebe0',
  bgSurface: '#faf6f0',
  bgOverlay: 'rgba(240, 235, 224, 0.97)',

  borderBase:   '#d8d0c0',
  borderSubtle: '#e8e0d0',

  textPrimary:   '#1a1810',
  textSecondary: '#4a4038',
  textMuted:     '#8a8070',
  textDim:       '#c8c0b0',

  accentPrimary: '#c0392b', // folk-llm red
  accentOut:     '#c0392b',
  accentIn:      '#7c5cbf', // purple darkened for light bg

  nodeFill:     '#faf6f0',
  nodeStroke:   '#a09888',
  edgeDefault:  '#bdb5a5',
  edgeDim:      '#ddd8ce',
  edgeDimArrow: '#d0c8b8',

  fontSans:  "'Poppins', system-ui, sans-serif",
  fontSerif: "'Newsreader', Georgia, serif",
  fontMono:  "'Space Mono', ui-monospace, monospace",
};
