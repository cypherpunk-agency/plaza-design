// Parse numeric prefix (e.g., "01_philosophy" -> { order: 1, name: "philosophy" })
export function parseOrderPrefix(name: string): { order: number | null; name: string } {
  const match = name.match(/^(\d+)_(.+)$/);
  if (match) {
    return { order: parseInt(match[1], 10), name: match[2] };
  }
  return { order: null, name };
}

// Convert kebab-case to Title Case
export function toTitleCase(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate label from filename
export function fileToLabel(filename: string): string {
  let name = filename.replace(/\.md$/, '');
  name = parseOrderPrefix(name).name;
  return toTitleCase(name);
}

// Rewrite relative markdown links to absolute paths for SPA routing
export function rewriteMarkdownLinks(
  content: string,
  basePath: string,
  resolvePath: (from: string, to: string) => string | null
): string {
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

  return content.replace(linkRegex, (match, text, href) => {
    // Skip external links, anchors, and absolute paths
    if (href.startsWith('http://') || href.startsWith('https://') ||
        href.startsWith('#') || href.startsWith('/')) {
      return match;
    }

    const [pathPart, anchor] = href.split('#');
    if (!pathPart) return match;

    const absolutePath = resolvePath(basePath, pathPart);
    if (absolutePath) {
      const newHref = anchor ? `${absolutePath}#${anchor}` : absolutePath;
      return `[${text}](${newHref})`;
    }

    return match;
  });
}
