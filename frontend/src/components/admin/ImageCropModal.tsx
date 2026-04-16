import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Button } from '../ui/Button';
import { Body } from '../ui/Typography';
import { X } from 'lucide-react';

type AspectPreset = 'free' | '1:1' | '4:3' | '16:9';

const aspectValue = (preset: AspectPreset): number | undefined => {
  switch (preset) {
    case '1:1':
      return 1;
    case '4:3':
      return 4 / 3;
    case '16:9':
      return 16 / 9;
    default:
      return undefined;
  }
};

async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  originalName: string,
  mimeType: string
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = Math.max(1, Math.floor(pixelCrop.width));
  canvas.height = Math.max(1, Math.floor(pixelCrop.height));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas export failed'));
      },
      mimeType,
      0.92
    );
  });

  const base = originalName.replace(/\.[^/.]+$/, '') || 'image';
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `${base}-cropped.${ext}`, { type: mimeType });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;
  });
}

export interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  fileName: string;
  mimeType: string;
  queuePosition?: number;
  queueTotal?: number;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

export const ImageCropModal = ({
  open,
  imageSrc,
  fileName,
  mimeType,
  queuePosition,
  queueTotal,
  onClose,
  onConfirm,
}: ImageCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('1:1');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspectPreset('1:1');
    setCroppedAreaPixels(null);
    setPreviewUrl(null);
    setIsWorking(false);
  }, [open, imageSrc]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handlePreview = async () => {
    if (!croppedAreaPixels) return;
    setIsWorking(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName, mimeType);
      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      // Preview failure is non-fatal; user can still try confirm.
    } finally {
      setIsWorking(false);
    }
  };

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsWorking(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName, mimeType);
      onConfirm(file);
    } finally {
      setIsWorking(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-gray-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <Body className="text-gray-50 font-semibold">
            Crop image
            {queuePosition && queueTotal ? ` (${queuePosition} of ${queueTotal})` : ''}
          </Body>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-300 hover:bg-slate-800"
            aria-label="Close crop modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['free', '1:1', '4:3', '16:9'] as AspectPreset[]).map((preset) => (
              <Button
                key={preset}
                type="button"
                size="small"
                variant={aspectPreset === preset ? 'primary' : 'secondary'}
                dark
                onClick={() => setAspectPreset(preset)}
              >
                {preset === 'free' ? 'Free' : preset}
              </Button>
            ))}
          </div>

          <div className="relative h-72 w-full overflow-hidden rounded-md bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectValue(aspectPreset)}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1" htmlFor="crop-zoom">
              Zoom
            </label>
            <input
              id="crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Body className="text-xs text-gray-400 mb-2">Preview (cropped)</Body>
              <div className="flex h-48 items-center justify-center rounded-md border border-gray-700 bg-slate-950">
                {previewUrl ? (
                  <img src={previewUrl} alt="Cropped preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Body className="text-sm text-gray-500 px-4 text-center">
                    Click &quot;Update preview&quot; to render the cropped result.
                  </Body>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button type="button" variant="secondary" dark onClick={handlePreview} disabled={isWorking}>
                Update preview
              </Button>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button type="button" variant="ghost" dark onClick={onClose} disabled={isWorking}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" dark onClick={handleConfirm} disabled={isWorking}>
                  Use cropped image
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
