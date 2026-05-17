import { useState, useEffect, useCallback } from 'react';
import PostList from '../components/PostList';
import AddPostForm from '../components/AddPostForm';
import MhtmlUploadForm from '../components/MhtmlUploadForm';
import type { Post, PostCreate } from '../types';
import { getPosts, createPost } from '../api';

// --- HomePage メインコンポーネント ---
function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      const fetchedPosts = await getPosts();
      setPosts(fetchedPosts);
    } catch (err) {
      setError('Failed to fetch posts.');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleAddPost = async (url: string, tags: string) => {
    const postData: PostCreate = {
      url: url,
      // 文字列を配列に変換して送信
      tags: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
    };

    try {
      setError(null);
      const newPost = await createPost(postData);
      // 最新の投稿を一番上に追加
      setPosts(prevPosts => [newPost, ...prevPosts]);
    } catch (err) {
      setError('Failed to add post.');
      console.error(err);
    }
  };

  const handleUploadComplete = () => {
    console.log('Upload complete, refreshing posts...');
    fetchPosts();
  };

  return (
    <>
      <AddPostForm onAddPost={handleAddPost} />
      <MhtmlUploadForm onUploadComplete={handleUploadComplete} />
      {error && <p className="error-message">{error}</p>}
      <PostList posts={posts} />
    </>
  );
}

export default HomePage;