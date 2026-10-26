import { DISCIPLINE_SHORT } from '@/lib/events/constants';
import { hueOf } from '@/lib/network/palette';

export function Legend({ disciplines }: { disciplines: string[] }) {
  if (disciplines.length === 0) return null;
  return (
    <ul className="legend" aria-label="Carreras">
      {disciplines.map((d) => {
        const hue = hueOf(d);
        return (
          <li
            key={d}
            className="legend-item"
            style={{ '--core': hue.core, '--rim': `rgb(${hue.glow})` } as React.CSSProperties}
          >
            <span className="legend-dot" aria-hidden="true" />
            {DISCIPLINE_SHORT[d] ?? d}
          </li>
        );
      })}
    </ul>
  );
}
