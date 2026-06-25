import { Link } from 'react-router-dom';
import { Images } from 'lucide-react';
import { AdminCard } from '../../components/ui/AdminCard';
import { H1, Body } from '../../components/ui/Typography';
import { MediaLibraryPanel } from '../../components/admin/MediaLibraryPanel';

export const AdminMediaLibrary = () => {
  return (
    <div className="space-y-6">
      <div>
        <H1 className="text-2xl font-bold text-gray-50 flex items-center gap-2">
          <Images className="h-7 w-7 text-teal-500" />
          Media library
        </H1>
        <Body className="text-gray-400 mt-2 max-w-2xl">
          Upload and browse shared product images stored in Cloudinary. Delete unused images here; images
          still linked to a product must be removed from that product first. To attach images, open{' '}
          <Link to="/admin/products" className="text-teal-500 hover:text-teal-400 underline">
            Products
          </Link>
          , edit a product, and use <span className="text-gray-300">Assign selected</span> in the library
          section of the form.
        </Body>
      </div>

      <AdminCard className="p-6">
        <MediaLibraryPanel layout="page" />
      </AdminCard>
    </div>
  );
};
