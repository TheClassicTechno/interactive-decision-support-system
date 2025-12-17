export interface Product {
  id: string;
  make: string;
  model: string;
  year: number;
  price?: number; // Make price optional since it might not always be available
  price_text?: string;
  price_value?: number;
  mileage?: number;
  location?: string;
  image_url?: string | null;
  vin?: string; // VIN for fetching images from auto.dev API
  trim?: string;
  body_style?: string;
  engine?: string;
  transmission?: string;
  exterior_color?: string;
  interior_color?: string;
  doors?: number;
  seating_capacity?: number;
  features?: string[];
  fuel_economy?: {
    city: number;
    highway: number;
    combined: number;
  };
  safety_rating?: {
    overall: number;
    frontal: number;
    side: number;
    rollover: number;
  };
  description?: string;
  dealer_info?: {
    name: string;
    phone: string;
    email: string;
  };
  carfax_url?: string;
  // Product-specific fields for electronics
  title?: string;
  brand?: string;
  source?: string;
  link?: string;
  rating?: number;
  rating_count?: number;
  price_currency?: string;
  product?: Record<string, unknown>;
  offer?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  
  // PC Part attributes (from raw data)
  series?: string;
  category?: string;
  part_type?: string;
  // GPU attributes
  vram?: string;
  memory_type?: string;
  cooler_type?: string;
  variant?: string;
  is_oc?: string;
  interface?: string;
  power_connector?: string;
  performance_tier?: string;
  recommended_psu?: string;
  target_resolution?: string;
  ray_tracing?: string;
  upscaling_support?: string;
  card_length?: string;
  slot_thickness?: string;
  video_encoder?: string;
  display_outputs?: string;
  // CPU attributes
  socket?: string;
  architecture?: string;
  pcie_version?: string;
  ram_standard?: string;
  tdp?: string;
  core_count?: string | number;
  thread_count?: string | number;
  integrated_graphics?: string;
  // Motherboard attributes
  chipset?: string;
  form_factor?: string;
  m2_slots?: string | number;
  wifi?: string;
  // PSU attributes
  wattage?: string;
  certification?: string;
  modularity?: string;
  atx_version?: string;
  noise?: string;
  supports_pcie5_power?: string;
  // Storage attributes
  storage?: string;
  capacity?: string;
  storage_type?: string;
  // Cooling attributes
  cooling_type?: string;
  tdp_support?: string;
}

export interface ProductFilters {
  make?: string;
  model?: string;
  year?: string;
  price_min?: number;
  price_max?: number;
  mileage_max?: number;
  body_style?: string;
  transmission?: string;
  state?: string;
  features?: string[];
}
