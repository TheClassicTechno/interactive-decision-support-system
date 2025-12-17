'use client';

import { FC } from 'react';
import { Product } from '@/types/product';

interface ItemDetailModalProps {
  item: Product;
  onClose: () => void;
}

const ItemImage: FC<{ imageUrl?: string | null; alt: string }> = ({ imageUrl, alt }) => {
  const hasValidImage = imageUrl && !imageUrl.toLowerCase().includes('.svg');
  return (
    <div className="aspect-[4/3] bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl overflow-hidden relative">
      {hasValidImage ? (
        <img
          src={imageUrl as string}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(event) => {
            const target = event.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.fallback-text')) {
              const fallback = document.createElement('div');
              fallback.className = 'fallback-text text-slate-400 text-lg absolute inset-0 flex items-center justify-center';
              fallback.innerHTML = '<div class="text-center px-4"><div class="text-lg font-medium">No image available</div></div>';
              parent.appendChild(fallback);
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400">
          <div className="text-center px-4">
            <div className="text-lg font-medium">No image available</div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow: FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between">
      <span className="text-sm text-slate-400 mr-6 whitespace-nowrap">{label}</span>
      <span className="text-sm text-slate-100 text-right flex-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
};

const SpecCard: FC<{ label: string; value?: string | number | null; suffix?: string }> = ({ label, value, suffix }) => {
  if (!value) return null;
  return (
    <div className="glass-card rounded-lg p-3">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className="font-medium text-slate-100 mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}{suffix || ''}
      </div>
    </div>
  );
};

const formatPrice = (item: Product) => {
  if (item.price_text) return item.price_text;
  if (typeof item.price === 'number') return `$${item.price.toLocaleString()}`;
  if (typeof item.price_value === 'number') return `$${item.price_value.toLocaleString()}`;
  return 'Price unavailable';
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get product type from various possible fields
const getProductType = (item: Product): string | undefined => {
  return item.category || item.part_type || undefined;
};

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const rawTitle = item.title || `${item.make ?? ''} ${item.model ?? ''}`.trim() || 'Product details';
  const cleanedTitle = item.source
    ? rawTitle
        .replace(new RegExp(escapeRegExp(item.source), 'gi'), '')
        .replace(/\s+/g, ' ')
        .trim() || rawTitle
    : rawTitle;
  const title = cleanedTitle;

  const subtitleParts = [item.brand, item.series].filter(Boolean);
  const subtitle = subtitleParts.join(' • ');
  const ratingText = item.rating
    ? `${item.rating.toFixed(1)} ★${item.rating_count ? ` (${item.rating_count.toLocaleString()} reviews)` : ''}`
    : undefined;

  const productType = getProductType(item);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="glass-dark rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 glass-dark border-b border-slate-600/30 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
            {subtitle && <p className="text-sm text-slate-300 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105 font-semibold shadow-lg flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1.2fr] gap-6">
            <div className="space-y-4">
              <ItemImage imageUrl={item.image_url} alt={title} />
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="text-3xl font-bold text-rose-400">{formatPrice(item)}</div>
                <InfoRow label="Retailer" value={item.source || 'N/A'} />
                {productType && <InfoRow label="Type" value={productType} />}
                <InfoRow label="Year" value={item.year} />
                <InfoRow label="Rating" value={ratingText} />
                {item.link && <InfoRow label="Link" value="View on retailer site" />}
              </div>
            </div>

            <div className="space-y-4">
              {/* Product Overview */}
              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-semibold text-slate-100">Product Overview</h3>
                <InfoRow label="Brand" value={item.brand} />
                <InfoRow label="Model" value={item.model} />
                <InfoRow label="Series" value={item.series} />
              </div>

              {/* GPU Specifications */}
              {(productType === 'gpu' || item.vram) && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">GPU Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="VRAM" value={item.vram} suffix=" GB" />
                    <SpecCard label="Memory Type" value={item.memory_type} />
                    <SpecCard label="Performance Tier" value={item.performance_tier} />
                    <SpecCard label="Target Resolution" value={item.target_resolution} />
                    <SpecCard label="Recommended PSU" value={item.recommended_psu} suffix="W" />
                    <SpecCard label="Power Connector" value={item.power_connector} />
                    <SpecCard label="Card Length" value={item.card_length} />
                    <SpecCard label="Slot Thickness" value={item.slot_thickness} />
                    <SpecCard label="Cooler Type" value={item.cooler_type} />
                    <SpecCard label="Ray Tracing" value={item.ray_tracing} />
                    <SpecCard label="Upscaling" value={item.upscaling_support} />
                    <SpecCard label="Display Outputs" value={item.display_outputs} />
                    <SpecCard label="Video Encoder" value={item.video_encoder} />
                    <SpecCard label="Interface" value={item.interface} />
                    <SpecCard label="Variant" value={item.variant} />
                  </div>
                </div>
              )}

              {/* CPU Specifications */}
              {(productType === 'cpu' || item.core_count) && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">CPU Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="Cores" value={item.core_count} />
                    <SpecCard label="Threads" value={item.thread_count} />
                    <SpecCard label="Socket" value={item.socket} />
                    <SpecCard label="Architecture" value={item.architecture} />
                    <SpecCard label="TDP" value={item.tdp} suffix="W" />
                    <SpecCard label="Integrated Graphics" value={item.integrated_graphics} />
                    <SpecCard label="PCIe Version" value={item.pcie_version} />
                    <SpecCard label="RAM Support" value={item.ram_standard} />
                  </div>
                </div>
              )}

              {/* Motherboard Specifications */}
              {(productType === 'motherboard' || item.chipset) && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">Motherboard Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="Chipset" value={item.chipset} />
                    <SpecCard label="Socket" value={item.socket} />
                    <SpecCard label="Form Factor" value={item.form_factor} />
                    <SpecCard label="RAM Standard" value={item.ram_standard} />
                    <SpecCard label="M.2 Slots" value={item.m2_slots} />
                    <SpecCard label="WiFi" value={item.wifi} />
                    <SpecCard label="PCIe Version" value={item.pcie_version} />
                  </div>
                </div>
              )}

              {/* PSU Specifications */}
              {(productType === 'psu' || item.wattage) && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">PSU Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="Wattage" value={item.wattage} suffix="W" />
                    <SpecCard label="Certification" value={item.certification} />
                    <SpecCard label="Modularity" value={item.modularity} />
                    <SpecCard label="ATX Version" value={item.atx_version} />
                    <SpecCard label="Noise Level" value={item.noise} suffix=" dB" />
                    <SpecCard label="PCIe 5.0 Power" value={item.supports_pcie5_power === 'true' ? 'Yes' : item.supports_pcie5_power === 'false' ? 'No' : item.supports_pcie5_power} />
                  </div>
                </div>
              )}

              {/* Storage Specifications */}
              {(productType === 'storage' || item.storage_type) && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">Storage Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="Capacity" value={item.capacity} />
                    <SpecCard label="Storage Type" value={item.storage_type} />
                    <SpecCard label="Interface" value={item.interface} />
                  </div>
                </div>
              )}

              {/* Cooling Specifications */}
              {(productType === 'cooling' || item.cooling_type) && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">Cooling Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="Cooling Type" value={item.cooling_type} />
                    <SpecCard label="TDP Support" value={item.tdp_support} suffix="W" />
                    <SpecCard label="Socket Compatibility" value={item.socket} />
                  </div>
                </div>
              )}

              {/* RAM Specifications */}
              {productType === 'ram' && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">RAM Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="Capacity" value={item.capacity} />
                    <SpecCard label="RAM Type" value={item.ram_standard} />
                    <SpecCard label="Form Factor" value={item.form_factor} />
                  </div>
                </div>
              )}

              {/* Case Specifications */}
              {productType === 'case' && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-slate-100">Case Specifications</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <SpecCard label="Form Factor" value={item.form_factor} />
                    <SpecCard label="Drive Bays" value={item.storage} />
                  </div>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div className="glass-card rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">Description</h3>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
