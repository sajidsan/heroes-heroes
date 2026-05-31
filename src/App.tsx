import { useState } from 'react';
import { musicians } from './data/musicians';
import { designers } from './data/designers';
import { TimelineGraph } from './components/TimelineGraph';
import { darkTheme } from './theme';

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
  const [dataset, setDataset] = useState<Dataset>('jazz');
  const current = DATASETS[dataset];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: T.bgBase, overflow: 'hidden',
    }}>
      <header style={{
        padding: '10px 24px',
        borderBottom: `1px solid ${T.borderBase}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>
        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            margin: '0 0 2px', color: T.accentPrimary,
            fontSize: 16, fontFamily: T.fontSans,
            fontWeight: 700, letterSpacing: '0.02em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            Who Are Heroes Heroes?
          </h1>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ color: T.textMuted, fontSize: 11, fontFamily: T.fontMono }}>
              {current.subtitle}
            </span>
            <span style={{ color: T.textDim, fontSize: 10, fontFamily: T.fontMono, whiteSpace: 'nowrap' }}>
              {current.data.length} people · click a node or edge
            </span>
          </div>
        </div>

        {/* Dataset switcher */}
        <div style={{
          display: 'flex',
          border: `1px solid ${T.borderBase}`,
          borderRadius: 5,
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {(Object.keys(DATASETS) as Dataset[]).map(key => (
            <button
              key={key}
              onClick={() => setDataset(key)}
              style={{
                background: dataset === key ? T.borderBase : 'transparent',
                border: 'none',
                color: dataset === key ? T.textPrimary : T.textMuted,
                fontFamily: T.fontMono,
                fontSize: 10,
                padding: '5px 12px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                borderRight: key === 'jazz' ? `1px solid ${T.borderBase}` : 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {DATASETS[key].label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: '1 1 0', minHeight: 0 }}>
        {/* key forces full remount + D3 re-render when dataset changes */}
        <TimelineGraph key={dataset} musicians={current.data} theme={T} />
      </div>
    </div>
  );
}
