import React from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../types';
import './TweetCard.css';

const stopPropagation = (e: React.MouseEvent) => {
  e.stopPropagation();
};

const linkify = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hashtagRegex = /#(\w+)/g;
  const mentionRegex = /@(\w+)/g;

  return text
    .replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${url}</a>`)
    .replace(hashtagRegex, (match, tag) => `<a href="https://twitter.com/hashtag/${tag}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${match}</a>`)
    .replace(mentionRegex, (match, user) => `<a href="https://twitter.com/${user}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${match}</a>`);
};

// 引数の型を string | null | undefined に拡張
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// エラーの原因：親から渡されるプロパティが不足していた
interface TweetCardProps {
  post: Post;
  pageContext?: string; // 追加
  onCardClick?: (postId: number, url: string) => void; // 追加
  onTagClick?: (tagName: string) => void;
}

const TweetCard: React.FC<TweetCardProps> = ({ post, onTagClick }) => {
  // media_urls が配列であることを明示的に判定
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
  const hasMedia = mediaUrls.length > 0;
  const mediaCount = mediaUrls.length;

  const imageGridClass = `image-grid image-grid-${Math.min(mediaCount, 4)}`;

  const handleTagClick = (e: React.MouseEvent, tagName: string) => {
    if (onTagClick) {
      e.preventDefault();
      e.stopPropagation();
      onTagClick(tagName);
    }
  };

  return (
    <Link to={`/posts/${post.id}`} className="tweet-card-link">
      <div className="tweet-card">
        <div className="tweet-header">
          {post.author_avatar_url && (
            <img src={post.author_avatar_url} alt={`${post.author_name}'s avatar`} className="tweet-avatar" />
          )}
          <div className="tweet-author">
            <span className="author-name">{post.author_name || 'Unknown Author'}</span>
            <span className="author-screen-name">@{post.author_screen_name || 'unknown'}</span>
          </div>
          <a href={post.url} className="tweet-view-on-x" target="_blank" rel="noopener noreferrer nofollow" title="View on X" onClick={stopPropagation}>
              X
          </a>
        </div>
        
        {post.text ? (
          <p className="tweet-text" dangerouslySetInnerHTML={{ __html: linkify(post.text) }} />
        ) : (
          <p className="tweet-text-unavailable">Tweet text not available.</p>
        )}

        {hasMedia ? (
          <div className={imageGridClass}>
            {mediaUrls.map((url: string, index: number) => (
              <div key={index} className="image-container">
                <a href={url} target="_blank" rel="noopener noreferrer" onClick={stopPropagation}>
                  <img 
                    src={url} 
                    alt={`Tweet media ${index + 1}`} 
                    className="tweet-image" 
                    style={mediaCount === 1 ? { objectFit: 'contain', backgroundColor: '#f0f2f5' } : {}}
                  />
                </a>
              </div>
            ))}
          </div>
        ) : (
          post.embed_html && (
            <div 
              className="tweet-embed-container"
              style={{ margin: '1rem 0' }}
              dangerouslySetInnerHTML={{ __html: post.embed_html }}
            />
          )
        )}

        <div className="tweet-footer">
            <time className="tweet-date">{formatDate(post.posted_at)}</time>
            <div className="tweet-tags">
              {(post.tags || []).map(tag => (
                <span 
                  key={tag.id} 
                  className="tweet-tag"
                  style={onTagClick ? { cursor: 'pointer' } : {}}
                  onClick={(e) => handleTagClick(e, tag.name)}
                >
                  {tag.name}
                </span>
              ))}
            </div>
        </div>
      </div>
    </Link>
  );
};

export default TweetCard;