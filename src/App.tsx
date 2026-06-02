import { useState, useRef, useEffect } from 'react';
import { musicians } from './data/musicians';
import { designers } from './data/designers';
import { TimelineGraph } from './components/TimelineGraph';
import { CoverPage } from './components/CoverPage';
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
  const [dataset, setDataset]   = useState<Dataset>('jazz');
  const [showCover, setShowCover] = useState(true);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef   = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const current   = DATASETS[dataset];

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
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Title — clicking returns to cover */}
        <div
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', cursor: showCover ? 'default' : 'pointer' }}
          onClick={() => !showCover && setShowCover(true)}
          title={showCover ? undefined : 'Back to cover'}
        >
          <h1 style={{
            margin: 0, color: T.onSurface, fontSize: 15,
            fontFamily: T.fontSans, fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap',
          }}>
            Our heroes' heroes
          </h1>
          {!showCover && (
            <span style={{ color: T.onSurfaceMuted, fontSize: 11, fontFamily: T.fontMono, whiteSpace: 'nowrap' }}>
              {current.subtitle}
            </span>
          )}
          <span style={{ color: T.scrim, fontSize: 10, fontFamily: T.fontMono, whiteSpace: 'nowrap' }}>
            {showCover ? '' : `${current.data.length} people`}
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
              borderRadius: 6, color: T.onSurfaceMuted,
              cursor: 'pointer', padding: '6px 8px',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
          >
            <IconMenu size={14} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: T.surfaceContainer, border: `1px solid ${T.outline}`,
              borderRadius: 7, overflow: 'hidden', minWidth: 180,
              zIndex: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {/* Dataset options */}
              {(Object.keys(DATASETS) as Dataset[]).map(key => (
                <button
                  key={key}
                  onClick={() => { setDataset(key); setMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', background: dataset === key ? T.outline : 'transparent',
                    border: 'none', color: dataset === key ? T.onSurface : T.onSurfaceVariant,
                    fontFamily: T.fontMono, fontSize: 11,
                    padding: '10px 14px', cursor: 'pointer',
                    textAlign: 'left', letterSpacing: '0.03em',
                  }}
                >
                  {dataset === key
                    ? <span style={{ color: T.primary, fontSize: 10 }}>✓</span>
                    : <span style={{ width: 14 }} />
                  }
                  {DATASETS[key].label}
                </button>
              ))}
              {/* Divider + back to cover */}
              {!showCover && <>
                <div style={{ height: 1, background: T.outline, margin: '2px 0' }} />
                <button
                  onClick={() => { setShowCover(true); setMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', background: 'transparent', border: 'none',
                    color: T.onSurfaceMuted, fontFamily: T.fontMono, fontSize: 11,
                    padding: '10px 14px', cursor: 'pointer',
                    textAlign: 'left', letterSpacing: '0.03em',
                  }}
                >
                  <span style={{ width: 14 }} />
                  ← Home
                </button>
              </>}
            </div>
          )}
        </div>
      </header>

      <div style={{ flex: '1 1 0', minHeight: 0, overflow: showCover ? 'auto' : 'hidden' }}>
        {showCover
          ? <CoverPage
              datasets={DATASETS}
              activeDataset={dataset}
              onDatasetChange={setDataset}
              onStart={() => setShowCover(false)}
              theme={T}
            />
          : <TimelineGraph
              key={dataset}
              musicians={current.data}
              theme={T}
            />
        }
      </div>
    </div>
  );
}
