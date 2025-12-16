'use client';

import { Product } from '@/types/vehicle';

interface VehicleDetailViewProps {
  vehicle: Product;
  onClose: () => void;
}

export default function VehicleDetailView({ vehicle, onClose }: VehicleDetailViewProps) {
  const primaryImage = vehicle.image_url;
  const hasValidImage = primaryImage && !primaryImage.toLowerCase().includes('.svg');

  return (
    <div className="h-full flex">
      {/* Left Panel - Image Area */}
      <div className="flex-1 bg-slate-800 relative">
        <div className="absolute top-4 left-4">
          <h2 className="text-2xl font-bold text-white">{vehicle.year} {vehicle.make} {vehicle.model}</h2>
        </div>
        
        <div className="h-full flex items-center justify-center p-8">
          {hasValidImage ? (
            <div className="relative w-full h-full max-w-2xl">
              <img
                src={primaryImage}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
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
          <h3 className="text-xl font-bold text-white">{vehicle.year} {vehicle.make} {vehicle.model} EX</h3>
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
          {vehicle.price && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Price</span>
              <span className="text-green-400 font-semibold text-lg">${vehicle.price.toLocaleString()}</span>
            </div>
          )}
          
          {vehicle.mileage && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Mileage</span>
              <span className="text-white">{vehicle.mileage.toLocaleString()} mi</span>
            </div>
          )}
          
          {vehicle.location && (
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-slate-400">Location</span>
              </div>
              <span className="text-white">{vehicle.location}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Body</span>
            <span className="text-white">Sedan</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Engine</span>
            <span className="text-white">1.8L 4Cyl Gasoline</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Transmission</span>
            <span className="text-white">Automatic</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Doors</span>
            <span className="text-white">4</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Exterior</span>
            <span className="text-white">Blue</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Interior</span>
            <span className="text-white">Gray cloth</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Dealer</span>
            <span className="text-white">Unknown Dealer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
