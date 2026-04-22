import type { Metric } from '@/content/resume';

interface Props {
  metrics: Metric[];
}

/**
 * Visual stat cards — used on the Amazon L3 experience block to show
 * handle time / resolution / CSAT against global averages.
 */
export default function MetricCards({ metrics }: Props) {
  return (
    <div className="tech-metrics" role="list">
      {metrics.map((m) => (
        <div key={m.label} className="tech-metric" role="listitem">
          <div className="tech-metric-value" aria-describedby={`m-${m.label}`}>
            {m.value}
          </div>
          <div className="tech-metric-label" id={`m-${m.label}`}>
            {m.label}
          </div>
          {m.avg && <div className="tech-metric-avg">{m.avg}</div>}
        </div>
      ))}
    </div>
  );
}
