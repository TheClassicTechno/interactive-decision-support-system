'use client';

import { Product } from '@/types/vehicle';

interface CarDetailModalProps {
  car: Product;
  onClose: () => void;
}

export default function CarDetailModal({ car, onClose }: CarDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-sky-200/50">
        <div className="sticky top-0 bg-gradient-to-r from-sky-500 to-emerald-500 text-white px-8 py-6 flex items-center justify-between z-10 shadow-lg rounded-t-2xl">
          <h2 className="text-3xl font-bold">
            {car.year} {car.make} {car.model}
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
                {car.image_url ? (
                  <img
                    src={car.image_url}
                    alt={`${car.year} ${car.make} ${car.model}`}
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
                  {car.price ? `$${car.price.toLocaleString()}` : 'Check with dealership'}
                </div>
                {car.mileage && (
                  <div className="text-slate-700 mb-2">
                    <span className="font-semibold text-slate-600">Mileage:</span> {typeof car.mileage === 'number' ? car.mileage.toLocaleString() : car.mileage} miles
                  </div>
                )}
                {car.location && (
                  <div className="text-slate-700">
                    <span className="font-semibold text-slate-600">Location:</span> {car.location}
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
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {car.trim && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Trim</span>
                      <div className="font-bold text-slate-800">{car.trim}</div>
                    </div>
                  )}
                  {car.body_style && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Body Style</span>
                      <div className="font-bold text-slate-800 capitalize">{car.body_style}</div>
                    </div>
                  )}
                  {car.engine && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Engine</span>
                      <div className="font-bold text-slate-800">{car.engine}</div>
                    </div>
                  )}
                  {car.transmission && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Transmission</span>
                      <div className="font-bold text-slate-800">{car.transmission}</div>
                    </div>
                  )}
                  {car.exterior_color && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Exterior Color</span>
                      <div className="font-bold text-slate-800">{car.exterior_color}</div>
                    </div>
                  )}
                  {car.interior_color && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Interior Color</span>
                      <div className="font-bold text-slate-800">{car.interior_color}</div>
                    </div>
                  )}
                  {car.doors && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Doors</span>
                      <div className="font-bold text-slate-800">{car.doors}</div>
                    </div>
                  )}
                  {car.seating_capacity && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                      <span className="text-sm font-semibold text-sky-600">Seating</span>
                      <div className="font-bold text-slate-800">{car.seating_capacity} passengers</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fuel Economy */}
              {car.fuel_economy && (
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Fuel Economy
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-4 border border-emerald-200/50">
                      <div className="text-3xl font-bold text-emerald-600">{car.fuel_economy.city}</div>
                      <div className="text-sm font-semibold text-slate-600">City MPG</div>
                    </div>
                    <div className="text-center bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-4 border border-emerald-200/50">
                      <div className="text-3xl font-bold text-emerald-600">{car.fuel_economy.highway}</div>
                      <div className="text-sm font-semibold text-slate-600">Highway MPG</div>
                    </div>
                    <div className="text-center bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-4 border border-emerald-200/50">
                      <div className="text-3xl font-bold text-emerald-600">{car.fuel_economy.combined}</div>
                      <div className="text-sm font-semibold text-slate-600">Combined MPG</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety Rating */}
              {car.safety_rating && (
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Safety Rating
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-4 border border-emerald-200/50">
                      <div className="text-3xl font-bold text-emerald-600">{car.safety_rating.overall}</div>
                      <div className="text-sm font-semibold text-slate-600">Overall Rating</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                        <div className="text-xl font-bold text-slate-800">{car.safety_rating.frontal}</div>
                        <div className="text-xs font-semibold text-slate-600">Frontal</div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                        <div className="text-xl font-bold text-slate-800">{car.safety_rating.side}</div>
                        <div className="text-xs font-semibold text-slate-600">Side</div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-sky-200/50">
                        <div className="text-xl font-bold text-slate-800">{car.safety_rating.rollover}</div>
                        <div className="text-xs font-semibold text-slate-600">Rollover</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Features */}
              {car.features && car.features.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Features & Amenities
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {car.features.map((feature, index) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-sky-100 to-emerald-100 text-slate-700 px-4 py-2 rounded-full text-sm font-medium border border-sky-200/50 shadow-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="pt-6 border-t border-sky-200/50">
                <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-6 border border-emerald-200/50">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule a Test Drive
                  </h3>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    This vehicle is available for viewing and test drives. Contact the dealer for more information about availability, financing options, and scheduling a test drive.
                    {car.location && (
                      <span className="block mt-3 text-slate-600 font-medium">
                        📍 Dealership location: {car.location}
                      </span>
                    )}
                    {car.carfax_url && (
                      <div className="mt-6 space-y-3">
                        <a 
                          href={car.carfax_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-3 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 transform font-bold shadow-xl"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>View CarFax Report</span>
                        </a>
                        
                        {/* Carvana-style "Check this out" button */}
                        <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-xl p-4 border border-sky-200/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Ready to see more?</h4>
                              <p className="text-xs text-slate-600 mt-1">Get detailed photos, financing options, and dealer contact info</p>
                            </div>
                            <a 
                              href={car.carfax_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 transform font-semibold shadow-lg text-sm"
                            >
                              Check This Out →
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
