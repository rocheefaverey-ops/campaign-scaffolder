import { useEffect, useMemo, useState } from 'react';
import { listBlocks } from '../bridge.ts';
import {
  settingDefault,
  type BlockCatalogItem,
  type BlockSettingDef,
} from '../shared/blocksCatalogue.ts';
import {
  defaultBlocksForPage,
  type BlockSetting,
  type PageBlockConfig,
  type PageBlocksConfig,
} from '../shared/config.ts';
import AddBlockPicker from './AddBlockPicker.tsx';
import BlockCard from './BlockCard.tsx';

interface Props {
  pageId: string;
  pageType: string;
  value: PageBlocksConfig;
  onChange: (next: PageBlocksConfig) => void;
}

export default function BlockListEditor({ pageId, pageType, value, onChange }: Props) {
  const [catalogue, setCatalogue] = useState<BlockCatalogItem[]>([]);

  useEffect(() => {
    let active = true;
    listBlocks().then((blocks) => {
      if (active) setCatalogue(blocks);
    });
    return () => { active = false; };
  }, []);

  const catalogueByName = useMemo(
    () => new Map(catalogue.map((block) => [block.name, block])),
    [catalogue],
  );
  const order = resolvedOrder(value);

  const updateBlock = (name: string, next: PageBlockConfig) => {
    onChange({
      ...value,
      blocks: {
        ...value.blocks,
        [name]: next,
      },
      blockOrder: order,
    });
  };

  const moveBlock = (name: string, direction: -1 | 1) => {
    const index = order.indexOf(name);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= order.length) return;
    const nextOrder = [...order];
    [nextOrder[index], nextOrder[swapIndex]] = [nextOrder[swapIndex], nextOrder[index]];
    onChange({ ...value, blockOrder: nextOrder });
  };

  const addBlock = (name: string) => {
    const nextOrder = order.includes(name) ? order : [...order, name];
    const existing = value.blocks[name];
    onChange({
      ...value,
      blocks: {
        ...value.blocks,
        [name]: {
          enabled: true,
          settings: existing?.settings ?? defaultSettingsForBlock(name, pageType, catalogueByName.get(name)),
        },
      },
      blockOrder: nextOrder,
    });
  };

  const removeBlock = (name: string) => {
    const nextBlocks = { ...value.blocks };
    delete nextBlocks[name];
    onChange({
      blocks: nextBlocks,
      blockOrder: order.filter((item) => item !== name),
    });
  };

  return (
    <div className="block-list-editor">
      <header className="block-list-editor__head">
        <div>
          <h5>Blocks</h5>
          <code>pageBlocks.{pageId}</code>
        </div>
        <AddBlockPicker
          catalogue={catalogue}
          pageType={pageType}
          existingNames={order}
          onAdd={addBlock}
        />
      </header>

      <div className="block-list-editor__list">
        {order.length === 0 ? (
          <p className="block-list-editor__empty">No blocks configured for this page.</p>
        ) : order.map((name, index) => {
          const config = value.blocks[name];
          if (!config) return null;
          const block = catalogueByName.get(name);
          return (
            <BlockCard
              key={name}
              name={name}
              block={block}
              config={config}
              index={index}
              canMoveUp={index > 0}
              canMoveDown={index < order.length - 1}
              onToggle={(enabled) => updateBlock(name, { ...config, enabled })}
              onMove={(direction) => moveBlock(name, direction)}
              onRemove={() => removeBlock(name)}
              onSettingChange={(key, settingValue) => {
                updateBlock(name, {
                  ...config,
                  settings: { ...config.settings, [key]: settingValue },
                });
              }}
              onResetSettings={() => {
                updateBlock(name, {
                  ...config,
                  settings: defaultSettingsForBlock(name, pageType, block),
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function resolvedOrder(value: PageBlocksConfig): string[] {
  const configured = value.blockOrder?.filter((name) => Boolean(value.blocks[name])) ?? [];
  const missing = Object.keys(value.blocks).filter((name) => !configured.includes(name));
  return [...configured, ...missing];
}

function defaultSettingsForBlock(name: string, pageType: string, block?: BlockCatalogItem): Record<string, BlockSetting> {
  const fromPage = defaultBlocksForPage(pageType).blocks[name]?.settings;
  if (fromPage) return structuredClone(fromPage);
  return settingsFromManifest(block?.settings ?? {});
}

function settingsFromManifest(settings: Record<string, BlockSettingDef>): Record<string, BlockSetting> {
  const out: Record<string, BlockSetting> = {};
  for (const [key, def] of Object.entries(settings)) {
    const fallback = settingDefault(def);
    if (fallback !== undefined) out[key] = structuredClone(fallback);
  }
  return out;
}
