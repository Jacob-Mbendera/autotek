import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let startPage = Math.max(2, currentPage - halfVisible);
      let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

      // Adjust if we're near the start
      if (currentPage <= halfVisible + 1) {
        endPage = Math.min(totalPages - 1, maxVisiblePages);
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - halfVisible) {
        startPage = Math.max(2, totalPages - maxVisiblePages + 1);
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('ellipsis-start');
      }

      // Add page numbers
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {/* First page button */}
      <Button
        variant="outline"
        size="small"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="min-w-[40px]"
        aria-label="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Previous page button */}
      <Button
        variant="outline"
        size="small"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="min-w-[40px]"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-gray-500"
            >
              ...
            </span>
          );
        }

        const pageNum = page as number;
        const isActive = pageNum === currentPage;

        return (
          <Button
            key={pageNum}
            variant={isActive ? 'primary' : 'outline'}
            size="small"
            onClick={() => onPageChange(pageNum)}
            className={`min-w-[40px] ${
              isActive
                ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                : 'hover:bg-teal-50 hover:border-teal-300'
            }`}
            aria-label={`Page ${pageNum}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {pageNum}
          </Button>
        );
      })}

      {/* Next page button */}
      <Button
        variant="outline"
        size="small"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="min-w-[40px]"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last page button */}
      <Button
        variant="outline"
        size="small"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage >= totalPages}
        className="min-w-[40px]"
        aria-label="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
