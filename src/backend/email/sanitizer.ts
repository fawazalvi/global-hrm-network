import sanitizeHtml from 'sanitize-html';

const MAX_INBOUND_BODY_CHARS = 128 * 1024; // 128 KB max stored preview/body

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeInboundHtml(rawHtml: string | undefined | null): string {
  if (!rawHtml) return '';
  const bounded = rawHtml.slice(0, MAX_INBOUND_BODY_CHARS);

  return sanitizeHtml(bounded, {
    allowedTags: [
      'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li',
      'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'a', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
    },
  });
}

export function buildSafeTextPreview(
  rawText: string | undefined | null,
  rawHtml?: string | undefined | null,
  maxLength: number = 400
): string {
  let source = rawText || '';
  if (!source && rawHtml) {
    source = sanitizeHtml(rawHtml.slice(0, MAX_INBOUND_BODY_CHARS), {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
  const normalized = source.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
}
