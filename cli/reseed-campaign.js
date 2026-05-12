#!/usr/bin/env node
/**
 * One-shot script to re-seed template assets for an existing campaign.
 * Usage: node cli/reseed-campaign.js <campaignId>
 *
 * Uses pre-uploaded stable asset URLs — no file uploads needed.
 */
import { checkAuth, seedTemplateAssets } from './cape-client.js';

const campaignId = process.argv[2];
if (!campaignId) {
  console.error('Usage: node cli/reseed-campaign.js <campaignId>');
  process.exit(1);
}

const tokens = await checkAuth();
if (!tokens?.authToken) {
  console.error('Not logged in. Run the wizard and log in to CAPE first.');
  process.exit(1);
}

console.log(`Re-seeding campaign ${campaignId}...`);
try {
  const { seeded } = await seedTemplateAssets(tokens, campaignId, { force: true });
  console.log(`✓  ${seeded} fields seeded`);
} catch (err) {
  console.error(`✘  ${err.message}`);
  process.exit(1);
}
