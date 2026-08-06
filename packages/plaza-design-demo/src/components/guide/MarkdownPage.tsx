import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Link } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownPageProps {
  content: string;
}

// The guide pages cross-link each other as sibling markdown files, which is
// correct on GitHub but resolves to /01_philosophy.md here — a path with no
// route behind it, so the SPA fallback serves the shell and renders nothing.
// Map those onto the routes that actually exist and leave every other href
// (external, absolute, anchor) untouched.
function guideRouteFor(href: string): string | null {
  if (!href || href.startsWith('/') || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return null;
  }
  const match = /^\.{0,2}\/?(?:\d+_)?([a-z0-9-]+)\.md$/i.exec(href);
  if (!match) return null;
  const slug = match[1].toLowerCase();
  // README is the index page, which lives at /guide itself.
  return slug === 'readme' ? '/guide' : `/guide/${slug}`;
}

export function MarkdownPage({ content }: MarkdownPageProps) {
  return (
    <article className="plaza">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a({ href, children, ...props }) {
            const route = guideRouteFor(href ?? '');
            if (route) {
              return <Link to={route}>{children}</Link>;
            }
            return (
              <a href={href} {...props}>
                {children}
              </a>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            // Check if this is a code block (has language) or inline code
            if (match) {
              return (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="markdown-code-block"
                >
                  {codeString}
                </SyntaxHighlighter>
              );
            }

            // Inline code
            return (
              <code className="markdown-inline-code" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
