'use client';

import { Product } from '@/types/vehicle';
import { useVehicleImages } from '@/hooks/useVehicleImages';

interface CarGridProps {
  vehicles: Product[];
  onCarSelect: (car: Product) => void;
}

export default function CarGrid({ vehicles, onCarSelect }: CarGridProps) {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Recommended Vehicles
        </h2>
        <p className="text-slate-600">
          {vehicles.length} vehicles found based on your preferences
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-slate-500 bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-sky-200/50">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
            <p className="text-sm">Try adjusting your search criteria or ask the agent for recommendations.</p>
            <p className="text-xs mt-2 text-slate-400">
              Only showing vehicles with complete information matching your filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle, index) => (
            <CarCard 
              key={vehicle.id || `vehicle-${index}`} 
              vehicle={vehicle} 
              onCarSelect={onCarSelect} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CarCardProps {
  vehicle: Product;
  onCarSelect: (car: Product) => void;
}

function CarCard({ vehicle, onCarSelect }: CarCardProps) {
  const { images, loading } = useVehicleImages(vehicle.vin);
  const displayImage = images[0]?.url || vehicle.image_url;

  return (
    <div
      onClick={() => onCarSelect(vehicle)}
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
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
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
        
        <div className="absolute top-3 right-3 bg-gradient-to-r from-emerald-500 to-sky-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          {vehicle.year}
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-slate-800 mb-1">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        
        {vehicle.trim && (
          <p className="text-sm text-slate-600 mb-3 font-medium">{vehicle.trim}</p>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-emerald-600">
            {vehicle.price ? `$${vehicle.price.toLocaleString()}` : 'Check with dealership'}
          </span>
          {vehicle.mileage && (
            <span className="text-sm text-slate-500 font-medium">
              {typeof vehicle.mileage === 'number' ? vehicle.mileage.toLocaleString() : vehicle.mileage} mi
            </span>
          )}
        </div>
        
        <div className="space-y-2 text-sm text-slate-600 flex-1">
          {vehicle.location && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {vehicle.location}
            </div>
          )}
          
          {vehicle.fuel_economy && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {vehicle.fuel_economy.combined} MPG combined
            </div>
          )}
          
          {vehicle.safety_rating && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {vehicle.safety_rating.overall}/5 Safety Rating
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