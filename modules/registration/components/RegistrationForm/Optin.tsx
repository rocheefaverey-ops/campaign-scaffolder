import { cn } from '@utils/helpers';

interface OptinLink {
  placeholder: string; // e.g. '{{terms}}'
  url: string;
  label: string;
}

interface OptinProps {
  id: string;
  name: string;
  /** Label text with optional {{placeholder}} tokens that become links */
  label: string;
  links?: OptinLink[];
  required?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

/**
 * Checkbox with link replacement in label text.
 *
 * Example:
 *   label="I accept the {{terms}} and {{privacy}}"
 *   links=[
 *     { placeholder: '{{terms}}', url: '/terms', label: 'Terms' },
 *     { placeholder: '{{privacy}}', url: '/privacy', label: 'Privacy Policy' },
 *   ]
 */
export default function Optin({
  id,
  name,
  label,
  links = [],
  required,
  checked,
  onChange,
  error,
}: OptinProps) {
  const renderedLabel = buildLabel(label, links);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 shrink-0">
          <input
            id={id}
            name={name}
            type="checkbox"
            required={required}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer h-5 w-5 cursor-pointer rounded"
            style={{ accentColor: 'var(--surface-ink)' }}
          />
        </span>
        <span
          className={cn('text-sm leading-relaxed')}
          style={{ color: error ? 'var(--color-statusRed)' : 'var(--text-secondary)' }}
          dangerouslySetInnerHTML={{ __html: renderedLabel }}
        />
      </label>

      {error && (
        <p className="ml-8 text-xs" style={{ color: 'var(--color-statusRed)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function buildLabel(text: string, links: OptinLink[]): string {
  let result = escapeHtml(text);
  for (const { placeholder, url, label } of links) {
    const escapedPlaceholder = escapeHtml(placeholder);
    result = result.replace(
      escapedPlaceholder,
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline opacity-100 hover:opacity-80">${escapeHtml(label)}</a>`,
    );
  }
  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
