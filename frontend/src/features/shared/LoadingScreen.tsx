import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" role="status" aria-live="polite">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'rgb(var(--color-primary-600))' }} aria-hidden="true" />
      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}