'use client';

import { useState, useEffect, useCallback } from 'react';

interface FilterMenuProps {
  onFilterChange: (filters: Record<string, unknown>, clearKeys?: string[]) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

// All filter keys that are controlled by the UI (not from conversation)
export const UI_FILTER_KEYS = [
  'part_type',
  // GPU filters
  'gpu_brand', 'gpu_series', 'vram', 'gpu_tdp', 'power_connector', 'recommended_psu',
  'target_resolution', 'ray_tracing', 'upscaling_support', 'gpu_performance_tier',
  'card_length', 'slot_thickness', 'video_encoder', 'display_outputs',
  // CPU filters
  'cpu_brand', 'socket', 'chipset', 'ram_standard', 'core_count', 'thread_count',
  'boost_clock', 'cache', 'cpu_performance_tier', 'primary_use_case', 'tdp',
  'cooling_requirement', 'integrated_graphics', 'overclocking_support', 'cpu_generation',
  // Motherboard filters
  'supported_cpu_gen', 'bios_flashback', 'form_factor', 'dimm_slots', 'max_ram_speed',
  'pcie_version', 'm2_slots', 'sata_ports', 'usb_c_support', 'lan_speed', 'wifi', 'vrm_tier',
  // Common filters
  'price', 'price_min', 'price_max', 'condition',
];

// GPU Filters
const GPU_BRANDS = ['NVIDIA', 'AMD', 'Intel'];
const GPU_SERIES = ['RTX 4090', 'RTX 4080', 'RTX 4070', 'RTX 4060', 'RTX 3090', 'RTX 3080', 'RTX 3070', 'RX 7900', 'RX 7800', 'RX 7700', 'RX 6900', 'RX 6800', 'Arc A770', 'Arc A750'];
const GPU_VRAM = ['4GB', '6GB', '8GB', '10GB', '12GB', '16GB', '24GB'];
const GPU_TDP = ['Under 150W', '150-200W', '200-250W', '250-300W', '300W+'];
const GPU_POWER_CONNECTOR = ['8-pin', '12-pin', '16-pin (12VHPWR)', 'Dual 8-pin', 'Triple 8-pin'];
const GPU_PSU_WATTAGE = ['550W', '650W', '750W', '850W', '1000W+'];
const GPU_TARGET_RESOLUTION = ['1080p', '1440p', '4K'];
const GPU_RAY_TRACING = ['Yes', 'No'];
const GPU_UPSCALING = ['DLSS', 'FSR', 'XeSS', 'None'];
const GPU_PERFORMANCE_TIER = ['Entry', 'Mid-Range', 'High-End', 'Enthusiast'];
const GPU_CARD_LENGTH = ['Under 250mm', '250-300mm', '300-350mm', '350mm+'];
const GPU_SLOT_THICKNESS = ['2-slot', '2.5-slot', '3-slot', '3.5-slot+'];
const GPU_VIDEO_ENCODER = ['NVENC', 'AV1', 'AMF', 'QuickSync'];
const GPU_DISPLAY_OUTPUTS = ['HDMI 2.1', 'DisplayPort 1.4', 'DisplayPort 2.0'];

// CPU Filters
const CPU_BRANDS = ['Intel', 'AMD'];
const CPU_SOCKETS = ['LGA 1700', 'LGA 1200', 'AM5', 'AM4'];
const CPU_CHIPSETS = ['Z790', 'B760', 'H770', 'X670E', 'X670', 'B650E', 'B650', 'A620', 'Z690', 'B660', 'X570', 'B550'];
const CPU_MEMORY_TYPE = ['DDR5', 'DDR4'];
const CPU_CORE_COUNT = ['4 cores', '6 cores', '8 cores', '10 cores', '12 cores', '14 cores', '16 cores', '24 cores'];
const CPU_THREAD_COUNT = ['8 threads', '12 threads', '16 threads', '20 threads', '24 threads', '32 threads'];
const CPU_BOOST_CLOCK = ['Under 4.5GHz', '4.5-5.0GHz', '5.0-5.5GHz', '5.5GHz+'];
const CPU_CACHE = ['16MB', '24MB', '32MB', '64MB', '96MB+'];
const CPU_PERFORMANCE_TIER = ['Budget', 'Mid-Range', 'High-End', 'Enthusiast'];
const CPU_USE_CASE = ['Gaming', 'Productivity', 'Mixed Use'];
const CPU_TDP = ['65W', '105W', '125W', '170W+'];
const CPU_COOLING_REQ = ['Stock Cooler', 'Budget Aftermarket', 'Mid-Range Cooler', 'High-End Cooler', 'AIO/Custom Loop'];
const CPU_INTEGRATED_GRAPHICS = ['Yes', 'No'];
const CPU_OVERCLOCKING = ['Yes', 'No'];
const CPU_GENERATION = ['13th Gen Intel', '14th Gen Intel', 'Ryzen 7000', 'Ryzen 5000', '12th Gen Intel'];

// Motherboard Filters
const MOBO_SOCKETS = ['LGA 1700', 'LGA 1200', 'AM5', 'AM4'];
const MOBO_CHIPSETS = ['Z790', 'B760', 'H770', 'X670E', 'X670', 'B650E', 'B650', 'A620', 'Z690', 'B660', 'X570', 'B550'];
const MOBO_CPU_GENS = ['12th-14th Gen Intel', '10th-11th Gen Intel', 'Ryzen 5000/7000', 'Ryzen 3000/5000'];
const MOBO_BIOS_FLASHBACK = ['Yes', 'No'];
const MOBO_FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'];
const MOBO_MEMORY_TYPE = ['DDR5', 'DDR4'];
const MOBO_DIMM_SLOTS = ['2 slots', '4 slots'];
const MOBO_MAX_RAM_SPEED = ['DDR4-3200', 'DDR4-3600', 'DDR4-4000', 'DDR5-5600', 'DDR5-6000', 'DDR5-7200+'];
const MOBO_PCIE_VERSION = ['PCIe 4.0', 'PCIe 5.0'];
const MOBO_M2_SLOTS = ['1 slot', '2 slots', '3 slots', '4+ slots'];
const MOBO_SATA_PORTS = ['4 ports', '6 ports', '8+ ports'];
const MOBO_USB_C = ['Yes', 'No'];
const MOBO_LAN_SPEED = ['1G', '2.5G', '5G', '10G'];
const MOBO_WIFI = ['Yes', 'No'];
const MOBO_VRM_TIER = ['Entry', 'Mid-Range', 'High-End'];

// Price ranges
const PRICE_RANGES = ['Under $100', '$100-$200', '$200-$300', '$300-$500', '$500-$750', '$750-$1000', '$1000+'];
const CONDITION_OPTIONS = ['New', 'Used'];

type PartType = 'gpu' | 'cpu' | 'motherboard';

interface FilterState {
  partType: PartType | null;
  // GPU filters
  gpuBrand: string[];
  gpuSeries: string[];
  gpuVram: string[];
  gpuTdp: string[];
  gpuPowerConnector: string[];
  gpuPsuWattage: string[];
  gpuTargetResolution: string[];
  gpuRayTracing: string[];
  gpuUpscaling: string[];
  gpuPerformanceTier: string[];
  gpuCardLength: string[];
  gpuSlotThickness: string[];
  gpuVideoEncoder: string[];
  gpuDisplayOutputs: string[];
  // CPU filters
  cpuBrand: string[];
  cpuSocket: string[];
  cpuChipset: string[];
  cpuMemoryType: string[];
  cpuCoreCount: string[];
  cpuThreadCount: string[];
  cpuBoostClock: string[];
  cpuCache: string[];
  cpuPerformanceTier: string[];
  cpuUseCase: string[];
  cpuTdp: string[];
  cpuCoolingReq: string[];
  cpuIntegratedGraphics: string[];
  cpuOverclocking: string[];
  cpuGeneration: string[];
  // Motherboard filters
  moboSocket: string[];
  moboChipset: string[];
  moboCpuGen: string[];
  moboBiosFlashback: string[];
  moboFormFactor: string[];
  moboMemoryType: string[];
  moboDimmSlots: string[];
  moboMaxRamSpeed: string[];
  moboPcieVersion: string[];
  moboM2Slots: string[];
  moboSataPorts: string[];
  moboUsbC: string[];
  moboLanSpeed: string[];
  moboWifi: string[];
  moboVrmTier: string[];
  // Common filters
  priceRange: string[];
  condition: string[];
}

const initialFilterState: FilterState = {
  partType: null,
  gpuBrand: [],
  gpuSeries: [],
  gpuVram: [],
  gpuTdp: [],
  gpuPowerConnector: [],
  gpuPsuWattage: [],
  gpuTargetResolution: [],
  gpuRayTracing: [],
  gpuUpscaling: [],
  gpuPerformanceTier: [],
  gpuCardLength: [],
  gpuSlotThickness: [],
  gpuVideoEncoder: [],
  gpuDisplayOutputs: [],
  cpuBrand: [],
  cpuSocket: [],
  cpuChipset: [],
  cpuMemoryType: [],
  cpuCoreCount: [],
  cpuThreadCount: [],
  cpuBoostClock: [],
  cpuCache: [],
  cpuPerformanceTier: [],
  cpuUseCase: [],
  cpuTdp: [],
  cpuCoolingReq: [],
  cpuIntegratedGraphics: [],
  cpuOverclocking: [],
  cpuGeneration: [],
  moboSocket: [],
  moboChipset: [],
  moboCpuGen: [],
  moboBiosFlashback: [],
  moboFormFactor: [],
  moboMemoryType: [],
  moboDimmSlots: [],
  moboMaxRamSpeed: [],
  moboPcieVersion: [],
  moboM2Slots: [],
  moboSataPorts: [],
  moboUsbC: [],
  moboLanSpeed: [],
  moboWifi: [],
  moboVrmTier: [],
  priceRange: [],
  condition: [],
};

export default function FilterMenu({ onFilterChange, onOpenChange }: FilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterState>(initialFilterState);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Notify parent when filter state changes
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleSelection = useCallback((filterKey: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterKey] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues };
    });
  }, []);

  const setPartType = (partType: PartType | null) => {
    setFilters(prev => ({ ...prev, partType }));
    // Expand the first section when part type is selected
    if (partType) {
      setExpandedSections({ [`${partType}-compatibility`]: true });
    }
  };

  const buildFilterObject = useCallback((): Record<string, unknown> => {
    const filterObject: Record<string, unknown> = {};

    if (filters.partType) {
      filterObject.part_type = filters.partType;
    }

    // GPU Filters
    if (filters.gpuBrand.length > 0) filterObject.gpu_brand = filters.gpuBrand.join(', ');
    if (filters.gpuSeries.length > 0) filterObject.gpu_series = filters.gpuSeries.join(', ');
    if (filters.gpuVram.length > 0) filterObject.vram = filters.gpuVram.join(', ');
    if (filters.gpuTdp.length > 0) filterObject.gpu_tdp = filters.gpuTdp.join(', ');
    if (filters.gpuPowerConnector.length > 0) filterObject.power_connector = filters.gpuPowerConnector.join(', ');
    if (filters.gpuPsuWattage.length > 0) filterObject.recommended_psu = filters.gpuPsuWattage.join(', ');
    if (filters.gpuTargetResolution.length > 0) filterObject.target_resolution = filters.gpuTargetResolution.join(', ');
    if (filters.gpuRayTracing.length > 0) filterObject.ray_tracing = filters.gpuRayTracing.includes('Yes');
    if (filters.gpuUpscaling.length > 0) filterObject.upscaling_support = filters.gpuUpscaling.join(', ');
    if (filters.gpuPerformanceTier.length > 0) filterObject.gpu_performance_tier = filters.gpuPerformanceTier.join(', ');
    if (filters.gpuCardLength.length > 0) filterObject.card_length = filters.gpuCardLength.join(', ');
    if (filters.gpuSlotThickness.length > 0) filterObject.slot_thickness = filters.gpuSlotThickness.join(', ');
    if (filters.gpuVideoEncoder.length > 0) filterObject.video_encoder = filters.gpuVideoEncoder.join(', ');
    if (filters.gpuDisplayOutputs.length > 0) filterObject.display_outputs = filters.gpuDisplayOutputs.join(', ');

    // CPU Filters
    if (filters.cpuBrand.length > 0) filterObject.cpu_brand = filters.cpuBrand.join(', ');
    if (filters.cpuSocket.length > 0) filterObject.socket = filters.cpuSocket.join(', ');
    if (filters.cpuChipset.length > 0) filterObject.chipset = filters.cpuChipset.join(', ');
    if (filters.cpuMemoryType.length > 0) filterObject.ram_standard = filters.cpuMemoryType.join(', ');
    if (filters.cpuCoreCount.length > 0) filterObject.core_count = filters.cpuCoreCount.map(c => c.split(' ')[0]).join(', ');
    if (filters.cpuThreadCount.length > 0) filterObject.thread_count = filters.cpuThreadCount.map(t => t.split(' ')[0]).join(', ');
    if (filters.cpuBoostClock.length > 0) filterObject.boost_clock = filters.cpuBoostClock.join(', ');
    if (filters.cpuCache.length > 0) filterObject.cache = filters.cpuCache.join(', ');
    if (filters.cpuPerformanceTier.length > 0) filterObject.cpu_performance_tier = filters.cpuPerformanceTier.join(', ');
    if (filters.cpuUseCase.length > 0) filterObject.primary_use_case = filters.cpuUseCase.join(', ');
    if (filters.cpuTdp.length > 0) filterObject.tdp = filters.cpuTdp.join(', ');
    if (filters.cpuCoolingReq.length > 0) filterObject.cooling_requirement = filters.cpuCoolingReq.join(', ');
    if (filters.cpuIntegratedGraphics.length > 0) filterObject.integrated_graphics = filters.cpuIntegratedGraphics.includes('Yes');
    if (filters.cpuOverclocking.length > 0) filterObject.overclocking_support = filters.cpuOverclocking.includes('Yes');
    if (filters.cpuGeneration.length > 0) filterObject.cpu_generation = filters.cpuGeneration.join(', ');

    // Motherboard Filters
    if (filters.moboSocket.length > 0) filterObject.socket = filters.moboSocket.join(', ');
    if (filters.moboChipset.length > 0) filterObject.chipset = filters.moboChipset.join(', ');
    if (filters.moboCpuGen.length > 0) filterObject.supported_cpu_gen = filters.moboCpuGen.join(', ');
    if (filters.moboBiosFlashback.length > 0) filterObject.bios_flashback = filters.moboBiosFlashback.includes('Yes');
    if (filters.moboFormFactor.length > 0) filterObject.form_factor = filters.moboFormFactor.join(', ');
    if (filters.moboMemoryType.length > 0) filterObject.ram_standard = filters.moboMemoryType.join(', ');
    if (filters.moboDimmSlots.length > 0) filterObject.dimm_slots = filters.moboDimmSlots.map(d => d.split(' ')[0]).join(', ');
    if (filters.moboMaxRamSpeed.length > 0) filterObject.max_ram_speed = filters.moboMaxRamSpeed.join(', ');
    if (filters.moboPcieVersion.length > 0) filterObject.pcie_version = filters.moboPcieVersion.join(', ');
    if (filters.moboM2Slots.length > 0) filterObject.m2_slots = filters.moboM2Slots.map(m => m.split(' ')[0]).join(', ');
    if (filters.moboSataPorts.length > 0) filterObject.sata_ports = filters.moboSataPorts.map(s => s.split(' ')[0]).join(', ');
    if (filters.moboUsbC.length > 0) filterObject.usb_c_support = filters.moboUsbC.includes('Yes');
    if (filters.moboLanSpeed.length > 0) filterObject.lan_speed = filters.moboLanSpeed.join(', ');
    if (filters.moboWifi.length > 0) filterObject.wifi = filters.moboWifi.includes('Yes');
    if (filters.moboVrmTier.length > 0) filterObject.vrm_tier = filters.moboVrmTier.join(', ');

    // Common Filters
    if (filters.priceRange.length > 0) {
      // Parse price ranges to min/max values
      const prices = filters.priceRange.map(range => {
        if (range === 'Under $100') return { min: 0, max: 100 };
        if (range === '$100-$200') return { min: 100, max: 200 };
        if (range === '$200-$300') return { min: 200, max: 300 };
        if (range === '$300-$500') return { min: 300, max: 500 };
        if (range === '$500-$750') return { min: 500, max: 750 };
        if (range === '$750-$1000') return { min: 750, max: 1000 };
        if (range === '$1000+') return { min: 1000, max: undefined };
        return { min: 0, max: undefined };
      });
      const minPrice = Math.min(...prices.map(p => p.min));
      const maxPrice = Math.max(...prices.filter(p => p.max !== undefined).map(p => p.max!));
      if (minPrice > 0) filterObject.price_min = minPrice;
      if (maxPrice > 0 && maxPrice !== Infinity) filterObject.price_max = maxPrice;
      filterObject.price = `${minPrice}-${maxPrice || ''}`;
    }
    if (filters.condition.length > 0) filterObject.condition = filters.condition.join(', ').toLowerCase();

    return filterObject;
  }, [filters]);

  const handleApplyFilters = () => {
    const filterObject = buildFilterObject();
    onFilterChange(filterObject);
    setLastAppliedFilters(filters);
    setIsOpen(false);
  };

  const clearAllFilters = () => {
    setFilters(initialFilterState);
    setLastAppliedFilters(initialFilterState);
    setExpandedSections({});
    // Pass empty filters but with clear_keys to only remove UI-controlled filters
    onFilterChange({}, UI_FILTER_KEYS);
  };

  const clearPartTypeFilters = () => {
    const partType = filters.partType;
    if (!partType) return;

    setFilters(prev => {
      const newFilters = { ...prev };
      if (partType === 'gpu') {
        newFilters.gpuBrand = [];
        newFilters.gpuSeries = [];
        newFilters.gpuVram = [];
        newFilters.gpuTdp = [];
        newFilters.gpuPowerConnector = [];
        newFilters.gpuPsuWattage = [];
        newFilters.gpuTargetResolution = [];
        newFilters.gpuRayTracing = [];
        newFilters.gpuUpscaling = [];
        newFilters.gpuPerformanceTier = [];
        newFilters.gpuCardLength = [];
        newFilters.gpuSlotThickness = [];
        newFilters.gpuVideoEncoder = [];
        newFilters.gpuDisplayOutputs = [];
      } else if (partType === 'cpu') {
        newFilters.cpuBrand = [];
        newFilters.cpuSocket = [];
        newFilters.cpuChipset = [];
        newFilters.cpuMemoryType = [];
        newFilters.cpuCoreCount = [];
        newFilters.cpuThreadCount = [];
        newFilters.cpuBoostClock = [];
        newFilters.cpuCache = [];
        newFilters.cpuPerformanceTier = [];
        newFilters.cpuUseCase = [];
        newFilters.cpuTdp = [];
        newFilters.cpuCoolingReq = [];
        newFilters.cpuIntegratedGraphics = [];
        newFilters.cpuOverclocking = [];
        newFilters.cpuGeneration = [];
      } else if (partType === 'motherboard') {
        newFilters.moboSocket = [];
        newFilters.moboChipset = [];
        newFilters.moboCpuGen = [];
        newFilters.moboBiosFlashback = [];
        newFilters.moboFormFactor = [];
        newFilters.moboMemoryType = [];
        newFilters.moboDimmSlots = [];
        newFilters.moboMaxRamSpeed = [];
        newFilters.moboPcieVersion = [];
        newFilters.moboM2Slots = [];
        newFilters.moboSataPorts = [];
        newFilters.moboUsbC = [];
        newFilters.moboLanSpeed = [];
        newFilters.moboWifi = [];
        newFilters.moboVrmTier = [];
      }
      return newFilters;
    });
  };

  const hasActiveFilters = useCallback(() => {
    return filters.partType !== null ||
      filters.gpuBrand.length > 0 || filters.gpuSeries.length > 0 || filters.gpuVram.length > 0 ||
      filters.cpuBrand.length > 0 || filters.cpuSocket.length > 0 ||
      filters.moboSocket.length > 0 || filters.moboChipset.length > 0 ||
      filters.priceRange.length > 0 || filters.condition.length > 0;
  }, [filters]);

  const hasChanges = useCallback(() => {
    return JSON.stringify(filters) !== JSON.stringify(lastAppliedFilters);
  }, [filters, lastAppliedFilters]);

  // Filter section component
  const FilterSection = ({ 
    title, 
    sectionKey, 
    options, 
    filterKey 
  }: { 
    title: string; 
    sectionKey: string; 
    options: string[]; 
    filterKey: keyof FilterState;
  }) => {
    const isExpanded = expandedSections[sectionKey];
    const selectedValues = filters[filterKey] as string[];

    return (
      <div className="border-b border-[#8b959e]/20 last:border-b-0">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-[#8b959e]/5 transition-colors"
        >
          <span className="text-sm font-medium text-black">
            {title}
            {selectedValues.length > 0 && (
              <span className="ml-2 text-xs bg-[#750013] text-white px-1.5 py-0.5 rounded-full">
                {selectedValues.length}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 text-[#8b959e] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className="pb-3 px-1">
            <div className="flex flex-wrap gap-1.5">
              {options.map(option => (
                <button
                  key={option}
                  onClick={() => toggleSelection(filterKey, option)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                    selectedValues.includes(option)
                      ? 'bg-[#750013] text-white shadow-sm'
                      : 'bg-white border border-[#8b959e]/40 text-black hover:border-[#8b959e] hover:bg-[#8b959e]/5'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Group header component
  const GroupHeader = ({ title }: { title: string }) => (
    <div className="bg-[#8b959e]/10 px-3 py-2 -mx-1">
      <h4 className="text-xs font-bold text-[#750013] uppercase tracking-wide">{title}</h4>
    </div>
  );

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-50 w-14 h-14 bg-white rounded-xl border border-[#8b959e]/40 flex items-center justify-center hover:border-[#8b959e] hover:shadow-md transition-all duration-200 shadow-sm"
      >
        <div className="flex flex-col space-y-1.5">
          <div className="w-6 h-0.5 bg-[#750013] rounded"></div>
          <div className="w-6 h-0.5 bg-[#750013] rounded"></div>
          <div className="w-6 h-0.5 bg-[#750013] rounded"></div>
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed top-0 left-80 right-0 bottom-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Filter Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white border-r border-[#8b959e]/30 z-50 transform transition-transform duration-300 ease-in-out shadow-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black">Filters</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 bg-white rounded-lg flex items-center justify-center hover:bg-[#8b959e]/10 transition-all duration-200 border border-[#8b959e]/40"
            >
              <svg className="w-5 h-5 text-[#8b959e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Part Type Selector */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-black mb-2">Component Type</h3>
            <div className="flex gap-2">
              {(['gpu', 'cpu', 'motherboard'] as PartType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setPartType(filters.partType === type ? null : type)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filters.partType === type
                      ? 'bg-[#750013] text-white shadow-sm'
                      : 'bg-white border border-[#8b959e]/40 text-black hover:border-[#8b959e] hover:bg-[#8b959e]/5'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
            {/* GPU Filters */}
            {filters.partType === 'gpu' && (
              <>
                <GroupHeader title="Core Compatibility & Power" />
                <FilterSection title="Brand" sectionKey="gpu-brand" options={GPU_BRANDS} filterKey="gpuBrand" />
                <FilterSection title="GPU Model / Series" sectionKey="gpu-series" options={GPU_SERIES} filterKey="gpuSeries" />
                <FilterSection title="VRAM Size" sectionKey="gpu-vram" options={GPU_VRAM} filterKey="gpuVram" />
                <FilterSection title="Power Draw (TDP/TBP)" sectionKey="gpu-tdp" options={GPU_TDP} filterKey="gpuTdp" />
                <FilterSection title="Power Connector Type" sectionKey="gpu-power" options={GPU_POWER_CONNECTOR} filterKey="gpuPowerConnector" />
                <FilterSection title="Recommended PSU Wattage" sectionKey="gpu-psu" options={GPU_PSU_WATTAGE} filterKey="gpuPsuWattage" />

                <GroupHeader title="Performance" />
                <FilterSection title="Target Resolution" sectionKey="gpu-resolution" options={GPU_TARGET_RESOLUTION} filterKey="gpuTargetResolution" />
                <FilterSection title="Ray Tracing Support" sectionKey="gpu-rt" options={GPU_RAY_TRACING} filterKey="gpuRayTracing" />
                <FilterSection title="Upscaling Support" sectionKey="gpu-upscaling" options={GPU_UPSCALING} filterKey="gpuUpscaling" />
                <FilterSection title="Performance Tier" sectionKey="gpu-tier" options={GPU_PERFORMANCE_TIER} filterKey="gpuPerformanceTier" />

                <GroupHeader title="Physical Fit" />
                <FilterSection title="Card Length" sectionKey="gpu-length" options={GPU_CARD_LENGTH} filterKey="gpuCardLength" />
                <FilterSection title="Slot Thickness" sectionKey="gpu-slot" options={GPU_SLOT_THICKNESS} filterKey="gpuSlotThickness" />

                <GroupHeader title="Features" />
                <FilterSection title="Video Encoder" sectionKey="gpu-encoder" options={GPU_VIDEO_ENCODER} filterKey="gpuVideoEncoder" />
                <FilterSection title="Display Outputs" sectionKey="gpu-outputs" options={GPU_DISPLAY_OUTPUTS} filterKey="gpuDisplayOutputs" />
              </>
            )}

            {/* CPU Filters */}
            {filters.partType === 'cpu' && (
              <>
                <GroupHeader title="Platform Compatibility" />
                <FilterSection title="Brand" sectionKey="cpu-brand" options={CPU_BRANDS} filterKey="cpuBrand" />
                <FilterSection title="Socket" sectionKey="cpu-socket" options={CPU_SOCKETS} filterKey="cpuSocket" />
                <FilterSection title="Supported Chipsets" sectionKey="cpu-chipset" options={CPU_CHIPSETS} filterKey="cpuChipset" />
                <FilterSection title="Memory Type" sectionKey="cpu-memory" options={CPU_MEMORY_TYPE} filterKey="cpuMemoryType" />

                <GroupHeader title="Core Specs" />
                <FilterSection title="Core Count" sectionKey="cpu-cores" options={CPU_CORE_COUNT} filterKey="cpuCoreCount" />
                <FilterSection title="Thread Count" sectionKey="cpu-threads" options={CPU_THREAD_COUNT} filterKey="cpuThreadCount" />
                <FilterSection title="Base / Boost Clock" sectionKey="cpu-clock" options={CPU_BOOST_CLOCK} filterKey="cpuBoostClock" />
                <FilterSection title="Cache (L3)" sectionKey="cpu-cache" options={CPU_CACHE} filterKey="cpuCache" />

                <GroupHeader title="Performance" />
                <FilterSection title="Performance Tier" sectionKey="cpu-tier" options={CPU_PERFORMANCE_TIER} filterKey="cpuPerformanceTier" />
                <FilterSection title="Primary Use Case" sectionKey="cpu-usecase" options={CPU_USE_CASE} filterKey="cpuUseCase" />

                <GroupHeader title="Power & Thermals" />
                <FilterSection title="TDP / Max Power" sectionKey="cpu-tdp" options={CPU_TDP} filterKey="cpuTdp" />
                <FilterSection title="Cooling Requirement" sectionKey="cpu-cooling" options={CPU_COOLING_REQ} filterKey="cpuCoolingReq" />

                <GroupHeader title="Features" />
                <FilterSection title="Integrated Graphics" sectionKey="cpu-igpu" options={CPU_INTEGRATED_GRAPHICS} filterKey="cpuIntegratedGraphics" />
                <FilterSection title="Overclocking Support" sectionKey="cpu-oc" options={CPU_OVERCLOCKING} filterKey="cpuOverclocking" />

                <GroupHeader title="Price & Longevity" />
                <FilterSection title="Release Generation" sectionKey="cpu-gen" options={CPU_GENERATION} filterKey="cpuGeneration" />
              </>
            )}

            {/* Motherboard Filters */}
            {filters.partType === 'motherboard' && (
              <>
                <GroupHeader title="CPU & Platform" />
                <FilterSection title="Socket" sectionKey="mobo-socket" options={MOBO_SOCKETS} filterKey="moboSocket" />
                <FilterSection title="Chipset" sectionKey="mobo-chipset" options={MOBO_CHIPSETS} filterKey="moboChipset" />
                <FilterSection title="Supported CPU Generations" sectionKey="mobo-cpugen" options={MOBO_CPU_GENS} filterKey="moboCpuGen" />
                <FilterSection title="BIOS Flashback" sectionKey="mobo-bios" options={MOBO_BIOS_FLASHBACK} filterKey="moboBiosFlashback" />

                <GroupHeader title="Form Factor & Fit" />
                <FilterSection title="Form Factor" sectionKey="mobo-ff" options={MOBO_FORM_FACTORS} filterKey="moboFormFactor" />

                <GroupHeader title="Memory" />
                <FilterSection title="Memory Type" sectionKey="mobo-memtype" options={MOBO_MEMORY_TYPE} filterKey="moboMemoryType" />
                <FilterSection title="DIMM Slots" sectionKey="mobo-dimm" options={MOBO_DIMM_SLOTS} filterKey="moboDimmSlots" />
                <FilterSection title="Max Memory Speed" sectionKey="mobo-ramspeed" options={MOBO_MAX_RAM_SPEED} filterKey="moboMaxRamSpeed" />

                <GroupHeader title="Expansion & Storage" />
                <FilterSection title="PCIe Version (GPU Slot)" sectionKey="mobo-pcie" options={MOBO_PCIE_VERSION} filterKey="moboPcieVersion" />
                <FilterSection title="M.2 Slot Count" sectionKey="mobo-m2" options={MOBO_M2_SLOTS} filterKey="moboM2Slots" />
                <FilterSection title="SATA Port Count" sectionKey="mobo-sata" options={MOBO_SATA_PORTS} filterKey="moboSataPorts" />

                <GroupHeader title="I/O & Networking" />
                <FilterSection title="USB-C Support" sectionKey="mobo-usbc" options={MOBO_USB_C} filterKey="moboUsbC" />
                <FilterSection title="LAN Speed" sectionKey="mobo-lan" options={MOBO_LAN_SPEED} filterKey="moboLanSpeed" />
                <FilterSection title="Wi-Fi" sectionKey="mobo-wifi" options={MOBO_WIFI} filterKey="moboWifi" />

                <GroupHeader title="Power Delivery" />
                <FilterSection title="VRM Tier" sectionKey="mobo-vrm" options={MOBO_VRM_TIER} filterKey="moboVrmTier" />
              </>
            )}

            {/* Common Filters - Always show */}
            {filters.partType && (
              <>
                <GroupHeader title="Price & Availability" />
                <FilterSection title="Price Range" sectionKey="common-price" options={PRICE_RANGES} filterKey="priceRange" />
                <FilterSection title="Condition" sectionKey="common-condition" options={CONDITION_OPTIONS} filterKey="condition" />
              </>
            )}

            {/* No part type selected */}
            {!filters.partType && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <svg className="w-12 h-12 text-[#8b959e]/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <p className="text-sm text-[#8b959e] px-4">
                  Select a component type above to see available filters
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#8b959e]/30 space-y-2">
            <button
              onClick={handleApplyFilters}
              disabled={!hasChanges()}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-base transition-all duration-200 ${
                hasChanges()
                  ? 'bg-gradient-to-r from-[#750013] to-[#750013]/70 text-white hover:from-[#750013]/70 hover:to-[#750013] shadow-sm hover:shadow-md'
                  : 'bg-white border border-[#8b959e]/40 text-[#8b959e] cursor-not-allowed'
              }`}
            >
              Apply Filters
            </button>
            {hasActiveFilters() && (
              <button
                onClick={clearAllFilters}
                className="w-full py-2 px-4 bg-white border border-[#8b959e]/40 rounded-xl text-black hover:border-[#8b959e] hover:bg-[#8b959e]/5 transition-all duration-200 text-sm font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
