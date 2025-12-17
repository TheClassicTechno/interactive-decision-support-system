'use client';

import { Product } from '@/types/product';
import { useProductImages } from '@/hooks/useProductImages';

interface ProductGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
}

export default function ProductGrid({ products, onProductSelect }: ProductGridProps) {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Recommended Products
        </h2>
        <p className="text-slate-600">
          {products.length} products found based on your preferences
        </p>
      </div>

      {products.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-slate-500 bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-sky-200/50">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-sm">Try adjusting your search criteria or ask the agent for recommendations.</p>
            <p className="text-xs mt-2 text-slate-400">
              Only showing products with complete information matching your filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <ProductCard 
              key={product.id || `product-${index}`} 
              product={product} 
              onProductSelect={onProductSelect} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onProductSelect: (product: Product) => void;
}

function ProductCard({ product, onProductSelect }: ProductCardProps) {
  const { images, loading } = useProductImages(product.vin);
  const displayImage = images[0]?.url || product.image_url;

  return (
    <div
      onClick={() => onProductSelect(product)}
      className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-sky-200/50 hover:border-emerald-300/50 hover:scale-105 transform flex flex-col h-full"
    >
      <div className="aspect-video bg-gradient-to-br from-sky-100 to-emerald-100 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
              <div className="text-sm font-medium">Loading image...</div>
            </div>
          </div>
        ) : displayImage ? (
          <img
            src={displayImage}
            alt={product.title || `${product.brand} ${product.model}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        <div className={`w-full h-full flex items-center justify-center text-slate-500 ${displayImage ? 'hidden' : ''}`}>
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-sm font-medium">No Image Available</div>
          </div>
        </div>
        
        {product.year && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-emerald-500 to-sky-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            {product.year}
          </div>
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-slate-800 mb-1">
          {product.title || `${product.brand} ${product.model}`}
        </h3>
        
        {product.brand && (
          <p className="text-sm text-slate-600 mb-3 font-medium">{product.brand}</p>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-emerald-600">
            {product.price ? `$${product.price.toLocaleString()}` : 'Price N/A'}
          </span>
          {product.rating && (
            <span className="text-sm text-slate-500 font-medium">
              {product.rating.toFixed(1)} ★
            </span>
          )}
        </div>
        
        <div className="space-y-2 text-sm text-slate-600 flex-1">
          {product.source && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {product.source}
            </div>
          )}
          
          {product.category && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="capitalize">{product.category}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-sky-200/50">
          <button className="w-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-sky-600 transition-all duration-200 hover:scale-105 transform font-semibold shadow-lg">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
