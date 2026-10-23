'use client';

export function PrintQuoteButton({ label }: { label: string }) {
  return <button type="button" className="quotePrintButton" onClick={() => window.print()}>{label}</button>;
}
