import React from 'react';
import type { Post } from '../types';

interface PostItemProps {
  post: Post;
}

const PostItem: React.FC<PostItemProps> = ({ post }) => {
  return (
    <div className="post-item">
      <p className="post-item-url">
        <strong>URL:</strong> <a href={post.url} target="_blank" rel="noopener noreferrer">{post.url}</a>
      </p>
      <div className="post-item-tags">
        <strong>Tags:</strong>
        {post.tags.length > 0 ? (
          <ul>
            {post.tags.map(tag => (
              <li key={tag.id}>
                {tag.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No tags</p>
        )}
      </div>
      {post.folder && (
        <div className="post-item-folder">
          <strong>Folder:</strong> {post.folder.name}
        </div>
      )}
    </div>
  );
};

export default PostItem;
