// Griddy SVG icons — pixel-grid aligned, stroke-based, no rounded caps.
// All icons use currentColor so they inherit from parent text color.

interface IconProps {
  size?: number;
  style?: React.CSSProperties;
}

export function IconExternalLink({ size = 12, style }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M7 3H3v10h10V9" />
      <path d="M10 2h4v4" />
      <path d="M14 2L8 8" />
    </svg>
  );
}

export function IconArrowRight({ size = 12, style }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M2 8h12" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  );
}

export function IconArrowLeft({ size = 12, style }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M14 8H2" />
      <path d="M7 4L3 8l4 4" />
    </svg>
  );
}

export function IconArrowUp({ size = 12, style }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M8 14V2" />
      <path d="M4 7l4-4 4 4" />
    </svg>
  );
}

export function IconArrowDown({ size = 12, style }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M8 2v12" />
      <path d="M4 9l4 4 4-4" />
    </svg>
  );
}

export function IconMenu({ size = 16, style }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

export function IconClose({ size = 14, style }: IconProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="square" strokeLinejoin="miter"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d="M2 2l12 12M14 2L2 14" />
    </svg>
  );
}

// Key cap badge, e.g. <KeyHint k="←" />
export function KeyHint({ k }: { k: string }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Mono', monospace",
      fontSize: 9, lineHeight: 1,
      padding: '2px 4px',
      border: '1px solid #1f2937',
      borderBottom: '2px solid #1f2937',
      borderRadius: 3,
      background: '#0d1420',
      color: '#4b5563',
      userSelect: 'none',
    }}>
      {k}
    </kbd>
  );
}
