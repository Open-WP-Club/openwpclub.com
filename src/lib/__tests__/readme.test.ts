import { expect, it } from 'vitest';
import { sanitizeReadme } from '../readme';

it('fixes dead upstream support links while preserving text and sanitizing unsafe markup', () => {
  const html = sanitizeReadme('<p><a href="https://github.com/openwpclub/wp-sanitize/issues">Support</a><a href="https://github.com/Open-WP-Club/wp-sanitize/blob/main/CONTRIBUTING.md">Contribution guide</a><a href="https://github.com/Open-WP-Club/agentready-wp/discussions">Questions</a></p><script>alert(1)</script><img src="/image.png" onerror="alert(1)">');
  expect(html).toContain('href="https://github.com/Open-WP-Club/wp-sanitize/issues"');
  expect(html).toContain('<span>Contribution guide</span>');
  expect(html).toContain('href="https://github.com/Open-WP-Club/agentready-wp/issues"');
  expect(html).not.toContain('<script');
  expect(html).not.toContain('onerror');
});
