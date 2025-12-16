'use client';

import { FC } from 'react';
import { Product } from '@/types/vehicle';

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

const AttributeGrid: FC<{ attributes?: Record<string, unknown> }> = ({ attributes }) => {
  if (!attributes) return null;
  const entries = Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 12);
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="glass-card rounded-lg p-3">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {key.replace(/_/g, ' ')}
          </span>
          <div className="font-medium text-slate-100 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : String(value)}
          </div>
        </div>
      ))}
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

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const rawTitle = item.title || `${item.make ?? ''} ${item.model ?? ''}`.trim() || 'Product details';
  const cleanedTitle = item.source
    ? rawTitle
        .replace(new RegExp(escapeRegExp(item.source), 'gi'), '')
        .replace(/\s+/g, ' ')
        .trim() || rawTitle
    : rawTitle;
  const title = cleanedTitle;

  const subtitleParts = [item.brand].filter(Boolean);
  const subtitle = subtitleParts.join(' • ');
  const ratingText = item.rating
    ? `${item.rating.toFixed(1)} ★${item.rating_count ? ` (${item.rating_count.toLocaleString()} reviews)` : ''}`
    : undefined;

  const productAttributes = (item.product?.attributes as Record<string, unknown>) || undefined;

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
                <InfoRow label="Product ID" value={item.product?.identifier as string} />
                <InfoRow label="Offer URL" value={item.link} />
                <InfoRow label="Availability" value={item.offer?.availability as string} />
                <InfoRow label="Condition" value={item.offer?.condition as string} />
                <InfoRow label="Rating" value={ratingText} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-semibold text-slate-100">Product Overview</h3>
                <InfoRow label="Brand" value={item.brand} />
                <InfoRow label="Model" value={item.model} />
                <InfoRow label="Year" value={item.year || '—'} />
                <InfoRow label="Price (numeric)" value={item.price_value} />
                <InfoRow label="Currency" value={item.price_currency} />
                <InfoRow label="Retailer" value={item.source} />
              </div>

              <div className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-semibold text-slate-100">Key Specifications</h3>
                <AttributeGrid attributes={productAttributes} />
              </div>

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
