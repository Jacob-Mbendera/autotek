import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { FieldLabel } from './Text';

const fieldBase =
  'w-full border rounded-journal px-3.5 py-3 text-sm bg-white font-sans placeholder:text-journal-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors';

function borderFor(error?: string) {
  return error ? 'border-journal-error-border-strong' : 'border-journal-input-border';
}

export interface JournalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const JournalInput = forwardRef<HTMLInputElement, JournalInputProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <input ref={ref} id={id} className={cn(fieldBase, borderFor(error), className)} {...props} />
      {error && <p className="mt-1.5 text-xs text-journal-danger-text">{error}</p>}
    </div>
  )
);
JournalInput.displayName = 'JournalInput';

export interface JournalSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const JournalSelect = forwardRef<HTMLSelectElement, JournalSelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => (
    <div>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <select ref={ref} id={id} className={cn(fieldBase, borderFor(error), className)} {...props}>
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-journal-danger-text">{error}</p>}
    </div>
  )
);
JournalSelect.displayName = 'JournalSelect';

export interface JournalTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const JournalTextarea = forwardRef<HTMLTextAreaElement, JournalTextareaProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <textarea ref={ref} id={id} className={cn(fieldBase, borderFor(error), 'resize-y min-h-[52px]', className)} {...props} />
      {error && <p className="mt-1.5 text-xs text-journal-danger-text">{error}</p>}
    </div>
  )
);
JournalTextarea.displayName = 'JournalTextarea';
