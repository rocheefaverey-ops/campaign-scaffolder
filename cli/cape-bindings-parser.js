export function parseCapeBindings(bindings, context = {}) {
  if (!bindings || typeof bindings !== 'object') return [];
  const out = [];
  for (const [key, raw] of Object.entries(bindings)) {
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    const parts = raw.split('|').map((part) => part.trim());
    if (parts.length < 3) {
      throw new Error(`malformed binding for "${key}": expected "<path> | <type> | <description>", got "${raw}"`);
    }
    const [pathTemplate, type, ...description] = parts;
    const path = pathTemplate
      .replaceAll('{pageType}', context.pageType ?? '')
      .replaceAll('{pageId}', context.pageId ?? context.pageType ?? '');
    out.push({ key, path, type, description: description.join(' | ') });
  }
  return out;
}
