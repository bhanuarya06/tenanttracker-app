import { useState, useRef } from 'react';
import { Camera, X, Loader2, Star } from 'lucide-react';
import uploadService from '../../services/uploadService';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function MultiImageUpload({ value = [], onChange, max = 5 }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = max - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} images allowed`);
      return;
    }
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    try {
      const results = await Promise.all(toUpload.map((f) => uploadService.uploadImage(f)));
      const newImages = results.map((r, i) => ({
        url: r.url,
        caption: '',
        isPrimary: value.length === 0 && i === 0,
      }));
      onChange([...value, ...newImages]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    const updated = value.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const setPrimary = (index) => {
    const updated = value.map((img, i) => ({ ...img, isPrimary: i === index }));
    onChange(updated);
  };

  const updateCaption = (index, caption) => {
    const updated = value.map((img, i) => (i === index ? { ...img, caption } : img));
    onChange(updated);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Property Images ({value.length}/{max})
      </label>
      <div className="grid grid-cols-3 gap-3">
        {value.map((img, i) => (
          <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200">
            <img src={resolveUrl(img.url)} alt={img.caption || `Image ${i + 1}`} className="w-full h-28 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setPrimary(i)}
                title="Set as primary"
                className={`p-1 rounded-full ${img.isPrimary ? 'bg-amber-500 text-white' : 'bg-white/80 text-slate-700 hover:bg-amber-100'}`}
              >
                <Star size={14} fill={img.isPrimary ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="p-1 rounded-full bg-white/80 text-rose-600 hover:bg-rose-100"
              >
                <X size={14} />
              </button>
            </div>
            {img.isPrimary && (
              <span className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">Primary</span>
            )}
            <input
              type="text"
              value={img.caption}
              onChange={(e) => updateCaption(i, e.target.value)}
              placeholder="Caption"
              className="w-full text-xs p-1.5 border-t border-slate-200 focus:outline-none"
            />
          </div>
        ))}

        {value.length < max && (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary-400 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            ) : (
              <>
                <Camera size={20} className="text-slate-400" />
                <span className="text-xs text-slate-400 mt-1">Add image</span>
              </>
            )}
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFiles} />
    </div>
  );
}
