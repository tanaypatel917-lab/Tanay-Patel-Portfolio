interface ProofValueProps {
  text: string;
  className?: string;
}

/**
 * A proof line rendered complete from the first paint: scores, grades,
 * age groups, weight classes and sentences never count up or scramble.
 * Any decorative treatment belongs to the surrounding ledger, not the text.
 */
export function ProofValue({ text, className }: ProofValueProps) {
  return <p className={className ? `proof-value-static ${className}` : 'proof-value-static'}>{text}</p>;
}
