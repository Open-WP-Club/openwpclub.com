import { describe, expect, it } from 'vitest';
import { parsePluginCompatibility } from '../plugin-compatibility';

describe('plugin compatibility metadata', () => {
  it('reads WordPress headers and readme declarations independently', () => {
    const php = `<?php\n/*\nPlugin Name: Example\nRequires at least: 6.3\nRequires PHP: 8.1\nWC requires at least: 8.0\nWC tested up to: 9.2\n*/`;
    const readme = `=== Example ===\nRequires at least: 6.2\nTested up to: 6.7\nRequires PHP: 8.0\n\n== Description ==\nTested up to: 99`;
    expect(parsePluginCompatibility(php, readme)).toEqual({ wordpress: '6.3', wordpressTested: '6.7', php: '8.1', woocommerce: '8.0', woocommerceTested: '9.2' });
  });
  it('leaves absent declarations empty and accepts readme requirements', () => {
    expect(parsePluginCompatibility('', '=== Example ===\nRequires at least: 6.0\nRequires PHP: 7.4')).toEqual({ wordpress: '6.0', wordpressTested: '', php: '7.4', woocommerce: '', woocommerceTested: '' });
  });
  it('uses the plugin header for the tested WordPress version when the readme omits it', () => {
    expect(parsePluginCompatibility('<?php\n/*\n * Tested up to: 7.1.4\n */', '').wordpressTested).toBe('7.1.4');
  });
});
