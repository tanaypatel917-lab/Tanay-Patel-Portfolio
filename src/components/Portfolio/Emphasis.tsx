import { Fragment } from 'react';

interface EmphasisProps {
  /** Copy from portfolio.ts; a single `*phrase*` becomes the serif italic. */
  text: string;
  /** Adds the strike-through element inside the emphasised phrase. */
  strike?: boolean;
}

/** Splits `*phrase*` markers into <em> elements; everything else is plain text. */
export function Emphasis({ text, strike = false }: EmphasisProps) {
  const parts = text.split(/\*([^*]+)\*/g);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <em key={index}>
            {part}
            {strike ? <span className="strike" aria-hidden="true" /> : null}
          </em>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Plain-text version for attributes and metadata. */
export function stripEmphasis(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1');
}
