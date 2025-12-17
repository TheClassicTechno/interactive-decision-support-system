'use client';

import { useState, useRef, useEffect } from 'react';
import { ComparisonTable as ComparisonTableType } from '@/types/chat';

interface ComparisonTableProps {
  comparison: ComparisonTableType;
}

export default function ComparisonTable({ comparison }: ComparisonTableProps) {
  const { headers, rows } = comparison;
  
  // First header is "Attribute", rest are product names
  const productNames = headers.slice(1);
  
  // Track selected fields (default to first 4)
  const [selectedFields, setSelectedFields] = useState<string[]>(() => 
    rows.slice(0, Math.min(4, rows.length)).map(row => row[0])
  );
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Get visible rows based on selected fields
  const visibleRows = rows.filter(row => selectedFields.includes(row[0]));
  const availableFields = rows.map(row => row[0]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowFieldSelector(false);
      }
    };

    if (showFieldSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFieldSelector]);

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldName)) {
        return prev.filter(f => f !== fieldName);
      } else if (prev.length < 4) {
        return [...prev, fieldName];
      }
      return prev;
    });
  };

  return (
    <div className="mt-4">
      {/* Field Selector */}
      <div className="mb-3 flex justify-between items-center">
        <div className="text-sm text-[#8b959e]">
          {selectedFields.length} of {availableFields.length} fields shown
        </div>
        <div className="relative" ref={selectorRef}>
          <button
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            className="px-4 py-2 bg-white border border-[#8b959e]/40 hover:border-[#750013] text-base text-black rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Select Fields
          </button>
          
          {showFieldSelector && (
            <div className="absolute right-0 mt-2 bg-white border border-[#8b959e]/30 rounded-xl p-3 z-50 min-w-[250px] shadow-lg">
              <div className="text-sm text-[#8b959e] mb-2">Select up to 4 fields</div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {availableFields.map(fieldName => (
                  <label key={fieldName} className="flex items-center p-2 hover:bg-[#8b959e]/5 rounded-lg cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(fieldName)}
                      onChange={() => toggleField(fieldName)}
                      disabled={!selectedFields.includes(fieldName) && selectedFields.length >= 4}
                      className="w-4 h-4 text-[#750013] border-[#8b959e] rounded focus:ring-[#750013] focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed accent-[#750013]"
                      style={{ accentColor: '#750013' }}
                    />
                    <span className={`ml-2 text-base ${selectedFields.includes(fieldName) ? 'text-black' : 'text-[#8b959e]'} group-hover:text-black`}>
                      {fieldName}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {productNames.map((productName, productIdx) => (
          <div 
            key={productIdx} 
            className="flex-shrink-0 w-80 bg-white rounded-xl p-4 border border-[#8b959e]/30 hover:border-[#750013] transition-all shadow-sm"
          >
            {/* Product Name Header */}
            <h3 className="text-xl font-bold text-black mb-4 text-center pb-3 border-b border-[#8b959e]/30">
              {productName}
            </h3>
            
            {/* Attributes */}
            <div className="space-y-3">
              {visibleRows.map((row, rowIdx) => (
                <div key={rowIdx} className="space-y-1">
                  <div className="text-sm text-[#8b959e] font-medium">
                    {row[0]}
                  </div>
                  <div className="text-base text-black font-semibold">
                    {row[productIdx + 1]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
