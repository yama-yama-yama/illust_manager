import React, { useState } from 'react';

interface AddPostFormProps {
    onAddPost: (url: string, tags: string) => void;
}

const AddPostForm: React.FC<AddPostFormProps> = ({ onAddPost }) => {
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('URL is required');
      return;
    } 

    // ここでは split せず、入力文字列(tags)をそのまま渡す
    onAddPost(url, tags); 
    setUrl('');
    setTags('');
  };

  return (
    <form onSubmit={handleSubmit} className="add-post-form">
      <h3>Add New Post</h3>
      <div className="form-group">
        <label htmlFor="url">URL:</label>
        <input
          type="text"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="tags">Tags (comma separated):</label>
        <input
          type="text"
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>
      <button type="submit" className="form-button">Add Post</button>
    </form>
  );
};

export default AddPostForm;
