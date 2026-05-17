import React, { useState } from 'react';
import { uploadMhtmls } from '../api';

interface MhtmlUploadFormProps {
  onUploadComplete: () => void;
}

const MhtmlUploadForm: React.FC<MhtmlUploadFormProps> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setMessage('Please select files to upload.');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading...');

    try {
      const response = await uploadMhtmls(files);
      setMessage(response.message || `Successfully uploaded ${files.length} files.`);
      onUploadComplete(); // Refresh the post list
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed. Please check the console for details.');
    } finally {
      setIsUploading(false);
      setFiles(null);
      // Clear the file input
      const fileInput = document.getElementById('mhtml-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  return (
    <div className="mhtml-upload-form">
      <h3>Import MHTML Files</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="mhtml-upload">Select MHTML files:</label>
          <input
            type="file"
            id="mhtml-upload"
            multiple
            onChange={handleFileChange}
            accept=".mhtml,.mht"
          />
        </div>
        <button type="submit" className="form-button" disabled={!files || isUploading}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <p className="upload-message">{message}</p>}
    </div>
  );
};

export default MhtmlUploadForm;
