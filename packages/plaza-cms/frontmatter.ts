import type { Frontmatter } from './types';

export function parseFrontmatter(markdown: string): {
  metadata: Frontmatter;
  content: string;
} {
  const regex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(regex);

  if (!match) {
    return { metadata: {}, content: markdown };
  }

  const metadata: Frontmatter = {};
  match[1].split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: string | number = line.slice(colonIndex + 1).trim();
      if (!isNaN(Number(value)) && value !== '') {
        value = parseFloat(value);
      }
      metadata[key] = value;
    }
  });

  return { metadata, content: match[2] };
}
