export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-journal border border-journal-hairline overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-square bg-journal-sand">
        <div className="w-full h-full bg-journal-hairline"></div>
      </div>

      {/* Content skeleton */}
      <div className="p-4">
        {/* Brand/Category skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-16 bg-journal-hairline rounded"></div>
          <div className="h-3 w-1 bg-journal-hairline rounded"></div>
          <div className="h-3 w-20 bg-journal-hairline rounded"></div>
        </div>

        {/* Title skeleton */}
        <div className="h-5 w-3/4 bg-journal-hairline rounded mb-2"></div>
        <div className="h-5 w-1/2 bg-journal-hairline rounded mb-4"></div>

        {/* Description skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-3 w-full bg-journal-divider rounded"></div>
          <div className="h-3 w-5/6 bg-journal-divider rounded"></div>
        </div>

        {/* Price skeleton */}
        <div className="flex items-baseline gap-2 mb-4">
          <div className="h-7 w-32 bg-journal-hairline rounded"></div>
          <div className="h-4 w-20 bg-journal-divider rounded"></div>
        </div>

        {/* Button skeleton */}
        <div className="h-10 w-full bg-journal-hairline rounded"></div>
      </div>
    </div>
  );
};

export const ProductCardListSkeleton = () => {
  return (
    <div className="bg-white rounded-journal border border-journal-hairline overflow-hidden animate-pulse flex flex-row">
      {/* Image skeleton */}
      <div className="w-40 sm:w-48 flex-shrink-0 bg-journal-hairline"></div>

      {/* Content skeleton */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-16 bg-journal-hairline rounded"></div>
            <div className="h-3 w-1 bg-journal-hairline rounded"></div>
            <div className="h-3 w-20 bg-journal-hairline rounded"></div>
          </div>

          <div className="h-6 w-3/4 bg-journal-hairline rounded mb-2"></div>
          <div className="h-4 w-full bg-journal-divider rounded mb-2"></div>
          <div className="h-4 w-5/6 bg-journal-divider rounded"></div>
        </div>

        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-journal-hairline rounded"></div>
          <div className="h-10 w-32 bg-journal-hairline rounded"></div>
        </div>
      </div>
    </div>
  );
};
