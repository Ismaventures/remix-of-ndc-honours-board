import { useState, useCallback, useMemo } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Image as ImageIcon, Loader2, Edit2 } from 'lucide-react';
import { Personnel } from '@/types/domain';
import { BatchImagePersonnelEditor } from './BatchImagePersonnelEditor';
import { supabase } from '@/lib/supabaseClient';

interface ImageWithPersonnel {
  file: File;
  preview: string;
  personnelId: string | null;
  personnelName: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedUrl?: string;
}

interface BatchImageUploadEnhancedProps {
  personnel: Personnel[];
  onClose: () => void;
  onUploadComplete: (updated: string[]) => void;
  onUpdatePersonnel: (id: string, data: Partial<Personnel>) => Promise<void>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BATCH_IMAGES = 15;

export function BatchImageUploadEnhanced({
  personnel,
  onClose,
  onUploadComplete,
  onUpdatePersonnel,
}: BatchImageUploadEnhancedProps) {
  const [images, setImages] = useState<ImageWithPersonnel[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [uploadStep, setUploadStep] = useState<'assign' | 'editing'>('assign');

  const selectedImage = useMemo(() => {
    return selectedImageIndex !== null ? images[selectedImageIndex] : null;
  }, [images, selectedImageIndex]);

  const uploadedPersonnelPairs = useMemo(() => {
    return images
      .filter(img => img.status === 'success' && img.personnelId && img.uploadedUrl)
      .map(img => ({
        imageUrl: img.uploadedUrl!,
        personnel: personnel.find(p => p.id === img.personnelId)!,
      }))
      .filter(pair => pair.personnel);
  }, [images, personnel]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((files: FileList) => {
    setIsDragging(false);
    const newImages: ImageWithPersonnel[] = [];

    for (let i = 0; i < files.length; i++) {
      if (images.length + newImages.length >= MAX_BATCH_IMAGES) {
        break;
      }

      const file = files[i];

      // Validate format
      if (!ALLOWED_FORMATS.includes(file.type)) {
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push({
          file,
          preview: e.target?.result as string,
          personnelId: null,
          personnelName: null,
          status: 'pending',
        });

        if (images.length + newImages.length === 1) {
          setSelectedImageIndex(0);
        }

        setImages(prev => [...prev, ...newImages]);
        newImages.length = 0;
      };
      reader.readAsDataURL(file);
    }
  }, [images.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const assignPersonnel = (imageIndex: number, personnelId: string | null) => {
    setImages(prev =>
      prev.map((img, idx) => {
        if (idx === imageIndex) {
          const person = personnelId ? personnel.find(p => p.id === personnelId) : null;
          return {
            ...img,
            personnelId,
            personnelName: person?.name ?? null,
          };
        }
        return img;
      })
    );
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
    if (selectedImageIndex === index) {
      setSelectedImageIndex(images.length > 1 ? 0 : null);
    }
  };

  const uploadImages = async () => {
    setUploading(true);
    const uploadedPersonnelIds: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      if (!img.personnelId) {
        setImages(prev =>
          prev.map((image, idx) =>
            idx === i
              ? { ...image, status: 'error', error: 'No personnel selected' }
              : image
          )
        );
        continue;
      }

      setImages(prev =>
        prev.map((image, idx) =>
          idx === i ? { ...image, status: 'uploading' } : image
        )
      );

      try {
        const fileName = `${img.file.name}-${Date.now()}`;
        const filePath = `personnel/${img.personnelId}-${fileName}`;

        // Verify Supabase is configured
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing. Please check environment variables.');
        }

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('personnel-images')
          .upload(filePath, img.file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          // Provide helpful error messages
          if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
            throw new Error('Storage bucket "personnel-images" not found. Please ensure it exists in Supabase storage and is set to public.');
          }
          throw uploadError;
        }

        // Generate image URL
        const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/personnel-images`;
        const imageUrl = `${baseUrl}/${filePath}`;

        setImages(prev =>
          prev.map((image, idx) =>
            idx === i
              ? { ...image, status: 'success', uploadedUrl: imageUrl }
              : image
          )
        );

        uploadedPersonnelIds.push(img.personnelId);
      } catch (error) {
        setImages(prev =>
          prev.map((image, idx) =>
            idx === i
              ? {
                  ...image,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : image
          )
        );
      }
    }

    setUploading(false);

    // Update personnel records with image URLs
    for (const img of images) {
      if (img.status === 'success' && img.personnelId && img.uploadedUrl) {
        await onUpdatePersonnel(img.personnelId, { imageUrl: img.uploadedUrl });
      }
    }

    if (uploadedPersonnelIds.length > 0) {
      // Move to editing step if there are uploaded images
      if (uploadedPersonnelPairs.length > 0) {
        setUploadStep('editing');
      } else {
        onUploadComplete(uploadedPersonnelIds);
      }
    }
  };

  const handleSavePersonnelChanges = async (changes: Record<string, Partial<Personnel>>) => {
    for (const [personnelId, updates] of Object.entries(changes)) {
      await onUpdatePersonnel(personnelId, updates);
    }
  };

  const handleEditComplete = async () => {
    const uploadedIds = images
      .filter(img => img.status === 'success' && img.personnelId)
      .map(img => img.personnelId!);
    
    onUploadComplete(uploadedIds);
  };

  const stats = {
    total: images.length,
    assigned: images.filter(img => img.personnelId).length,
    uploaded: images.filter(img => img.status === 'success').length,
  };

  if (uploadStep === 'editing' && uploadedPersonnelPairs.length > 0) {
    return (
      <BatchImagePersonnelEditor
        imagedPersonnel={uploadedPersonnelPairs}
        onSaveChanges={handleSavePersonnelChanges}
        onClose={handleEditComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-orange-500" />
            Batch Image Upload & Edit
          </h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          {/* Upload Area */}
          {images.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-slate-600 bg-slate-800/50 hover:border-orange-500/50'
              }`}
            >
              <Upload className="h-12 w-12 mx-auto mb-3 text-orange-500" />
              <p className="text-white font-medium mb-2">Drag images here or click to select</p>
              <p className="text-sm text-slate-400 mb-4">
                JPG, PNG, WebP, or GIF • Max 10MB each • Up to {MAX_BATCH_IMAGES} images
              </p>
              <input
                type="file"
                multiple
                accept={ALLOWED_FORMATS.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="inline-block">
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  Select Images
                </button>
              </label>
            </div>
          )}

          {/* Stats */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-slate-400">Total Images</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
                <p className="text-2xl font-bold text-blue-400">{stats.assigned}</p>
                <p className="text-sm text-slate-400">Assigned</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700">
                <p className="text-2xl font-bold text-green-400">{stats.uploaded}</p>
                <p className="text-sm text-slate-400">Uploaded</p>
              </div>
            </div>
          )}

          {/* Image Grid and Detail Panel */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {/* Grid */}
              <div className="col-span-1 flex flex-col gap-2 max-h-96 overflow-y-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative group rounded-lg overflow-hidden border-2 aspect-square transition-all ${
                      selectedImageIndex === idx
                        ? 'border-orange-500'
                        : 'border-slate-700 hover:border-orange-500/50'
                    }`}
                  >
                    <img
                      src={img.preview}
                      alt={`Preview ${idx}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-medium">#{idx + 1}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      disabled={uploading}
                      className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                    <div className="absolute bottom-1 right-1">
                      {img.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                      {img.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                      {img.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Detail Panel */}
              {selectedImage && (
                <div className="col-span-3 flex flex-col gap-4">
                  {/* Preview */}
                  <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                    <img
                      src={selectedImage.preview}
                      alt="Selected"
                      className="w-full h-64 object-contain bg-black"
                    />
                  </div>

                  {/* File Info */}
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">File: {selectedImage.file.name}</p>
                    <p className="text-sm text-slate-400">
                      Size: {(selectedImage.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* Personnel Assignment */}
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex-1">
                    <label className="block text-sm font-medium text-white mb-3">
                      Assign to Personnel
                    </label>
                    <select
                      value={selectedImage.personnelId || ''}
                      onChange={(e) =>
                        assignPersonnel(
                          selectedImageIndex!,
                          e.target.value || null
                        )
                      }
                      disabled={uploading}
                      className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                    >
                      <option value="">-- Select personnel --</option>
                      {personnel.map(person => (
                        <option key={person.id} value={person.id}>
                          {person.rank} {person.name} ({person.category})
                        </option>
                      ))}
                    </select>

                    {selectedImage.personnelId && (
                      <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-sm text-green-300">
                        ✓ Assigned to {selectedImage.personnelName}
                      </div>
                    )}

                    {selectedImage.status === 'error' && (
                      <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-300 flex gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{selectedImage.error}</span>
                      </div>
                    )}

                    {selectedImage.status === 'success' && (
                      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300 flex gap-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>Uploaded successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {images.length > 0 && (
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = ALLOWED_FORMATS.join(',');
                input.onchange = (e) => handleFileSelect(e as any);
                input.click();
              }}
              disabled={uploading || images.length >= MAX_BATCH_IMAGES}
              className="px-4 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              Add More
            </button>
          )}
          <button
            onClick={uploadImages}
            disabled={uploading || images.filter(img => img.personnelId).length === 0}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {images.filter(img => img.personnelId).length} Images
              </>
            )}
          </button>
          {stats.uploaded > 0 && (
            <button
              onClick={() => setUploadStep('editing')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Records ({stats.uploaded})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
