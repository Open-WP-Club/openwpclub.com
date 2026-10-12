import { describe, expect, it } from 'vitest';
import { updateReadme } from '../../../scripts/sync-sponsorship-readmes.mjs';
describe('README sponsorship updates', () => {
  it('preserves usage and maintenance sections and is idempotent', () => {
    const result = updateReadme('# Plugin\n\n## Usage\nDo useful work.\n\n## License\nGPL.\n');
    expect(result.indexOf('## Usage')).toBeLessThan(result.indexOf('OPENWPCLUB_SPONSORS_START'));
    expect(result).toContain('## License\nGPL.');
    expect(updateReadme(result)).toBe(result);
  });
  it('refuses ambiguous or broken markers', () => {
    expect(() => updateReadme('<!-- OPENWPCLUB_SPONSORS_START -->')).toThrow();
    expect(() => updateReadme('<!-- OPENWPCLUB_SPONSORS_END --><!-- OPENWPCLUB_SPONSORS_START -->')).toThrow();
  });
});
