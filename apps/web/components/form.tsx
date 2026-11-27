'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/actions';

type Action = (prev: ActionState, data: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className, reset }: { action: Action; children: React.ReactNode; className?: string; reset?: boolean }) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (reset && state?.ok) ref.current?.reset();
  }, [state, reset]);
  return (
    <form ref={ref} action={formAction} className={className ?? 'space-y-4'}>
      {children}
      {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && !state.error && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, variant = 'primary', confirm }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger'; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn-${variant}`}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? 'Working...' : children}
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
      Print / Save receipt
    </button>
  );
}

export function CopyButton({ text }: { text: string }) {
  return (
    <button type="button" className="text-xs text-brand underline" onClick={() => navigator.clipboard.writeText(text)}>
      Copy
    </button>
  );
}
