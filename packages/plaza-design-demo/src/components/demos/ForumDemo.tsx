import { useState } from 'react';
import './ForumDemo.css';

interface Post {
  id: number;
  title: string;
  author: string;
  timestamp: string;
  content: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  tags: string[];
}

interface Comment {
  id: number;
  author: string;
  content: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  replies?: Comment[];
}

const posts: Post[] = [
  {
    id: 1,
    title: 'RFC: New Validator Selection Algorithm',
    author: '0xA3F2...8C91',
    timestamp: '2h ago',
    content: 'Proposing a new weighted random selection for validators that considers stake age and previous performance metrics...',
    upvotes: 47,
    downvotes: 3,
    commentCount: 23,
    tags: ['RFC', 'CONSENSUS'],
  },
  {
    id: 2,
    title: 'Bug Report: Memory leak in sync module',
    author: '0xB7E1...4D22',
    timestamp: '5h ago',
    content: 'Found a memory leak when syncing large blocks. Memory grows unbounded after ~10k blocks. Reproduced on v0.9.2.',
    upvotes: 31,
    downvotes: 0,
    commentCount: 15,
    tags: ['BUG', 'SYNC'],
  },
  {
    id: 3,
    title: 'Discussion: Reducing block time to 3s',
    author: '0xC9D4...7F33',
    timestamp: '1d ago',
    content: 'With recent optimizations, we could potentially reduce block time. What are the trade-offs we should consider?',
    upvotes: 89,
    downvotes: 12,
    commentCount: 67,
    tags: ['DISCUSSION', 'PERFORMANCE'],
  },
];

const comments: Comment[] = [
  {
    id: 1,
    author: '0xD2E5...1A44',
    content: 'Great proposal! Have you considered the impact on smaller validators? They might struggle with the new requirements.',
    timestamp: '1h ago',
    upvotes: 12,
    downvotes: 1,
    replies: [
      {
        id: 2,
        author: '0xA3F2...8C91',
        content: 'Good point. We could add a grace period for validators below a certain stake threshold.',
        timestamp: '45m ago',
        upvotes: 8,
        downvotes: 0,
      },
      {
        id: 3,
        author: '0xE6F7...2B55',
        content: 'I think the grace period should be at least 30 days to give small validators time to adjust.',
        timestamp: '30m ago',
        upvotes: 5,
        downvotes: 2,
      },
    ],
  },
  {
    id: 4,
    author: '0xF8G9...3C66',
    content: 'What about the impact on network security? More frequent rotations could increase attack surface.',
    timestamp: '30m ago',
    upvotes: 6,
    downvotes: 0,
  },
];

export function ForumDemo() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(posts[0]);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});

  const handleVote = (type: 'post' | 'comment', id: number, direction: 'up' | 'down') => {
    const key = `${type}-${id}`;
    setUserVotes(prev => ({
      ...prev,
      [key]: prev[key] === direction ? null : direction
    }));
  };

  const getVoteState = (type: 'post' | 'comment', id: number) => {
    return userVotes[`${type}-${id}`] || null;
  };

  return (
    <div className="forum-demo">
      <header className="forum-demo__header">
        <h1 className="text-2xl font-semibold text-primary-400 uppercase tracking-widest">
          Forum / HackerNews
        </h1>
        <p className="text-gray-500 mt-2">
          Threaded discussions with voting and nested comments
        </p>
      </header>

      <div className="forum-layout">
        {/* Post List */}
        <div className="forum-posts">
          <div className="forum-posts__header">
            <span className="text-primary-500">THREADS</span>
            <span className="text-gray-600 ml-2">// {posts.length} ACTIVE</span>
          </div>

          <div className="post-list">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`post-card ${selectedPost?.id === post.id ? 'post-card--selected' : ''}`}
                onClick={() => setSelectedPost(post)}
              >
                <div className="post-card__votes">
                  <button
                    className={`vote-btn vote-btn--up ${getVoteState('post', post.id) === 'up' ? 'vote-btn--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleVote('post', post.id, 'up'); }}
                  >
                    ^
                  </button>
                  <span className="vote-count">{post.upvotes - post.downvotes}</span>
                  <button
                    className={`vote-btn vote-btn--down ${getVoteState('post', post.id) === 'down' ? 'vote-btn--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleVote('post', post.id, 'down'); }}
                  >
                    v
                  </button>
                </div>

                <div className="post-card__content">
                  <h3 className="post-card__title">{post.title}</h3>
                  <div className="post-card__meta">
                    <span className="text-accent-400">{post.author}</span>
                    <span className="text-gray-600">{post.timestamp}</span>
                    <span className="text-gray-500">{post.commentCount} comments</span>
                  </div>
                  <div className="post-card__tags">
                    {post.tags.map(tag => (
                      <span key={tag} className="post-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thread Detail */}
        <div className="forum-detail">
          {selectedPost && (
            <div className="plaza-window">
              <div className="plaza-corner-bracket plaza-corner-bracket--top-left"></div>
              <div className="plaza-corner-bracket plaza-corner-bracket--top-right"></div>
              <div className="plaza-corner-bracket plaza-corner-bracket--bottom-left"></div>
              <div className="plaza-corner-bracket plaza-corner-bracket--bottom-right"></div>

              <div className="plaza-window-header">
                <span className="text-primary-500">THREAD #{selectedPost.id}</span>
                <span className="text-gray-600 ml-2">// {selectedPost.commentCount} REPLIES</span>
              </div>

              <div className="thread-content">
                <h2 className="thread-title">{selectedPost.title}</h2>
                <div className="thread-meta">
                  <span className="text-accent-400">{selectedPost.author}</span>
                  <span className="text-gray-600">{selectedPost.timestamp}</span>
                </div>
                <p className="thread-body">{selectedPost.content}</p>

                <div className="thread-actions">
                  <button className="plaza-btn plaza-btn--secondary">REPLY</button>
                  <button className="plaza-btn plaza-btn--secondary">SHARE</button>
                </div>

                <div className="comments-section">
                  <div className="comments-header">
                    <span className="text-primary-500">COMMENTS</span>
                  </div>

                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onVote={handleVote}
                      getVoteState={getVoteState}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  depth = 0,
  onVote,
  getVoteState,
}: {
  comment: Comment;
  depth?: number;
  onVote: (type: 'post' | 'comment', id: number, direction: 'up' | 'down') => void;
  getVoteState: (type: 'post' | 'comment', id: number) => 'up' | 'down' | null;
}) {
  return (
    <div className="comment" style={{ marginLeft: `${depth * 24}px` }}>
      <div className="comment__votes">
        <button
          className={`vote-btn vote-btn--sm ${getVoteState('comment', comment.id) === 'up' ? 'vote-btn--active' : ''}`}
          onClick={() => onVote('comment', comment.id, 'up')}
        >
          ^
        </button>
        <span className="vote-count-sm">{comment.upvotes - comment.downvotes}</span>
        <button
          className={`vote-btn vote-btn--sm ${getVoteState('comment', comment.id) === 'down' ? 'vote-btn--active' : ''}`}
          onClick={() => onVote('comment', comment.id, 'down')}
        >
          v
        </button>
      </div>

      <div className="comment__content">
        <div className="comment__meta">
          <span className="text-accent-400">{comment.author}</span>
          <span className="text-gray-600">{comment.timestamp}</span>
        </div>
        <p className="comment__body">{comment.content}</p>
        <button className="comment__reply">REPLY</button>
      </div>

      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          onVote={onVote}
          getVoteState={getVoteState}
        />
      ))}
    </div>
  );
}
