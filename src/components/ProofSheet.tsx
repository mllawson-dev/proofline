import { formatSize } from '@/lib/jobs';
import type { Job } from '@/lib/types';

/**
 * A layout proof: the finished piece drawn to scale with its trim edge, safe area and dimensions,
 * the way a sign shop proof sheet shows it. The artwork area carries the job's own wording so every
 * proof in the demo is different without inventing imagery.
 */
export function ProofSheet({ job, customer }: { job: Job; customer: string }) {
  const { w, h } = job.size;
  // Fit the piece into a 320-wide drawing area, leaving room for dimension lines.
  const maxW = 260;
  const maxH = 200;
  const scale = Math.min(maxW / w, maxH / h);
  const pw = Math.round(w * scale);
  const ph = Math.round(h * scale);
  const x = 20;
  const y = 34;
  const safe = Math.max(6, Math.round(Math.min(pw, ph) * 0.06)); // safe area inset, like a 1–2 inch margin
  const width = x + pw + 40;
  const height = y + ph + 16;
  const [wLabel, hLabel] = formatSize(job).split(' × ');
  const name = customer.length > 22 ? `${customer.slice(0, 21)}…` : customer;
  const fontSize = Math.max(9, Math.min(20, pw / Math.max(10, name.length) * 1.4, ph / 3.2));

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-labelledby={`proof-title-${job.id}`}
        style={{ display: 'block', maxHeight: '22rem' }}
      >
        <title id={`proof-title-${job.id}`}>
          {`Layout proof for ${job.title}: ${formatSize(job)} ${job.product.toLowerCase()} for ${customer}, showing the trim edge and safe area.`}
        </title>

        {/* Width dimension */}
        <g stroke="var(--ink-muted)" strokeWidth="1" fill="none">
          <path d={`M${x} ${y - 14}h${pw}M${x} ${y - 19}v10M${x + pw} ${y - 19}v10`} />
          <path d={`M${x + pw + 14} ${y}v${ph}M${x + pw + 9} ${y}h10M${x + pw + 9} ${y + ph}h10`} />
        </g>
        <text x={x + pw / 2} y={y - 18} textAnchor="middle" fontSize="11" fill="var(--ink)" style={{ fontFamily: 'var(--font-mono)' }}>
          {wLabel}
        </text>
        <text
          x={x + pw + 30}
          y={y + ph / 2}
          textAnchor="middle"
          fontSize="11"
          fill="var(--ink)"
          transform={`rotate(90 ${x + pw + 30} ${y + ph / 2})`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {hLabel}
        </text>

        {/* The piece: trim edge, then the dashed safe area that keeps text away from hems and grommets */}
        <rect x={x} y={y} width={pw} height={ph} fill="var(--sheet)" stroke="var(--ink)" strokeWidth="1.5" />
        <rect
          x={x + safe}
          y={y + safe}
          width={Math.max(0, pw - safe * 2)}
          height={Math.max(0, ph - safe * 2)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={x + pw / 2}
          y={y + ph / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fontWeight="700"
          fill="var(--ink)"
          style={{ fontFamily: 'var(--font-display)', fontStretch: '78%' }}
        >
          {name}
        </text>
        {ph > 60 && (
          <text
            x={x + pw / 2}
            y={y + ph / 2 + fontSize * 0.95}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.max(8, fontSize * 0.5)}
            fill="var(--ink-muted)"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {job.title}
          </text>
        )}
      </svg>
      <figcaption style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1rem', marginTop: '0.5rem', fontSize: 'var(--text-small)', color: 'var(--ink-muted)' }}>
        <span>
          <span aria-hidden="true" style={{ display: 'inline-block', width: '1.25rem', borderTop: '1.5px solid var(--ink)', verticalAlign: 'middle', marginRight: '0.35rem' }} />
          Trim edge
        </span>
        <span>
          <span aria-hidden="true" style={{ display: 'inline-block', width: '1.25rem', borderTop: '1.5px dashed var(--accent)', verticalAlign: 'middle', marginRight: '0.35rem' }} />
          Safe area: keep text inside
        </span>
        <span>Colors on screen are approximate.</span>
      </figcaption>
    </figure>
  );
}
