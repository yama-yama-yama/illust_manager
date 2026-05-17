import React, { useState, useEffect } from 'react';
import type { Post, Tag } from '../types';
import { getTags, updatePostTags } from '../api';
import './TagEditor.css';

interface TagEditorProps {
  post: Post;
  onTagsUpdate: (updatedPost: Post) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ post, onTagsUpdate }) => {
  const [currentTags, setCurrentTags] = useState<string[]>(() => post.tags.map(t => t.name));
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 全タグリストを取得
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        const fetchedTags = await getTags();
        setAllTags(fetchedTags);
      } catch (err) {
        console.error("Failed to fetch all tags", err);
      }
    };
    fetchAllTags();
  }, []);
  
  // 編集中のタグを削除
  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
  };

  // 新しいタグを追加
  const handleAddTag = () => {
    const newTag = newTagInput.trim();
    if (newTag && !currentTags.includes(newTag)) {
      setCurrentTags([...currentTags, newTag]);
    }
    setNewTagInput('');
  };

  // サジェストされたタグを追加
  const handleAddSuggestedTag = (tagName: string) => {
    if (!currentTags.includes(tagName)) {
        setCurrentTags([...currentTags, tagName]);
    }
  }

  // 変更を保存
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updatedPost = await updatePostTags(post.id, currentTags);
      onTagsUpdate(updatedPost); // 親コンポーネントのstateを更新
    } catch (err) {
      setError('Failed to update tags.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };
  
  // サジェストするタグのリスト（現在設定されていないもの）
  const suggestedTags = allTags.filter(tag => !currentTags.includes(tag.name));

  return (
    <div className="tag-editor">
      <h3>Edit Tags</h3>
      
      {/* 現在のタグ */}
      <div className="current-tags-container">
        {currentTags.length > 0 ? (
          currentTags.map(tag => (
            <span key={tag} className="tag-badge">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="remove-tag-btn">&times;</button>
            </span>
          ))
        ) : (
          <p>No tags assigned.</p>
        )}
      </div>

      {/* タグ追加フォーム */}
      <div className="add-tag-form">
        <input 
          type="text"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          placeholder="Add a new tag"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
        />
        <button onClick={handleAddTag} className="form-button">Add</button>
      </div>

      {/* タグサジェスト */}
      {suggestedTags.length > 0 && (
        <div className="suggested-tags">
            <h4>Available Tags</h4>
            <div className="tag-suggestion-list">
                {suggestedTags.map(tag => (
                    <button key={tag.id} onClick={() => handleAddSuggestedTag(tag.name)} className="suggested-tag-btn">
                        + {tag.name}
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* 保存ボタンとエラーメッセージ */}
      <div className="editor-footer">
        <button onClick={handleSave} disabled={isSaving} className="form-button save-button">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default TagEditor;
