import type { Theme } from '../theme';
import type { Musician } from '../types';
import { IconArrowRight } from './Icons';

// ── App badge icon — two nodes connected by an edge ───────────────────────────
function NodeEdgeIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="5"  cy="15" r="3.5" stroke={color} strokeWidth="1.5" />
      <circle cx="5"  cy="15" r="1.5" fill={color} />
      <circle cx="15" cy="5"  r="3.5" stroke={color} strokeWidth="1.5" />
      <circle cx="15" cy="5"  r="1.5" fill={color} />
      <line x1="8" y1="12" x2="12" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────
function StatCell({
  label, value, theme, borderRight = false,
}: {
  label: string; value: string; theme: Theme; borderRight?: boolean;
}) {
  return (
    <div style={{
      flex: 1,
      padding: '14px 16px',
      borderRight: borderRight ? `1px solid ${theme.outline}` : 'none',
    }}>
      <div style={{
        fontSize: 9, fontFamily: theme.fontMono,
        letterSpacing: '0.18em', textTransform: 'uppercase' as const,
        color: theme.scrim, marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700,
        fontFamily: theme.fontMono, color: theme.onSurface, lineHeight: 1.2,
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────

type Dataset = 'jazz' | 'design';

interface DatasetConfig {
  label: string;
  subtitle: string;
  data: Musician[];
}

export function CoverPage({
  datasets,
  activeDataset,
  onDatasetChange,
  onStart,
  theme,
}: {
  datasets: Record<Dataset, DatasetConfig>;
  activeDataset: Dataset;
  onDatasetChange: (d: Dataset) => void;
  onStart: () => void;
  theme: Theme;
}) {
  const data = datasets[activeDataset].data;

  // Compute stats from active dataset
  const totalArtists   = data.length;
  const totalConnections = data.reduce((sum, m) => sum + m.heroes.length, 0);
  const minYear = Math.min(...data.map(m => m.born));
  const maxYear = Math.max(...data.map(m => m.born));
  const period  = `${minYear}–${maxYear}`;

  const artistLabel  = activeDataset === 'design' ? 'CREATORS' : 'ARTISTS';
  const sourceSummary = activeDataset === 'jazz'
    ? 'Down Beat · Jazz Jnl · liner notes'
    : 'Objectified · Wired · biographies';

  const statsRows: [string, string, string, string][] = [
    ['DATASET',     datasets[activeDataset].label, artistLabel,  String(totalArtists)],
    ['CONNECTIONS', String(totalConnections),       'SOURCES',    sourceSummary],
    ['TIME PERIOD', period,                         'FORMAT',     'Timeline'],
  ];

  return (
    <div style={{
      flex: 1, overflow: 'auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{
        maxWidth: 480, width: '100%',
        display: 'flex', flexDirection: 'column', gap: 22,
      }}>

        {/* Version chip */}
        <span style={{
          fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
          fontFamily: theme.fontMono, color: theme.scrim,
        }}>
          Version 1.0
        </span>

        {/* App badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          {/* Icon box */}
          <div style={{
            width: 40, height: 40,
            border: `1px solid ${theme.outline}`,
            borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: theme.surfaceContainer,
          }}>
            <NodeEdgeIcon size={20} color={theme.primary} />
          </div>

          <span style={{
            fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: theme.fontMono, color: theme.onSurfaceVariant,
          }}>
            Who Are Heroes Heroes
          </span>
        </div>

        {/* Dataset toggle — above the headline */}
        <div style={{
          display: 'flex',
          border: `1px solid ${theme.outline}`,
          borderRadius: 5, overflow: 'hidden',
          alignSelf: 'flex-start',
        }}>
          {(Object.keys(datasets) as Dataset[]).map(key => (
            <button
              key={key}
              onClick={() => onDatasetChange(key)}
              style={{
                background: activeDataset === key ? theme.outline : 'transparent',
                border: 'none',
                color: activeDataset === key ? theme.onSurface : theme.onSurfaceMuted,
                fontFamily: theme.fontMono, fontSize: 10,
                padding: '7px 14px', cursor: 'pointer',
                letterSpacing: '0.04em',
                borderRight: key === 'jazz' ? `1px solid ${theme.outline}` : 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {datasets[key].label}
            </button>
          ))}
        </div>

        {/* Headline */}
        <h2 style={{
          margin: 0,
          fontFamily: theme.fontSans, fontWeight: 700,
          fontSize: 'clamp(1.5rem, 5vw, 1.9rem)',
          color: theme.onSurface, letterSpacing: '-0.02em', lineHeight: 1.2,
        }}>
          You know your heroes.<br />But what about <em>their</em> heroes?
        </h2>

        {/* Description */}
        <p style={{
          margin: 0,
          fontFamily: theme.fontSerif, fontSize: '0.9rem',
          lineHeight: 1.75, color: theme.onSurfaceVariant,
        }}>
          Documented influence chains in jazz and design, with direct quotes from interviews and biographies.
        </p>

        {/* Stats grid */}
        <div style={{
          border: `1px solid ${theme.outline}`,
          borderRadius: 8, overflow: 'hidden',
          background: theme.surfaceContainer,
        }}>
          {statsRows.map(([l1, v1, l2, v2], i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                borderBottom: i < statsRows.length - 1 ? `1px solid ${theme.outline}` : 'none',
              }}
            >
              <StatCell label={l1} value={v1} theme={theme} borderRight />
              <StatCell label={l2} value={v2} theme={theme} />
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          style={{
            alignSelf: 'flex-start',
            background: theme.primary,
            color: '#141413',
            border: 'none', borderRadius: 5,
            padding: '13px 28px',
            fontFamily: theme.fontSans, fontWeight: 600,
            fontSize: '0.9375rem', cursor: 'pointer',
            letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Explore the Graph
          <IconArrowRight size={15} />
        </button>

      </div>
    </div>
  );
}
