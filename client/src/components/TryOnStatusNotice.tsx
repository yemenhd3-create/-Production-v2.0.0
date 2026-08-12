import type { TryOnResult } from '@shared/types';
import * as React from 'react';
import { Check, Info } from 'lucide-react';

export function TryOnStatusNotice({ result }: { result: TryOnResult }) {
  if (result.status === 'success') {
    return (
      <div data-testid="tryon-notice-success" data-tryon-status="success" className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-right">
        <Check size={19} className="mt-0.5 shrink-0 text-emerald-700" />
        <p className="text-sm leading-6 text-emerald-900">{result.message}</p>
      </div>
    );
  }

  if (result.status === 'fallback') {
    return (
      <div data-testid="tryon-notice-fallback" data-tryon-status="fallback" className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right">
        <Info size={19} className="mt-0.5 shrink-0 text-amber-700" />
        <p className="text-sm leading-6 text-amber-900">{result.message}</p>
      </div>
    );
  }

  return null;
}
