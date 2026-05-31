import { useMemo, useState } from 'react';
import { blockLabel, blocksForPage, type BlockCatalogItem } from '../shared/blocksCatalogue.ts';

interface Props {
  catalogue: BlockCatalogItem[];
  pageType: string;
  existingNames: string[];
  onAdd: (name: string) => void;
}

export default function AddBlockPicker({ catalogue, pageType, existingNames, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const existing = useMemo(() => new Set(existingNames), [existingNames]);
  const addable = useMemo(
    () => blocksForPage(catalogue, pageType).filter((block) => !existing.has(block.name)),
    [catalogue, existing, pageType],
  );
  const visible = addable.filter((block) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${block.displayName} ${block.name} ${block.description}`.toLowerCase().includes(q);
  });

  return (
    <div className={`add-block${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="add-block__trigger"
        onClick={() => setOpen((value) => !value)}
        disabled={addable.length === 0}
        title={addable.length === 0 ? 'Every compatible block is already on this page.' : 'Add block'}
      >
        <span aria-hidden>+</span>
        <span>{addable.length === 0 ? 'All blocks added' : 'Add block'}</span>
      </button>

      {open && addable.length > 0 && (
        <div className="add-block__panel">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search blocks"
            aria-label="Search blocks"
          />
          <div className="add-block__list">
            {visible.map((block) => (
              <button
                key={block.name}
                type="button"
                onClick={() => {
                  onAdd(block.name);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <strong>{blockLabel(block)}</strong>
                <code>{block.name}</code>
                {block.description && <span>{block.description}</span>}
              </button>
            ))}
            {visible.length === 0 && <p>No blocks match that search.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
