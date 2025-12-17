'use client';

import { useState, useEffect, useRef } from 'react';
import { Product } from '@/types/product';

interface RecommendationCarouselProps {
  products: Product[];
  onItemSelect?: (product: Product) => void;
  showPlaceholders?: boolean;
  onToggleFavorite?: (product: Product) => void;
  isFavorite?: (productId: string) => boolean;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

interface ViewTimeData {
  productId: string;
  startTime: number;
  totalTime: number;
}

type DisplayCard = {
  position: number;
  isCenter: boolean;
  isPlaceholder: true;
} | {
  product: Product;
  position: number;
  isCenter: boolean;
  isPlaceholder: false;
};

export default function RecommendationCarousel({ products, onItemSelect, showPlaceholders = false, onToggleFavorite, isFavorite, currentIndex: controlledIndex, onIndexChange }: RecommendationCarouselProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;
  const setCurrentIndex = (index: number) => {
    if (controlledIndex !== undefined && onIndexChange) {
      onIndexChange(index);
    } else {
      setInternalIndex(index);
    }
  };
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const [viewTimes, setViewTimes] = useState<Record<string, number>>({});
  const startTimeRef = useRef<number>(Date.now());
  const isIdleRef = useRef<boolean>(false);

  // Reset to first item when new products are loaded (only if not controlled externally)
  useEffect(() => {
    if (products.length > 0 && controlledIndex === undefined) {
      setCurrentIndex(0);
    }
  }, [products, controlledIndex]);

  // Track viewing time for each product
  useEffect(() => {
    if (products.length === 0) return;

    const currentProduct = products[currentIndex];
    if (!currentProduct) return;

    startTimeRef.current = Date.now();

    // Check for user activity to detect idle state
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    let lastActivity = Date.now();

    const updateActivity = () => {
      lastActivity = Date.now();
      isIdleRef.current = false;
    };

    const checkIdle = () => {
      const now = Date.now();
      if (now - lastActivity > 30000) { // 30 seconds of inactivity
        isIdleRef.current = true;
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Check for idle every 5 seconds
    const idleInterval = setInterval(checkIdle, 5000);

    // Cleanup function to save time when component unmounts or product changes
    return () => {
      const endTime = Date.now();
      const viewDuration = endTime - startTimeRef.current;
      
      // Only count time if user wasn't idle
      if (!isIdleRef.current && viewDuration > 1000) { // At least 1 second of active viewing
        setViewTimes(prev => ({
          ...prev,
          [currentProduct.id]: (prev[currentProduct.id] || 0) + viewDuration
        }));

        // Send tracking data to analytics endpoint (you can implement this)
        console.log(`User viewed ${currentProduct.title || currentProduct.model} for ${viewDuration}ms`);
      }

      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(idleInterval);
    };
  }, [currentIndex, products]);

  const nextProduct = () => {
    if (products.length === 0 || isAnimating) return;
    
    setIsAnimating(true);
    setAnimationDirection('right');
    const newIndex = (currentIndex + 1) % products.length;
    setCurrentIndex(newIndex);
    
    setTimeout(() => {
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 500);
  };

  const prevProduct = () => {
    if (products.length === 0 || isAnimating) return;
    
    setIsAnimating(true);
    setAnimationDirection('left');
    const newIndex = (currentIndex - 1 + products.length) % products.length;
    setCurrentIndex(newIndex);
    
    setTimeout(() => {
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 500);
  };

  // Use the showPlaceholders prop to determine if we should show placeholder cards
  const currentProduct = !showPlaceholders ? products[currentIndex] : null;

  // Get the 3 cards to display (current, next, previous)
  const getDisplayCards = (): DisplayCard[] => {
    if (showPlaceholders) {
      // Return 3 placeholder cards
      return [
        { position: -1, isCenter: false, isPlaceholder: true },
        { position: 0, isCenter: true, isPlaceholder: true },
        { position: 1, isCenter: false, isPlaceholder: true }
      ];
    }
    
    const cards: DisplayCard[] = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + products.length) % products.length;
      cards.push({
        product: products[index],
        position: i,
        isCenter: i === 0,
        isPlaceholder: false
      });
    }
    return cards;
  };

  const displayCards = getDisplayCards();

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Carousel Container */}
      <div className="relative flex items-center justify-center flex-1 overflow-hidden">
        {/* Left Arrow */}
        <button
          onClick={prevProduct}
          disabled={isAnimating || products.length <= 1 || showPlaceholders}
          className="absolute left-0 z-10 w-12 h-12 rounded-full bg-white border border-[#8b959e]/40 flex items-center justify-center hover:bg-[#8b959e]/5 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          <svg className="w-6 h-6 text-[#750013]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Three Item Cards */}
        <div className="flex items-center justify-center space-x-4">
          {displayCards.map((card, idx) => (
            <div
              key={card.isPlaceholder ? `placeholder-${idx}` : `${card.product.id}-${idx}`}
              className={`transition-all duration-500 ease-out ${
                card.isCenter
                  ? 'transform rotate-0 translate-x-0 scale-100 z-10'
                  : card.position === -1
                    ? 'transform rotate-2 translate-x-2 scale-95 opacity-70 z-0'
                    : 'transform -rotate-2 -translate-x-2 scale-95 opacity-70 z-0'
              } ${
                isAnimating && card.isCenter
                  ? 'transform -rotate-8 -translate-x-4 scale-90 z-10'
                  : ''
              }`}
            >
              <div className="bg-white rounded-xl p-4 w-[280px] h-full max-h-[360px] border border-[#8b959e]/30 shadow-sm flex flex-col overflow-hidden">
                {card.isPlaceholder ? (
                  /* Placeholder Card Content */
                  <>
                            <div className="aspect-[3/2] bg-gradient-to-br from-[#750013]/30 to-white rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                              <div className="text-[#8b959e] text-base opacity-50 text-center px-2">Future Recommendations</div>
                            </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-[#8b959e] mb-2 leading-tight">
                        Your recommendations will appear here
                      </h4>
                      <div className="space-y-1 text-base">
                        <div className="flex justify-between">
                          <span className="text-[#8b959e]">Price:</span>
                          <span className="text-[#8b959e]">---</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b959e]">Mileage:</span>
                          <span className="text-[#8b959e]">---</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b959e]">Location:</span>
                          <span className="text-[#8b959e]">---</span>
                        </div>
                      </div>
                      <button 
                        disabled
                        className="w-full bg-[#8b959e]/30 text-[#8b959e] py-2 rounded-lg text-base font-medium cursor-not-allowed mt-3"
                      >
                        Get Recommendations
                      </button>
                    </div>
                  </>
        ) : (
          /* Real Item Card Content */
          <ProductCard 
            product={card.product} 
            onItemSelect={onItemSelect} 
            index={(currentIndex + card.position + products.length) % products.length + 1}
            isCenter={card.isCenter}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
          />
        )}
                      </div>
                    </div>
                  ))}
                </div>

        {/* Right Arrow */}
        <button
          onClick={nextProduct}
          disabled={isAnimating || products.length <= 1 || showPlaceholders}
          className="absolute right-0 z-10 w-12 h-12 rounded-full bg-white border border-[#8b959e]/40 flex items-center justify-center hover:bg-[#8b959e]/5 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          <svg className="w-6 h-6 text-[#750013]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ProductCard component
function ProductCard({ product, onItemSelect, index, onToggleFavorite, isFavorite }: { 
  product: Product; 
  onItemSelect?: (product: Product) => void;
  index?: number;
  isCenter?: boolean;
  onToggleFavorite?: (product: Product) => void;
  isFavorite?: (productId: string) => boolean;
}) {
  const primaryImage = product.image_url;
  const hasValidImage = primaryImage && !primaryImage.toLowerCase().includes('.svg');

  const displayTitle = product.title || `${product.make ?? ''} ${product.model ?? ''}`.trim() || 'Product';
  const subtitleParts = [product.brand, product.source].filter(Boolean);
  const displaySubtitle = subtitleParts.join(' • ');

  const displayPrice = product.price_text
    || (typeof product.price === 'number' ? `$${product.price.toLocaleString()}` : undefined);
  const ratingText = product.rating
    ? `${product.rating.toFixed(1)} ★${product.rating_count ? ` (${product.rating_count.toLocaleString()})` : ''}`
    : undefined;

  return (
      <>
      <div className="aspect-[3/2] bg-gradient-to-br from-[#750013]/30 to-white rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
        {hasValidImage ? (
          <>
            <img
              src={primaryImage}
              alt={displayTitle}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide the image if it fails to load and show the emoji instead
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.fallback-text')) {
                                      const fallback = document.createElement('div');
                                      fallback.className = 'fallback-text text-[#8b959e] text-base absolute inset-0 flex items-center justify-center text-center px-2';
                                      fallback.textContent = 'No Image Found';
                                      parent.appendChild(fallback);
                                    }
              }}
              onLoad={(e) => {
                // Hide fallback text when image loads successfully
                const target = e.target as HTMLImageElement;
                const parent = target.parentElement;
                const fallback = parent?.querySelector('.fallback-text');
                if (fallback) {
                  fallback.remove();
                }
              }}
            />
            {/* Show fallback text initially, will be hidden when image loads */}
            <div className="fallback-text text-[#8b959e] text-base absolute inset-0 flex items-center justify-center text-center px-2">
              No Image Found
            </div>
          </>
        ) : (
            <div className="text-[#8b959e] text-base flex items-center justify-center text-center px-2">
              No Image Found
            </div>
        )}
        
        {/* Heart button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product);
            }}
            className="absolute top-2 left-2 w-8 h-8 bg-white border border-[#8b959e]/40 rounded-full flex items-center justify-center hover:border-[#ff1323] hover:shadow-md transition-all duration-200 z-20 shadow-sm"
          >
            <svg 
              className={`w-5 h-5 transition-all duration-200 ${isFavorite && isFavorite(product.id) ? 'text-[#ff1323] fill-[#ff1323]' : 'text-[#8b959e]'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
        
        {/* Number indicator - show on all cards */}
        {index && (
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-[#750013] text-[#750013] rounded-lg flex items-center justify-center text-base font-bold shadow-sm">
            {index}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h4 className="text-lg font-bold text-black leading-tight">
          {displayTitle}
        </h4>

        {displaySubtitle && (
          <p className="text-sm text-[#8b959e]">{displaySubtitle}</p>
        )}
        
        <div className="space-y-1 text-base">
          {displayPrice && (
            <div className="flex justify-between">
              <span className="text-[#8b959e]">Price:</span>
              <span className="font-bold text-black text-right max-w-[160px] truncate">
                {displayPrice}
              </span>
            </div>
          )}
          
          {product.link && (
            <div className="flex justify-between">
              <span className="text-[#8b959e]">Store:</span>
              <span className="text-black text-right max-w-[160px] truncate">{product.source || 'Online'}</span>
            </div>
          )}
          
          {ratingText && (
            <div className="flex justify-between">
              <span className="text-[#8b959e]">Rating:</span>
              <span className="text-black text-right max-w-[160px] truncate">{ratingText}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => onItemSelect && onItemSelect(product)}
          className="w-full bg-[#750013] text-white py-2 rounded-lg text-base font-medium hover:bg-[#8b1320] transition-all duration-200 shadow-sm hover:shadow-md mt-3"
        >
          View Details
        </button>
      </div>
    </>
  );
}
