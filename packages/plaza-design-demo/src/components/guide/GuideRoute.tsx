import { useParams } from 'react-router-dom';
import { MarkdownPage } from './MarkdownPage';
import { guideContent, GuidePageKey } from '../../guide-content';

export function GuideRoute() {
  const { page } = useParams<{ page?: string }>();
  const key = (page || 'index') as GuidePageKey;
  const content = guideContent[key];

  if (!content) {
    return (
      <div className="markdown-page">
        <h1 style={{ color: 'var(--color-error)' }}>PAGE NOT FOUND</h1>
        <p>The guide page "{page}" does not exist.</p>
      </div>
    );
  }

  return <MarkdownPage content={content} />;
}
