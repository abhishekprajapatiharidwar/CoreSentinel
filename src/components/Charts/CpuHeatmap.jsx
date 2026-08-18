import { motion } from 'framer-motion';

function getCoreColor(usage) {
  if (usage >= 90) return { bg: 'rgba(239,68,68,0.85)', text: '#fff' };
  if (usage >= 75) return { bg: 'rgba(239,68,68,0.55)', text: '#fca5a5' };
  if (usage >= 60) return { bg: 'rgba(245,158,11,0.65)', text: '#fcd34d' };
  if (usage >= 40) return { bg: 'rgba(59,130,246,0.55)', text: '#93c5fd' };
  if (usage >= 20) return { bg: 'rgba(16,185,129,0.45)', text: '#6ee7b7' };
  return { bg: 'rgba(128,128,128,0.12)', text: 'var(--text-muted)' };
}

/**
 * Compute balanced columns for n items so the grid fills space well.
 * Allows rectangles — cells don't need to be square.
 * Targets ~2:1 to 3:1 width:height ratio per row.
 */
function bestCols(n) {
  if (n <= 2) return n;
  if (n <= 4) return 4;
  if (n <= 6) return 6;
  if (n <= 8) return 8;
  if (n <= 12) return 6;
  if (n <= 16) return 8;
  if (n <= 24) return 8;
  if (n <= 32) return 8;
  return 8; // max 8 cols
}

export default function CpuHeatmap({ cores, selectedCores, onToggleCore, selectable = false }) {
  if (!cores || cores.length === 0) return null;

  const n = cores.length;
  const cols = bestCols(n);

  return (
    <div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {cores.map((usage, i) => {
          const { bg, text } = getCoreColor(usage);
          const isSelected = selectedCores?.includes(i);

          return (
            <motion.div
              key={i}
              className="heatmap-cell flex flex-col items-center justify-center rounded"
              style={{
                background: selectable
                  ? (isSelected ? 'rgba(59,130,246,0.4)' : 'var(--input-bg)')
                  : bg,
                border: selectable
                  ? `1px solid ${isSelected ? '#3b82f6' : 'var(--border)'}`
                  : '1px solid rgba(255,255,255,0.06)',
                padding: '4px 2px',
                cursor: selectable ? 'pointer' : 'default',
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={selectable ? { scale: 0.95 } : {}}
              onClick={() => selectable && onToggleCore?.(i)}
            >
              <div className="text-[9px] font-mono leading-none" style={{ color: selectable ? 'var(--text-muted)' : text }}>
                LP{i}
              </div>
              <div className="text-[10px] font-mono font-bold leading-none mt-0.5"
                style={{ color: selectable ? (isSelected ? '#60a5fa' : 'var(--text-secondary)') : text }}>
                {selectable ? (isSelected ? '✓' : `${usage.toFixed(0)}%`) : `${usage.toFixed(0)}%`}
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* Legend */}
      {!selectable && (
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {[
            { label: 'Low', color: 'rgba(16,185,129,0.45)' },
            { label: 'Normal', color: 'rgba(59,130,246,0.55)' },
            { label: 'High', color: 'rgba(245,158,11,0.65)' },
            { label: 'Critical', color: 'rgba(239,68,68,0.85)' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: color }} />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
