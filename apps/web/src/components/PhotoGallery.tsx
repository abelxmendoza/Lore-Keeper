import { useState, useCallback, useRef } from 'react';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';

import { Button } from './ui/button';
import { Card } from './ui/card';

interface PhotoMetadata {
  photoId: string;
  url: string;
  metadata: {
    latitude?: number;
    longitude?: number;
    locationName?: string;
    dateTime?: string;
    people?: string[];
  };
  autoEntry?: {
    id: string;
    content: string;
    tags: string[];
  };
}

interface PhotoGalleryProps {
  onPhotoUploaded?: (photo: PhotoMetadata) => void;
}

export const PhotoGallery = ({ onPhotoUploaded }: PhotoGalleryProps) => {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await import('../lib/supabase').then(m => m.supabase).then(s => s.auth.getSession());
      if (!session) return;

      const response = await fetch('/api/photos', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { session } } = await import('../lib/supabase').then(m => m.supabase).then(s => s.auth.getSession());
      if (!session) {
        alert('Please sign in to upload photos');
        return;
      }

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('photos', file);
      });

      const response = await fetch('/api/photos/upload/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos((prev) => [...data.photos, ...prev]);
        data.photos.forEach((photo: PhotoMetadata) => {
          if (onPhotoUploaded) onPhotoUploaded(photo);
        });
        alert(`Uploaded ${data.photos.length} photo(s)!`);
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCameraClick = () => {
    // For mobile devices, this will trigger native camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: false, audio: false })
        .then(() => {
          // Camera access granted, but we'll use file input for photo capture
          fileInputRef.current?.click();
        })
        .catch(() => {
          // Fallback to file input
          fileInputRef.current?.click();
        });
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Photo Gallery</h3>
          <p className="text-xs text-white/60 mt-1">
            Upload photos to auto-generate journal entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCameraClick}
            disabled={uploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {loading ? (
        <div className="text-center py-8 text-white/60">Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No photos yet. Upload photos to get started!</p>
          <p className="text-xs mt-2">Photos will auto-generate journal entries with location and metadata.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div key={photo.photoId} className="relative group">
              <img
                src={photo.url}
                alt="Photo"
                className="w-full aspect-square object-cover rounded-lg border border-border/60"
              />
              {photo.metadata.locationName && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 rounded-b-lg">
                  <p className="text-xs text-white truncate">📍 {photo.metadata.locationName}</p>
                </div>
              )}
              {photo.autoEntry && (
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-2 flex items-center justify-center">
                  <p className="text-xs text-white text-center line-clamp-3">
                    {photo.autoEntry.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

