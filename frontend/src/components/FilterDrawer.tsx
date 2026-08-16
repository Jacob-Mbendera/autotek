import { X, Filter } from 'lucide-react';
import { CardHeading } from './journal';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const FilterDrawer = ({ isOpen, onClose, children }: FilterDrawerProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-journal-ink/50 z-40 lg:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white border-r border-journal-ink z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-journal-hairline">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[18px]">Filters</CardHeading>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-journal-sand rounded-journal transition-colors"
              aria-label="Close filters"
            >
              <X className="h-4 w-4 text-journal-body" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
