import { useState, useRef, useEffect } from 'react';
import { musicians } from './data/musicians';
import { designers } from './data/designers';
import { TimelineGraph } from './components/TimelineGraph';
import { darkTheme } from './theme';
import { IconMenu } from './components/Icons';

const T = darkTheme;

type Dataset = 'jazz' | 'design';

const DATASETS: Record<Dataset, { label: string; subtitle: string; data: typeof musicians }> = {
  jazz: {
    label: 'Jazz Saxophone',
    subtitle: 'Jazz Saxophonists and Their Sources of Inspiration',
    data: musicians,
  },
  design: {
    label: 'UX & Design',
    subtitle: 'UX and Product Design Pioneers and Their Sources of Inspiration',
    data: designers,
  },
};

export default function App() {
  const [dataset, setDataset]       = useState<Dataset>('jazz');
  const [menuOpen, setMenuOpen]     = useState(false);
  const [headerHeight, setHeaderHeight] = useState(60);
  const menuRef   = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const current = DATASETS[dataset];

  // Measure header height so the bio card can clear it on mobile
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    ro.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: T.surface, overflow: 'hidden',
    }}>
      <header ref={headerRef} style={{
        padding: '10px 20px',
        borderBottom: `1px solid ${T.outline}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Title + subtitle in one row */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{
            margin: 0,
            color: T.onSurface,
            fontSize: 15,
            fontFamily: T.fontSans,
            fontWeight: 700,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}>
            Who are our Heroes Heroes?
          </h1>
          <span style={{ color: T.onSurfaceMuted, fontSize: 11, fontFamily: T.fontMono, whiteSpace: 'nowrap' }}>
            {current.subtitle}
          </span>
          <span style={{ color: T.scrim, fontSize: 10, fontFamily: T.fontMono, whiteSpace: 'nowrap' }}>
            {current.data.length} people
          </span>
        </div>

        {/* Hamburger menu */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Switch dataset"
            style={{
              background: menuOpen ? T.outline : 'transparent',
              border: `1px solid ${T.outline}`,
              borderRadius: 6,
              color: T.onSurfaceMuted,
              cursor: 'pointer',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.15s',
            }}
          >
            <IconMenu size={14} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: T.surfaceContainer,
              border: `1px solid ${T.outline}`,
              borderRadius: 7,
              overflow: 'hidden',
              minWidth: 160,
              zIndex: 150,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {(Object.keys(DATASETS) as Dataset[]).map(key => (
                <button
                  key={key}
                  onClick={() => { setDataset(key); setMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    background: dataset === key ? T.outline : 'transparent',
                    border: 'none',
                    color: dataset === key ? T.onSurface : T.onSurfaceVariant,
                    fontFamily: T.fontMono,
                    fontSize: 11,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    letterSpacing: '0.03em',
                  }}
                >
                  {dataset === key && (
                    <span style={{ color: T.primary, fontSize: 10 }}>✓</span>
                  )}
                  {dataset !== key && <span style={{ width: 14 }} />}
                  {DATASETS[key].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div style={{ flex: '1 1 0', minHeight: 0 }}>
        <TimelineGraph key={dataset} musicians={current.data} theme={T} headerHeight={headerHeight} />
      </div>
    </div>
  );
}
