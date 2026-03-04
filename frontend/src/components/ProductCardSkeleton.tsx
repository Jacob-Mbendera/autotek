export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-w-1 aspect-h-1 bg-gradient-to-br from-gray-200 to-gray-300">
        <div className="w-full h-56 bg-gray-300"></div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-5">
        {/* Brand/Category skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 w-16 bg-gray-300 rounded"></div>
          <div className="h-3 w-1 bg-gray-300 rounded"></div>
          <div className="h-3 w-20 bg-gray-300 rounded"></div>
        </div>
        
        {/* Title skeleton */}
        <div className="h-5 w-3/4 bg-gray-300 rounded mb-2"></div>
        <div className="h-5 w-1/2 bg-gray-300 rounded mb-4"></div>
        
        {/* Description skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-3 w-full bg-gray-200 rounded"></div>
          <div className="h-3 w-5/6 bg-gray-200 rounded"></div>
        </div>
        
        {/* Price skeleton */}
        <div className="flex items-baseline gap-2 mb-4">
          <div className="h-8 w-32 bg-gray-300 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        
        {/* Button skeleton */}
        <div className="h-10 w-full bg-gray-300 rounded"></div>
      </div>
    </div>
  );
};

export const ProductCardListSkeleton = () => {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden animate-pulse flex flex-row">
      {/* Image skeleton */}
      <div className="w-48 h-48 flex-shrink-0 bg-gray-300"></div>
      
      {/* Content skeleton */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-16 bg-gray-300 rounded"></div>
            <div className="h-3 w-1 bg-gray-300 rounded"></div>
            <div className="h-3 w-20 bg-gray-300 rounded"></div>
          </div>
          
          <div className="h-6 w-3/4 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-300 rounded"></div>
          <div className="h-10 w-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );
};
