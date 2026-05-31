import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

describe('block-driven landing integration', () => {
  it('scaffolds a project whose landing page imports the configured blocks', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'block-landing-'));
    try {
      // Invoke the scaffolder with a block-driven landing config via the
      // new --blocks-config flag. (Plan 2 replaces this with wizard-driven
      // config; today the flag is the scaffold-time entry point.)
      const blocksConfigPath = join(outDir, 'blocks-config.json');
      writeFileSync(blocksConfigPath, JSON.stringify({
        landing: {
          blocks: [
            { name: 'background', settings: { kind: 'image' } },
            { name: 'header-chrome', settings: { leftSlot: 'menu', rightSlot: 'none' } },
            { name: 'brand-chip', settings: { size: 'md' } },
            { name: 'title-block', settings: { showKicker: true, showSubtitle: false } },
            { name: 'cta-group', settings: { count: 1, buttons: [{ variant: 'primary', exit: 'game' }] } },
          ],
        },
      }));

      // Note: --page=game omitted here (would otherwise require --engine=unity|r3f|phaser
      // per cli/core/validation.js). The landing-only flow is sufficient to verify
      // the block-driven override is wired up; engine selection is orthogonal.
      execSync(
        `node cli/scaffold.js --name=block-test --cape-id=99999 --market=NL --stack=next --game=none --page=landing --output=${outDir}/project --blocks-config=${blocksConfigPath} --skip-install --skip-git --yes`,
        { stdio: 'inherit' },
      );

      const landingTsx = join(outDir, 'project/frontend/app/(campaign)/landing/page.tsx');
      assert.ok(existsSync(landingTsx), 'expected generated landing/page.tsx at the legacy override location');
      const content = readFileSync(landingTsx, 'utf8');
      assert.match(content, /import \{ Background \}/);
      assert.match(content, /import \{ HeaderChrome \}/);
      assert.match(content, /import \{ BrandChip \}/);
      assert.match(content, /import \{ TitleBlock \}/);
      assert.match(content, /import \{ CtaGroup \}/);

      const backgroundBlock = join(outDir, 'project/frontend/components/_blocks/background/Background.tsx');
      assert.ok(existsSync(backgroundBlock), 'expected block source copied into the Next.js app dir');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it('the generated landing page type-checks against the base template', { timeout: 180_000 }, () => {
    const outDir = mkdtempSync(join(tmpdir(), 'block-landing-tsc-'));
    try {
      const blocksConfigPath = join(outDir, 'blocks-config.json');
      writeFileSync(blocksConfigPath, JSON.stringify({
        landing: {
          blocks: [
            { name: 'background', settings: { kind: 'image' } },
            { name: 'title-block', settings: { showKicker: false, showSubtitle: false } },
            { name: 'cta-group', settings: { count: 1, buttons: [{ variant: 'primary', exit: 'game' }] } },
          ],
        },
      }));

      // Note: --page=tutorial --page=result are included alongside landing so
      // the base template's pre-shipped tutorial/result pages get their flow
      // tokens replaced (otherwise `{{FLOW_RULE_TUTORIAL}}` remains in source
      // and breaks `tsc`). The block-driven landing override is still the unit
      // under test; the extra pages just keep the base template's existing
      // route files compiling.
      execSync(
        `node cli/scaffold.js --name=block-tsc --cape-id=99999 --market=NL --stack=next --game=none --page=landing --page=tutorial --page=result --output=${outDir}/project --blocks-config=${blocksConfigPath} --yes --skip-install --skip-git`,
        { stdio: 'inherit' },
      );

      const frontendDir = join(outDir, 'project/frontend');

      // Install deps + type-check
      execSync('pnpm install', { cwd: frontendDir, stdio: 'inherit' });
      execSync('pnpm run ts-compile', { cwd: frontendDir, stdio: 'inherit' });
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
