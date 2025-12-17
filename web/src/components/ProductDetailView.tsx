'use client';

import { Product } from '@/types/product';

interface ProductDetailViewProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailView({ product, onClose }: ProductDetailViewProps) {
  const primaryImage = product.image_url;
  const hasValidImage = primaryImage && !primaryImage.toLowerCase().includes('.svg');

  return (
    <div className="h-full flex">
      {/* Left Panel - Image Area */}
      <div className="flex-1 bg-slate-800 relative">
        <div className="absolute top-4 left-4">
          <h2 className="text-2xl font-bold text-white">{product.title || `${product.brand} ${product.model}`}</h2>
        </div>
        
        <div className="h-full flex items-center justify-center p-8">
          {hasValidImage ? (
            <div className="relative w-full h-full max-w-2xl">
              <img
                src={primaryImage}
                alt={product.title || `${product.brand} ${product.model}`}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-text')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-text text-slate-400 text-lg absolute inset-0 flex items-center justify-center text-center px-8';
                    fallback.textContent = 'No Image Found';
                    parent.appendChild(fallback);
                  }
                }}
              />
              {/* Show fallback text initially, will be hidden when image loads */}
              <div className="fallback-text text-slate-400 text-lg absolute inset-0 flex items-center justify-center text-center px-8">
                No Image Found
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-lg text-center px-8">
              No Image Found
            </div>
          )}
        </div>

        {/* Image counter badge */}
        <div className="absolute bottom-4 right-4">
          <div className="bg-slate-700 border border-slate-500 rounded-lg px-3 py-1">
            <span className="text-white text-sm font-medium">10</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Specifications */}
      <div className="w-80 bg-slate-900 border-l border-slate-600/30 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{product.title || `${product.brand} ${product.model}`}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-700 border border-slate-500 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {product.price && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Price</span>
              <span className="text-green-400 font-semibold text-lg">${product.price.toLocaleString()}</span>
            </div>
          )}
          
          {product.brand && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Brand</span>
              <span className="text-white">{product.brand}</span>
            </div>
          )}
          
          {product.source && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Retailer</span>
              <span className="text-white">{product.source}</span>
            </div>
          )}
          
          {product.rating && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Rating</span>
              <span className="text-white">{product.rating.toFixed(1)} ★</span>
            </div>
          )}
          
          {product.category && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Category</span>
              <span className="text-white capitalize">{product.category}</span>
            </div>
          )}
          
          {product.year && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Year</span>
              <span className="text-white">{product.year}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
