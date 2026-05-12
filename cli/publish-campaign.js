#!/usr/bin/env node
/**
 * One-shot script to (re-)publish a campaign to acceptance.
 * Usage: node cli/publish-campaign.js <campaignId>
 *
 * Polls the publish job until done (max 3 min), then prints the CDN URL.
 */
import { checkAuth, publishCampaign } from './cape-client.js';

const campaignId = process.argv[2];
if (!campaignId) {
  console.error('Usage: node cli/publish-campaign.js <campaignId>');
  process.exit(1);
}

const tokens = await checkAuth();
if (!tokens?.authToken) {
  console.error('Not logged in. Run the wizard and log in to CAPE first.');
  process.exit(1);
}

console.log(`Publishing campaign ${campaignId}...`);
try {
  const url = await publishCampaign(tokens, campaignId);
  console.log(`✓  Published${url ? `: ${url}` : ''}`);
} catch (err) {
  console.error(`✘  ${err.message}`);
  process.exit(1);
}
