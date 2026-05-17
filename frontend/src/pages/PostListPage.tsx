import { useState, useEffect, useCallback, useRef } from 'react';
import type { Post, Tag } from '../types';
import { getPosts, getTags } from '../api';
import TweetCard from '../components/TweetCard';
import { useSearchParams } from 'react-router-dom';

const PAGE_LIMIT = 10;

function PostListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchParams, setSearchParams] = useSearchParams();

  const loader = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const tagsParam = searchParams.get('tags');
  const selectedTags = tagsParam ? tagsParam.split(',') : [];

  const fetchPosts = useCallback(async (currentPage: number, currentTags?: string | null, currentSortOrder?: 'asc' | 'desc') => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const skip = (currentPage - 1) * PAGE_LIMIT;
      // @ts-ignore
      const fetchedPosts = await getPosts(currentTags || undefined, skip, PAGE_LIMIT, currentSortOrder);

      if (currentPage === 1) {
        setPosts(fetchedPosts);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = fetchedPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }

      if (fetchedPosts.length < PAGE_LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      setError('Failed to fetch posts.');
      console.error(err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // タグ取得 (初回のみ)
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        const tags = await getTags();
        setAllTags(tags);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    fetchAllTags();
  }, []);

  // スクロール監視
  useEffect(() => {
    const handleObserver = (entities: IntersectionObserverEntry[]) => {
      const target = entities[0];
      if (target.isIntersecting && !loading && hasMore) {
        setPage(prev => prev + 1);
      }
    };

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 1.0
    });

    if (loader.current) {
      observer.observe(loader.current);
    }

    return () => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [loading, hasMore]);

  // ページ変更時に追加データをフェッチ
  useEffect(() => {
    if (page > 1) {
      fetchPosts(page, tagsParam, sortOrder);
    }
  }, [page]);

  // 検索条件変更時にリセットして初回データをフェッチ
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchPosts(1, tagsParam, sortOrder);
  }, [tagsParam, sortOrder, fetchPosts]);

  const toggleTag = (tagName: string) => {
    let newTags: string[];
    if (selectedTags.includes(tagName)) {
      newTags = selectedTags.filter(t => t !== tagName);
    } else {
      newTags = [...selectedTags, tagName];
    }

    const newParams: Record<string, string> = newTags.length > 0 ? { tags: newTags.join(',') } : {};
    setSearchParams(newParams);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'asc' | 'desc');
  };

  return (
    <div>
      <div className="filter-controls">
        <div className="tag-filter-accordion">
          <button 
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="tag-filter-button"
          >
            {isAccordionOpen ? '▼ タグフィルタを閉じる' : '▶ タグで絞り込む (複数選択可)'}
          </button>
          
          {isAccordionOpen && (
            <div className="tag-selection-area">
              {allTags.map(tag => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`tag-button ${isSelected ? 'selected' : ''}`}
                  >
                    {isSelected ? '✓ ' : '+ '} {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sort-options">
          <label htmlFor="sort-order">表示順:</label>
          <select id="sort-order" value={sortOrder} onChange={handleSortChange}>
            <option value="desc">新しい順</option>
            <option value="asc">古い順</option>
          </select>
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="selected-tags-container">
          <strong>Selected Tags: </strong>
          {selectedTags.map(tag => (
            <span key={tag} className="selected-tag">
              {tag}
            </span>
          ))}
          <button onClick={() => setSearchParams({})} className="clear-tags-button">Clear All</button>
        </div>
      )}
      
      {error && <p className="error-message">{error}</p>}

      <div className="post-list-grid">
        {posts.map(post => (
          <TweetCard 
            key={post.id} 
            post={post} 
            // @ts-ignore
            onTagClick={toggleTag} 
          />
        ))}
      </div>

      <div ref={loader} style={{ height: '50px', margin: '20px' }}>
        {loading && <p>Loading more posts...</p>}
        {!loading && !hasMore && posts.length > 0 && <p>これ以上投稿はありません。</p>}
      </div>
    </div>
  );
}

export default PostListPage;