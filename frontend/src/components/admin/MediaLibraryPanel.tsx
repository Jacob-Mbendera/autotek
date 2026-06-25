import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetMediaAssetsQuery,
  useUploadMediaLibraryMutation,
  useAssignMediaToProductMutation,
  useDeleteMediaAssetMutation,
} from '../../store/api/productApi';
import type { MediaAsset, Product, ProductImage } from '../../store/api/productApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Body } from '../ui/Typography';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Check, Loader2, Trash2, Upload } from 'lucide-react';

export interface MediaLibraryPanelProps {
  /** Skip fetching when parent is hidden (e.g. closed modal). */
  enabled?: boolean;
  layout?: 'page' | 'compact';
  assignToProductId?: string;
  onProductUpdated?: (product: Product) => void;
  className?: string;
}

export const MediaLibraryPanel = ({
  enabled = true,
  layout = 'compact',
  assignToProductId,
  onProductUpdated,
  className = '',
}: MediaLibraryPanelProps) => {
  const dispatch = useAppDispatch();
  const isPage = layout === 'page';
  const pageSize = isPage ? 24 : 12;

  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryDebounced, setLibraryDebounced] = useState('');
  const [libraryPage, setLibraryPage] = useState(1);
  const [selectedLibrary, setSelectedLibrary] = useState<Record<string, ProductImage>>({});
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const libraryFileInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaData, isFetching: isMediaFetching } = useGetMediaAssetsQuery(
    { page: libraryPage, limit: pageSize, q: libraryDebounced },
    { skip: !enabled }
  );
  const [uploadToLibrary, { isLoading: isUploadingLibrary }] = useUploadMediaLibraryMutation();
  const [assignMediaToProduct, { isLoading: isAssigningMedia }] = useAssignMediaToProductMutation();
  const [deleteMediaAsset, { isLoading: isDeletingMedia }] = useDeleteMediaAssetMutation();

  useEffect(() => {
    const t = setTimeout(() => setLibraryDebounced(libraryQuery), 350);
    return () => clearTimeout(t);
  }, [libraryQuery]);

  useEffect(() => {
    if (!enabled) return;
    setLibraryPage(1);
  }, [libraryDebounced, enabled]);

  useEffect(() => {
    if (!assignToProductId) {
      setSelectedLibrary({});
    }
  }, [assignToProductId]);

  const handleLibraryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
      ? Array.from(e.target.files).filter((f) => f.type.startsWith('image/'))
      : [];
    e.target.value = '';
    if (files.length === 0) return;
    try {
      const data = await uploadToLibrary({ files }).unwrap();
      const errTexts = data.results
        .filter((r) => !r.ok && r.error)
        .map((r) => r.error as string);
      const unique = [...new Set(errTexts)];
      const hint =
        unique.length > 0
          ? ` ${unique.slice(0, 3).join('; ')}${unique.length > 3 ? '…' : ''}`
          : '';
      const message = `Media library: ${data.summary.ok} uploaded, ${data.summary.failed} failed.${hint}`.slice(
        0,
        500
      );
      dispatch(
        showNotification({
          message,
          type:
            data.summary.failed > 0 && data.summary.ok === 0
              ? 'error'
              : data.summary.failed
                ? 'info'
                : 'success',
        })
      );
    } catch (err: unknown) {
      dispatch(
        showNotification({
          message: getErrorInfo(err, 'Media library upload failed.').message,
          type: 'error',
        })
      );
    }
  };

  const toggleLibrarySelect = (asset: { url: string; blurDataUrl?: string }) => {
    if (!assignToProductId) return;
    setSelectedLibrary((prev) => {
      const next = { ...prev };
      if (next[asset.url]) {
        delete next[asset.url];
      } else {
        next[asset.url] = { url: asset.url, blurDataUrl: asset.blurDataUrl };
      }
      return next;
    });
  };

  const handleAssignLibrary = async () => {
    if (!assignToProductId) return;
    const assets = Object.values(selectedLibrary);
    if (assets.length === 0) return;
    try {
      const { product } = await assignMediaToProduct({
        productId: assignToProductId,
        assets,
      }).unwrap();
      onProductUpdated?.(product);
      setSelectedLibrary({});
      dispatch(showNotification({ message: 'Selected images assigned to this product.', type: 'success' }));
    } catch (err: unknown) {
      dispatch(
        showNotification({
          message: getErrorInfo(err, 'Could not assign images.').message,
          type: 'error',
        })
      );
    }
  };

  const formatDeleteError = (err: unknown): string => {
    const info = getErrorInfo(err, 'Could not delete image.');
    const data = (err as { data?: { message?: string; products?: { name: string }[] } })?.data;
    if (!data?.products?.length) return info.message;
    const names = data.products.map((p) => p.name).join(', ');
    const suffix = data.products.length >= 10 ? '…' : '';
    return `${data.message || info.message} Products: ${names}${suffix}`;
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMediaAsset(deleteTarget._id).unwrap();
      dispatch(showNotification({ message: 'Image removed from the media library.', type: 'success' }));
      setDeleteTarget(null);
    } catch (err: unknown) {
      dispatch(
        showNotification({
          message: formatDeleteError(err),
          type: 'error',
        })
      );
      setDeleteTarget(null);
    }
  };

  const selectedCount = Object.keys(selectedLibrary).length;
  const canAssign = Boolean(assignToProductId);

  const renderAssetTile = (asset: MediaAsset) => {
    const selected = Boolean(selectedLibrary[asset.url]);

    if (isPage) {
      return (
        <div
          key={asset._id}
          className="relative rounded-lg border-2 border-gray-700 overflow-hidden group"
        >
          <img
            src={asset.url}
            alt={asset.originalName || 'Library image'}
            className="w-full h-32 object-cover bg-slate-900"
          />
          <button
            type="button"
            aria-label={`Delete ${asset.originalName || 'image'}`}
            onClick={() => setDeleteTarget(asset)}
            className="absolute top-1 left-1 p-1.5 rounded-md bg-slate-900/90 text-gray-300 hover:text-red-400 hover:bg-slate-800 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {asset.originalName && (
            <span className="block px-2 py-1 text-xs text-gray-400 truncate bg-slate-900/90">
              {asset.originalName}
            </span>
          )}
        </div>
      );
    }

    return (
      <button
        key={asset._id}
        type="button"
        onClick={() => toggleLibrarySelect(asset)}
        disabled={!canAssign}
        className={`relative rounded-lg border-2 overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-500 text-left ${
          canAssign ? 'cursor-pointer' : 'cursor-default'
        } ${selected ? 'border-teal-500 ring-1 ring-teal-500/40' : 'border-gray-700'}`}
      >
        <img
          src={asset.url}
          alt={asset.originalName || 'Library image'}
          className="w-full h-24 object-cover bg-slate-900"
        />
        {selected && (
          <span className="absolute top-1 right-1 bg-teal-600 text-white rounded-full p-0.5">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!isPage && (
        <Body className="text-sm text-gray-400">
          Upload images once to the shared library. When editing a product, select thumbnails and assign
          them without renaming files to product ids.{' '}
          <Link to="/admin/media" className="text-teal-500 hover:text-teal-400 underline">
            Open full media library
          </Link>
        </Body>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={libraryFileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleLibraryFilesChange}
        />
        <Button
          type="button"
          variant="secondary"
          size="small"
          dark
          disabled={isUploadingLibrary}
          onClick={() => libraryFileInputRef.current?.click()}
          className="gap-2"
        >
          {isUploadingLibrary ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload to library
            </>
          )}
        </Button>
        {canAssign && selectedCount === 0 && (
          <Body className="text-xs text-gray-500">Select images below, then assign to this product.</Body>
        )}
        {!canAssign && !isPage && (
          <Body className="text-xs text-gray-500">Save the product first to assign library images to it.</Body>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <Input
            dark
            label="Search library"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            placeholder="Filter by file name or URL"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="small"
          dark
          disabled={isMediaFetching || libraryPage <= 1}
          onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="small"
          dark
          disabled={
            isMediaFetching ||
            !mediaData?.pagination ||
            libraryPage >= (mediaData.pagination.totalPages || 1)
          }
          onClick={() => setLibraryPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {isMediaFetching && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading library...
        </div>
      )}

      {!isMediaFetching && (mediaData?.assets || []).length === 0 && (
        <Body className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-700 rounded-lg">
          No images in the library yet. Upload files to get started.
        </Body>
      )}

      <div
        className={
          isPage
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'
            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1'
        }
      >
        {(mediaData?.assets || []).map((asset) => renderAssetTile(asset))}
      </div>

      {mediaData?.pagination && (
        <Body className="text-xs text-gray-500">
          Page {mediaData.pagination.page} of {mediaData.pagination.totalPages} ({mediaData.pagination.total}{' '}
          assets)
        </Body>
      )}

      {canAssign && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            dark
            disabled={selectedCount === 0 || isAssigningMedia}
            onClick={handleAssignLibrary}
          >
            {isAssigningMedia ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign selected (${selectedCount})`
            )}
          </Button>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete library image?"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.originalName || 'this image'}" from the shared library and Cloudinary? This cannot be undone. Images still assigned to products cannot be deleted.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        dark
        isLoading={isDeletingMedia}
      />
    </div>
  );
};
