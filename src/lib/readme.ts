import sanitizeHtml from 'sanitize-html';

// Corrections for published upstream README links; keep them applied after each data refresh.
const linkCorrections: Record<string, string | null> = {
  'https://github.com/Open-WP-Club/agentready-wp/blob/main/LICENSE': null,
  'https://github.com/Open-WP-Club/agentready-wp/discussions': 'https://github.com/Open-WP-Club/agentready-wp/issues',
  'https://github.com/Open-WP-Club/Spam-User-Detective/discussions': 'https://github.com/Open-WP-Club/spam-user-detective-wp/issues',
  'https://github.com/Open-WP-Club/spam-user-detective-wp/discussions': 'https://github.com/Open-WP-Club/spam-user-detective-wp/issues',
  'https://github.com/Open-WP-Club/wp-sanitize/blob/main/CONTRIBUTING.md': null,
  'https://github.com/openwpclub/wp-sanitize/issues': 'https://github.com/Open-WP-Club/wp-sanitize/issues',
};

export function sanitizeReadme(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'details', 'summary', 'picture', 'source', 'video']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      a: ['href', 'title', 'target', 'rel'],
      code: ['class'], span: ['class'], pre: ['class'], div: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tagName, attributes) => {
        const corrected = Object.hasOwn(linkCorrections, attributes.href) ? linkCorrections[attributes.href] : undefined;
        return corrected === null ? { tagName: 'span', attribs: {} } : { tagName, attribs: { ...attributes, ...(corrected ? { href: corrected } : {}) } };
      },
    },
  });
}
