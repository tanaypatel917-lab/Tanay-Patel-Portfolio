import { ProofValue } from './ProofValue';
import type { PortfolioEvidence } from '@/content/portfolio';

interface EvidenceListProps {
  items: readonly PortfolioEvidence[];
}

/**
 * The evidence ledger. Category, title and result align without repeating
 * status metadata; summaries and complete proof values remain readable
 * from the first paint, with no counting or hover scrambling.
 */
export function EvidenceList({ items }: EvidenceListProps) {
  return (
    <ol className="proof-ledger" role="list">
      {items.map((item) => (
        <li key={item.id} className="proof-ledger__row">
          <p className="proof-ledger__category">{item.eyebrow}</p>
          <div className="proof-ledger__entry">
            <h3 className="proof-ledger__title">{item.title}</h3>
            <p className="proof-ledger__summary">{item.summary}</p>
          </div>
          <ProofValue text={item.proof} className="proof-ledger__result" />
        </li>
      ))}
    </ol>
  );
}
