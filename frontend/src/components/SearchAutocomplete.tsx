import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, TrendingUp, Package } from 'lucide-react';
import { useGetProductsQuery } from '../store/api/productApi';
import { Body } from './ui/Typography';

interface SearchAutocompleteProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSelect: (term: string) => void;
  className?: string;
}

export const SearchAutocomplete = ({
  searchTerm,
  onSearchTermChange,
  onSelect,
  className = '',
}: SearchAutocompleteProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error parsing recent searches:', error);
      }
    }
  }, []);

  // Fetch suggestions when search term changes
  const { data: suggestionsData } = useGetProductsQuery(
    {
      search: searchTerm,
      limit: 5,
    },
    { skip: !searchTerm || searchTerm.length < 2 }
  );

  const suggestions = suggestionsData?.products || [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (value: string) => {
    onSearchTermChange(value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleSelect = (term: string) => {
    onSelect(term);
    setShowSuggestions(false);
    
    // Save to recent searches
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    const totalItems = suggestions.length + (recentSearches.length > 0 && !searchTerm ? recentSearches.length : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex].name);
      } else {
        const recentIndex = selectedIndex - suggestions.length;
        handleSelect(recentSearches[recentIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const displaySuggestions = searchTerm.length >= 2 ? suggestions : [];
  const showRecentSearches = !searchTerm && recentSearches.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for brake pads, oil filters, spark plugs..."
          className="w-full pl-14 pr-4 py-4 text-base border-2 border-gray-200 focus:border-teal-500 shadow-lg hover:shadow-xl transition-all rounded-lg outline-none"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (displaySuggestions.length > 0 || showRecentSearches) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {/* Product Suggestions */}
          {displaySuggestions.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <TrendingUp className="h-3 w-3" />
                Suggestions
              </div>
              {displaySuggestions.map((product, index) => (
                <Link
                  key={product._id}
                  to={`/products/${product._id}`}
                  onClick={() => handleSelect(product.name)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-teal-50 transition-colors ${
                    index === selectedIndex ? 'bg-teal-50' : ''
                  }`}
                >
                  <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Body className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </Body>
                    <Body className="text-xs text-gray-500">
                      {product.category} • MWK {product.price.toLocaleString()}
                    </Body>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {showRecentSearches && (
            <div className="p-2 border-t border-gray-200">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <Clock className="h-3 w-3" />
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(search)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-teal-50 transition-colors text-left ${
                    index + displaySuggestions.length === selectedIndex ? 'bg-teal-50' : ''
                  }`}
                >
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <Body className="text-sm text-gray-700">{search}</Body>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
