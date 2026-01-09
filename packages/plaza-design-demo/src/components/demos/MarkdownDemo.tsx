import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const sampleMarkdown = `# Markdown Styling

The \`.plaza\` class provides terminal-style formatting for rendered markdown content.

## Headings

Headings use the primary/accent color palette with uppercase transforms.

### Third Level

H3 uses accent color for visual hierarchy.

#### Fourth Level

H4 returns to neutral heading color.

---

## Text Formatting

Regular paragraph text uses the body color with relaxed line height.

**Bold text** highlights in primary color. *Italic text* uses the accent color for emphasis.

> Blockquotes have a left border in the primary color. Use them for callouts or important notes.

---

## Links

Links use [accent colors with underline](https://example.com) and glow on hover.

---

## Lists

### Unordered

- First item with primary-colored marker
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered

1. First numbered item
2. Second numbered item
3. Third numbered item

---

## Code

Inline code: \`const theme = 'neon'\`

Code blocks with syntax highlighting:

\`\`\`typescript
interface Theme {
  name: string;
  primary: string;
  accent: string;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme.name);
}
\`\`\`

\`\`\`css
.plaza {
  color: var(--color-text-body);
  font-family: var(--font-mono);
}
\`\`\`

---

## Tables

| Token | Value | Usage |
|-------|-------|-------|
| \`--color-primary-500\` | Orange | Interactive elements |
| \`--color-accent-400\` | Cyan | Secondary highlights |
| \`--color-text-body\` | Warm gray | Body text |

---

## Horizontal Rule

The horizontal rule above uses a subtle primary-colored border.
`;

export function MarkdownDemo() {
  return (
    <div className="plaza">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (match) {
              return (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="plaza-code-block"
                >
                  {codeString}
                </SyntaxHighlighter>
              );
            }

            return (
              <code {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {sampleMarkdown}
      </ReactMarkdown>
    </div>
  );
}
