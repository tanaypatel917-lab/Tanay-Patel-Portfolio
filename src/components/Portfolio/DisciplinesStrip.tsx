import type { PortfolioDiscipline } from '@/content/portfolio';

interface DisciplinesStripProps {
  items: readonly PortfolioDiscipline[];
  intro?: string;
}

/** Four compact columns with static dividing rules and immediately readable copy. */
export function DisciplinesStrip({ items, intro }: DisciplinesStripProps) {
  return (
    <div className="discipline-brief">
      <div className="discipline-brief__intro">
        <h3 className="discipline-brief__label">Disciplines</h3>
        {intro ? <p className="discipline-brief__bio">{intro}</p> : null}
      </div>
      <ul className="discipline-brief__grid" role="list">
        {items.map((discipline) => (
          <li key={discipline.id} className="discipline-brief__item">
            <h4 className="discipline-brief__title">{discipline.title}</h4>
            <p className="discipline-brief__summary">{discipline.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
