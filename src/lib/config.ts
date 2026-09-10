/** Central configuration for hardcoded values used across the site. */

export const ORG = 'Open-WP-Club';
export const CATALOG_URL = `https://raw.githubusercontent.com/${ORG}/.github/main/catalog.json`;
export const GITHUB_ORG_URL = `https://github.com/${ORG}`;
export const DISCORD_URL = 'https://discord.gg/ESTDmmjj';
export const SPONSOR_URL = 'https://github.com/sponsors/Open-WP-Club';
export const CONTACT_EMAIL = 'contact@openwpclub.com';
export const TWITTER_HANDLE = '@OpenWPClub';
export const TWITTER_URL = 'https://x.com/OpenWPClub';
export const SHOW_STATS = true;
export const BATCH_SIZE = 10;

/** Known AI/LLM account logins to exclude from contributors (unless they are sponsors). */
export const AI_LOGINS: ReadonlySet<string> = new Set([
  'claude',
  'copilot',
  'github-copilot',
  'devin-ai',
  'coderabbitai',
  'sweep-ai',
]);
