import React from 'react';
import type { Post } from '../types';
import TweetCard from './TweetCard'; 

interface PostListProps {
  posts: Post[];
  // 必要に応じてクリックハンドラを親から受け取るよう追加
  onPostClick?: (postId: number, url: string) => void;
}

const PostList: React.FC<PostListProps> = ({ posts, onPostClick }) => {
  return (
    <div className="post-list">
      <h2>Posts</h2>
      {posts.length > 0 ? (
        posts.map(post => (
          // 2. PostItem から TweetCard に変更
          // TweetCard が期待するプロパティ (post, onCardClick 等) を渡す
          <TweetCard 
            key={post.id} 
            post={post} 
            pageContext="index" 
            onCardClick={onPostClick}
          />
        ))
      ) : (
        <p>No posts found.</p>
      )}
    </div>
  );
};

export default PostList;