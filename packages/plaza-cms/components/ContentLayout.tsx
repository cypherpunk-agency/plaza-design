import { ContentNav } from './ContentNav';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { Menu } from '../types';

interface ContentLayoutProps {
  menu: Menu;
  content: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function ContentLayout({
  menu,
  content,
  currentPath,
  onNavigate,
  className
}: ContentLayoutProps) {
  return (
    <div className={`plaza-content-layout ${className || ''}`}>
      <ContentNav
        menu={menu}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
      <main className="plaza-content-main">
        <MarkdownRenderer content={content} />
      </main>
    </div>
  );
}
