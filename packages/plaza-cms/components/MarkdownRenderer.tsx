import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { parseFrontmatter } from '../frontmatter';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showTitle?: boolean;
}

export function MarkdownRenderer({ content, className, showTitle = false }: MarkdownRendererProps) {
  const { metadata, content: body } = parseFrontmatter(content);

  return (
    <article className={`plaza ${className || ''}`}>
      {showTitle && metadata.title && (
        <h1 className="plaza-title">{metadata.title}</h1>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {body}
      </ReactMarkdown>
    </article>
  );
}
