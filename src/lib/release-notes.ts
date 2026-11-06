import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export async function renderReleaseNotes(markdown: string): Promise<string> {
  if (!markdown.trim()) return '';

  const html = await marked.parse(markdown, { gfm: true });
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'title', 'target', 'rel'],
      code: ['class'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: { ...attributes, target: '_blank', rel: 'noopener noreferrer' },
      }),
    },
  });
}
