import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { Post } from '../types';
import { getPost } from '../api';
import TweetCard from '../components/TweetCard';
import TagEditor from '../components/TagEditor'; // 作成したコンポーネントをインポート

function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedPost = await getPost(Number(postId));
        setPost(fetchedPost);
      } catch (err) {
        setError('Failed to fetch post details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // TagEditorからのコールバックでPostのStateを更新する
  const handleTagsUpdate = (updatedPost: Post) => {
    setPost(updatedPost);
  };

  if (loading) {
    return <div>Loading post...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!post) {
    return <div>Post not found.</div>;
  }

  return (
    <div className="post-detail-page">
      <TweetCard post={post} />
      <hr style={{ margin: '2rem 0' }} />
      <TagEditor post={post} onTagsUpdate={handleTagsUpdate} />
    </div>
  );
}

export default PostDetailPage;
