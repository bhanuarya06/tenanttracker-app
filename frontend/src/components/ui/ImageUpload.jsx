import { useState, useRef } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import uploadService from '../../services/uploadService';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function ImageUpload({ value, onChange, shape = 'circle', className = '' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setUploading(true);
    try {
      const data = await uploadService.uploadImage(file);
      onChange(data.url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const resolved = resolveUrl(value);
  const isCircle = shape === 'circle';

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 hover:border-primary-400 transition-colors
          ${isCircle ? 'w-28 h-28 rounded-full' : 'w-full h-40 rounded-xl'}
          ${resolved ? 'border-solid border-slate-200' : ''}`}
      >
        {resolved ? (
          <img src={resolved} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Camera size={24} />
            <span className="text-xs mt-1">Upload</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {resolved && !uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 shadow"
        >
          <X size={14} />
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}
