'use client';

import { Product } from '@/types/product';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-sky-200/50">
        <div className="sticky top-0 bg-gradient-to-r from-sky-500 to-emerald-500 text-white px-8 py-6 flex items-center justify-between z-10 shadow-lg rounded-t-2xl">
          <h2 className="text-3xl font-bold">
            {product.title || `${product.brand} ${product.model}`}
          </h2>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-8 py-3 rounded-xl transition-all duration-200 hover:scale-105 transform font-bold shadow-lg flex items-center space-x-3 border border-white/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Search</span>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title || `${product.brand} ${product.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-lg">No Image Available</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Price and Key Info */}
              <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-6 border border-emerald-200/50">
                <div className="text-4xl font-bold text-emerald-600 mb-3">
                  {product.price ? `$${product.price.toLocaleString()}` : 'Price N/A'}
                </div>
                {product.rating && (
                  <div className="text-slate-700 mb-2">
                    <span className="font-semibold text-slate-600">Rating:</span> {product.rating.toFixed(1)} ★
                    {product.rating_count && ` (${product.rating_count.toLocaleString()} reviews)`}
                  </div>
                )}
                {product.source && (
                  <div className="text-slate-700">
                    <span className="font-semibold text-slate-600">Retailer:</span> {product.source}
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Product Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {product.brand && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Brand</span>
                      <div className="font-bold text-slate-800">{product.brand}</div>
                    </div>
                  )}
                  {product.model && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Model</span>
                      <div className="font-bold text-slate-800">{product.model}</div>
                    </div>
                  )}
                  {product.category && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Category</span>
                      <div className="font-bold text-slate-800 capitalize">{product.category}</div>
                    </div>
                  )}
                  {product.year && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Year</span>
                      <div className="font-bold text-slate-800">{product.year}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="pt-6 border-t border-sky-200/50">
                  <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-6 border border-emerald-200/50">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description
                    </h3>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Link to retailer */}
              {product.link && (
                <div className="pt-6 border-t border-sky-200/50">
                  <a 
                    href={product.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-3 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 transform font-bold shadow-xl"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>View on {product.source || 'Retailer'}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
