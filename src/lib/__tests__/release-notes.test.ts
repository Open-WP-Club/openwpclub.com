import { describe, expect, it } from 'vitest';
import { renderReleaseNotes } from '../release-notes';

describe('release notes', () => {
  it('renders Markdown headings, lists and links and removes unsafe HTML', async () => {
    const html = await renderReleaseNotes('## Highlights\n\n- **Fix** [details](https://github.com/example/repo)\n\n<script>alert(1)</script>');
    expect(html).toContain('<h2>Highlights</h2>');
    expect(html).toContain('<li><strong>Fix</strong>');
    expect(html).toContain('href="https://github.com/example/repo"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<script');
  });

  it('returns an empty string for empty notes', async () => {
    expect(await renderReleaseNotes('  ')).toBe('');
  });
});
