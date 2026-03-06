'use client';

import { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export function MediaUpload({
  onUpload,
  label = 'Upload Image',
  accept = 'image/jpeg,image/png,image/webp,image/gif',
}: {
  onUpload: (url: string) => void;
  label?: string;
  accept?: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { url } = await res.json();
      setPreview(url);
      onUpload(url);
      toast({ title: 'Image uploaded' });
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File must be under 5MB', variant: 'destructive' });
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    handleUpload(file);
  };

  const handleClear = () => {
    setPreview(null);
    onUpload('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <Input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <Image
            src={preview}
            alt="Preview"
            width={400}
            height={250}
            className="w-full h-48 object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <ImageIcon className="w-8 h-8" />
          )}
          <span className="text-sm font-medium">
            {uploading ? 'Uploading...' : label}
          </span>
          <span className="text-xs">JPEG, PNG, WebP, GIF up to 5MB</span>
        </button>
      )}
    </div>
  );
}
