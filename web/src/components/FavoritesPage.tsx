'use client';

import { Product } from '@/types/vehicle';

interface FavoritesPageProps {
  favorites: Vehicle[];
  onToggleFavorite: (vehicle: Vehicle) => void;
  isFavorite: (vehicleId: string) => boolean;
  onItemSelect: (vehicle: Vehicle) => void;
  onClose: () => void;
}

export default function FavoritesPage({ favorites, onToggleFavorite, isFavorite, onItemSelect, onClose }: FavoritesPageProps) {
  const primaryImage = (vehicle: Product) => vehicle.image_url;
  const hasValidImage = (vehicle: Product) => {
    const img = primaryImage(vehicle);
    return img && !img.toLowerCase().includes('.svg');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h1 className="text-2xl font-bold text-black border-b border-[#8b959e]/30 pb-2">Favorites</h1>
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white border border-[#8b959e]/40 rounded-lg flex items-center justify-center hover:bg-[#8b959e]/5 transition-all duration-200 shadow-sm"
        >
          <svg className="w-5 h-5 text-[#8b959e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-2">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-[#8b959e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-[#8b959e] text-base">No favorites yet</p>
            <p className="text-[#8b959e] text-sm mt-1">Start liking vehicles to see them here</p>
          </div>
        ) : (
          <div className="flex items-center justify-start gap-4 h-full">
              {favorites.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-xl p-4 w-[250px] h-full max-h-[300px] border border-[#8b959e]/30 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  {/* Image */}
                  <div className="aspect-[3/2] bg-gradient-to-br from-[#750013]/30 to-white rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                    {hasValidImage(vehicle) ? (
                      <>
                        <img
                          src={primaryImage(vehicle)}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
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
                      </>
                    ) : (
                      <div className="text-[#8b959e] text-base flex items-center justify-center text-center px-2">
                        No Image Found
                      </div>
                    )}
                    
                    {/* Heart button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(vehicle);
                      }}
                      className="absolute top-2 left-2 w-8 h-8 bg-white border border-[#8b959e]/40 rounded-full flex items-center justify-center hover:border-[#ff1323] hover:shadow-md transition-all duration-200 z-20 shadow-sm"
                    >
                      <svg 
                        className={`w-5 h-5 transition-all duration-200 ${isFavorite(vehicle.id) ? 'text-[#ff1323] fill-[#ff1323]' : 'text-[#8b959e]'}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-black mb-1 leading-tight">
                      {vehicle.title || `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || 'Product'}
                    </h4>
                    {(vehicle.brand || vehicle.source) && (
                      <p className="text-xs text-[#8b959e]">
                        {[vehicle.brand, vehicle.source].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    
                    <div className="space-y-1 text-sm">
                      {(vehicle.price_text || vehicle.price) && (
                        <div className="flex justify-between border-l-4 border-l-[#750013] pl-2">
                          <span className="text-[#8b959e]">Price:</span>
                          <span className="font-bold text-black text-right max-w-[120px] truncate">
                            {vehicle.price_text || (vehicle.price ? `$${vehicle.price.toLocaleString()}` : 'N/A')}
                          </span>
                        </div>
                      )}
                      
                      {vehicle.rating && (
                        <div className="flex justify-between text-xs">
                          <span className="text-[#8b959e]">Rating:</span>
                          <span className="text-black text-right max-w-[120px] truncate">
                            {vehicle.rating.toFixed(1)} ★{vehicle.rating_count ? ` (${vehicle.rating_count.toLocaleString()})` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => onItemSelect(vehicle)}
                      className="w-full bg-[#750013] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#8b1320] transition-all duration-200 shadow-sm hover:shadow-md mt-3"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

