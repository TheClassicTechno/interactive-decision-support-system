import { ChatRequest, ChatResponse } from '@/types/chat';
import { Product } from '@/types/product';

// Use Next.js API routes as proxy (they handle backend routing)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

class IDSSApiService {
  private sessionId: string | null = null;

  async sendMessage(message: string): Promise<ChatResponse> {
    try {
      const url = API_BASE_URL ? `${API_BASE_URL}/chat` : '/api/chat';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          session_id: this.sessionId,
        } as ChatRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      // Store session ID for future requests
      if (data.session_id) {
        this.sessionId = data.session_id;
      }

      return data;
    } catch (error) {
      console.error('Error sending message to IDSS agent:', error);
      throw error;
    }
  }

  async getSession(sessionId?: string): Promise<Record<string, unknown>> {
    try {
      const id = sessionId || this.sessionId;
      if (!id) {
        throw new Error('No session ID available');
      }

      const url = API_BASE_URL ? `${API_BASE_URL}/session/${id}` : `/api/session/${id}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }

  async resetSession(): Promise<string> {
    try {
      const url = API_BASE_URL ? `${API_BASE_URL}/session/reset` : '/api/session/reset';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: this.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.session_id) {
        this.sessionId = data.session_id;
      }

      return data.session_id;
    } catch (error) {
      console.error('Error resetting session:', error);
      throw error;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async sendFavoriteAction(sessionId: string, product: Product, isFavorited: boolean): Promise<ChatResponse> {
    try {
      if (!sessionId) {
        throw new Error('No session ID available');
      }

      // Clean product object for serialization
      const productData = {
        vin: product.vin,
        make: product.make,
        model: product.model,
        year: product.year,
        price: product.price,
        mileage: product.mileage,
        miles: product.mileage,  // Backend might expect 'miles'
        location: product.location,
        trim: product.trim,
        body_style: product.body_style,
        engine: product.engine,
        transmission: product.transmission,
        exterior_color: product.exterior_color,
        features: product.features
      };

      const url = API_BASE_URL ? `${API_BASE_URL}/session/${sessionId}/favorite` : `/api/session/${sessionId}/favorite`;
      console.log('Sending to:', url);
      console.log('Request body:', { product: productData, is_favorited: isFavorited });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: productData,  // Send as 'product' field
          is_favorited: isFavorited,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending favorite action:', error);
      console.error('Error type:', error instanceof TypeError ? 'TypeError' : error instanceof Error ? 'Error' : 'Unknown');
      throw error;
    }
  }

  async applyFilters(sessionId: string, filters: Record<string, unknown>, clearKeys?: string[]): Promise<{
    session_id: string;
    filters: Record<string, unknown>;
    products: Record<string, unknown>[];
    total: number;
  }> {
    try {
      if (!sessionId) {
        throw new Error('No session ID available');
      }

      const url = API_BASE_URL ? `${API_BASE_URL}/session/${sessionId}/filters` : `/api/session/${sessionId}/filters`;
      console.log('Applying filters to:', url);
      console.log('Filters:', filters);
      if (clearKeys) console.log('Clearing keys:', clearKeys);

      const body: { filters: Record<string, unknown>; clear_keys?: string[] } = { filters };
      if (clearKeys && clearKeys.length > 0) {
        body.clear_keys = clearKeys;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error applying filters:', error);
      throw error;
    }
  }

  async clearFilters(sessionId: string, clearKeys: string[]): Promise<{
    session_id: string;
    filters: Record<string, unknown>;
    products: Record<string, unknown>[];
    total: number;
  }> {
    try {
      if (!sessionId) {
        throw new Error('No session ID available');
      }

      const url = API_BASE_URL ? `${API_BASE_URL}/session/${sessionId}/filters` : `/api/session/${sessionId}/filters`;
      console.log('Clearing filter keys:', clearKeys);

      // Use POST with clear_keys to only remove specific UI filter keys
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: {}, clear_keys: clearKeys }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing filters:', error);
      throw error;
    }
  }

  // Convert API product data to our Product type
  convertProduct(apiProduct: Record<string, unknown>): Product {
    const rawProduct = (apiProduct.product as Record<string, unknown>) || apiProduct;
    const retailListing = (apiProduct.retailListing as Record<string, unknown>) || {};
    const productMeta = (apiProduct.product as Record<string, unknown>) || {};
    const offer = (apiProduct.offer as Record<string, unknown>) || {};
    const photos = (apiProduct.photos as Record<string, unknown>) || {};
    // Extract attributes from nested objects (for PC parts data)
    const attrs = (apiProduct.attributes as Record<string, unknown>) 
      || (apiProduct.specs as Record<string, unknown>) 
      || (productMeta.attributes as Record<string, unknown>)
      || {};

    const title = (apiProduct.title as string) || (productMeta.title as string) || `${rawProduct.make || ''} ${rawProduct.model || ''}`.trim();
    const brand = (apiProduct.brand as string) || (productMeta.brand as string);
    const source = (apiProduct.source as string) || (offer.seller as string) || (productMeta.source as string);

    const priceText = (apiProduct.price_text as string) || (offer.price as string) || (apiProduct.price as string);
    let priceValue = (apiProduct.price_value as number) || (apiProduct.price as number) || undefined;

    if (!priceValue && typeof priceText === 'string') {
      const numericMatch = priceText.match(/[0-9]+(?:[.,][0-9]+)?/);
      if (numericMatch) {
        priceValue = parseFloat(numericMatch[0].replace(',', ''));
      }
    }

    const location = (() => {
      if (retailListing.city && retailListing.state) {
        return `${retailListing.city}, ${retailListing.state}`;
      }
      if (retailListing.state) {
        return retailListing.state as string;
      }
      if (rawProduct.location) {
        return rawProduct.location as string;
      }
      if (apiProduct.location) {
        return apiProduct.location as string;
      }
      return undefined;
    })();

    const vin = (rawProduct.vin as string) || (apiProduct.vin as string);

    const imageUrl = (apiProduct.image_url as string)
      || (apiProduct.imageUrl as string)
      || (rawProduct.image_url as string)
      || ((photos.retail as Array<Record<string, unknown>>)?.[0]?.url as string)
      || (retailListing.primaryImage as string);

    return {
      id: (rawProduct.id as string) || (apiProduct.id as string) || (productMeta.identifier as string) || (productMeta.id as string) || Math.random().toString(36).substr(2, 9),
      title: title || 'Product',
      make: (rawProduct.make as string) || brand || source || 'Unknown',
      model: (rawProduct.model as string) || title || 'Unknown',
      year: (rawProduct.year as number) || (apiProduct.year as number) || new Date().getFullYear(),
      price: typeof priceValue === 'number' && !Number.isNaN(priceValue) ? priceValue : undefined,
      price_text: priceText,
      price_value: priceValue,
      mileage: (rawProduct.mileage as number) || (apiProduct.mileage as number) || (retailListing.miles as number),
      location,
      vin,
      image_url: imageUrl,
      trim: (rawProduct.trim as string) || (apiProduct.trim as string),
      body_style: (rawProduct.bodyStyle as string) || (rawProduct.body_style as string) || (apiProduct.body_style as string),
      engine: (rawProduct.engine as string) || (apiProduct.engine as string),
      transmission: (rawProduct.transmission as string) || (apiProduct.transmission as string),
      exterior_color: (rawProduct.exteriorColor as string) || (rawProduct.exterior_color as string) || (apiProduct.exterior_color as string),
      interior_color: (rawProduct.interiorColor as string) || (rawProduct.interior_color as string) || (apiProduct.interior_color as string),
      doors: (rawProduct.doors as number) || (apiProduct.doors as number),
      seating_capacity: (rawProduct.seating_capacity as number) || (apiProduct.seating_capacity as number),
      features: (rawProduct.features as string[]) || (apiProduct.features as string[]) || [],
      fuel_economy: rawProduct.fuel_economy ? {
        city: (rawProduct.fuel_economy as Record<string, unknown>).city as number || 0,
        highway: (rawProduct.fuel_economy as Record<string, unknown>).highway as number || 0,
        combined: (rawProduct.fuel_economy as Record<string, unknown>).combined as number || 0,
      } : undefined,
      safety_rating: rawProduct.safety_rating ? {
        overall: (rawProduct.safety_rating as Record<string, unknown>).overall as number || 0,
        frontal: (rawProduct.safety_rating as Record<string, unknown>).frontal as number || 0,
        side: (rawProduct.safety_rating as Record<string, unknown>).side as number || 0,
        rollover: (rawProduct.safety_rating as Record<string, unknown>).rollover as number || 0,
      } : undefined,
      description: (rawProduct.description as string) || (apiProduct.description as string) || (productMeta.description as string),
      dealer_info: retailListing.dealer ? {
        name: ((retailListing.dealer as Record<string, unknown>).name as string) || 'Unknown Dealer',
        phone: (retailListing.dealer as Record<string, unknown>).phone as string,
        email: (retailListing.dealer as Record<string, unknown>).email as string,
      } : undefined,
      carfax_url: (retailListing.carfaxUrl as string) || undefined,
      brand,
      source,
      link: (apiProduct.link as string) || (offer.url as string) || (productMeta.link as string),
      rating: (apiProduct.rating as number) || (productMeta.rating as number),
      rating_count: (apiProduct.rating_count as number) || (apiProduct.reviewCount as number) || (productMeta.rating_count as number) || (productMeta.reviewCount as number),
      price_currency: (apiProduct.price_currency as string) || (offer.currency as string),
      product: Object.keys(productMeta).length > 0 ? productMeta : undefined,
      offer: Object.keys(offer).length > 0 ? offer : undefined,
      raw: apiProduct,
      
      // PC Part attributes - extract from raw data or attributes
      series: (apiProduct.series as string) || (attrs.series as string),
      category: (apiProduct.category as string) || (apiProduct.type as string) || (apiProduct.part_type as string) || (attrs.category as string),
      part_type: (apiProduct.part_type as string) || (apiProduct.type as string) || (apiProduct.category as string),
      // GPU attributes
      vram: (apiProduct.vram as string) || (attrs.vram as string),
      memory_type: (apiProduct.memory_type as string) || (attrs.memory_type as string),
      cooler_type: (apiProduct.cooler_type as string) || (attrs.cooler_type as string),
      variant: (apiProduct.variant as string) || (attrs.variant as string),
      is_oc: (apiProduct.is_oc as string) || (attrs.is_oc as string),
      interface: (apiProduct.interface as string) || (attrs.interface as string),
      power_connector: (apiProduct.power_connector as string) || (attrs.power_connector as string),
      performance_tier: (apiProduct.performance_tier as string) || (attrs.performance_tier as string),
      recommended_psu: (apiProduct.recommended_psu as string) || (attrs.recommended_psu as string),
      target_resolution: (apiProduct.target_resolution as string) || (attrs.target_resolution as string),
      ray_tracing: (apiProduct.ray_tracing as string) || (attrs.ray_tracing as string),
      upscaling_support: (apiProduct.upscaling_support as string) || (attrs.upscaling_support as string),
      card_length: (apiProduct.card_length as string) || (attrs.card_length as string),
      slot_thickness: (apiProduct.slot_thickness as string) || (attrs.slot_thickness as string),
      video_encoder: (apiProduct.video_encoder as string) || (attrs.video_encoder as string),
      display_outputs: (apiProduct.display_outputs as string) || (attrs.display_outputs as string),
      // CPU attributes
      socket: (apiProduct.socket as string) || (attrs.socket as string),
      architecture: (apiProduct.architecture as string) || (attrs.architecture as string),
      pcie_version: (apiProduct.pcie_version as string) || (attrs.pcie_version as string),
      ram_standard: (apiProduct.ram_standard as string) || (attrs.ram_standard as string),
      tdp: (apiProduct.tdp as string) || (attrs.tdp as string),
      core_count: (apiProduct.core_count as string | number) || (attrs.core_count as string | number),
      thread_count: (apiProduct.thread_count as string | number) || (attrs.thread_count as string | number),
      integrated_graphics: (apiProduct.integrated_graphics as string) || (attrs.integrated_graphics as string),
      // Motherboard attributes
      chipset: (apiProduct.chipset as string) || (attrs.chipset as string),
      form_factor: (apiProduct.form_factor as string) || (attrs.form_factor as string),
      m2_slots: (apiProduct.m2_slots as string | number) || (attrs.m2_slots as string | number),
      wifi: (apiProduct.wifi as string) || (attrs.wifi as string),
      // PSU attributes
      wattage: (apiProduct.wattage as string) || (attrs.wattage as string),
      certification: (apiProduct.certification as string) || (attrs.certification as string),
      modularity: (apiProduct.modularity as string) || (attrs.modularity as string),
      atx_version: (apiProduct.atx_version as string) || (attrs.atx_version as string),
      noise: (apiProduct.noise as string) || (attrs.noise as string),
      supports_pcie5_power: (apiProduct.supports_pcie5_power as string) || (attrs.supports_pcie5_power as string),
      // Storage attributes
      storage: (apiProduct.storage as string) || (attrs.storage as string),
      capacity: (apiProduct.capacity as string) || (attrs.capacity as string),
      storage_type: (apiProduct.storage_type as string) || (attrs.storage_type as string),
      // Cooling attributes
      cooling_type: (apiProduct.cooling_type as string) || (attrs.cooling_type as string),
      tdp_support: (apiProduct.tdp_support as string) || (attrs.tdp_support as string),
    };
  }
}

export const idssApiService = new IDSSApiService();
