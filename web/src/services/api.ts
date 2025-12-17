import { ChatRequest, ChatResponse } from '@/types/chat';
import { Product } from '@/types/vehicle';

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
      console.log('Request body:', { vehicle: productData, is_favorited: isFavorited });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle: productData,  // API still expects 'vehicle' field name for backward compatibility
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

  async applyFilters(sessionId: string, filters: Record<string, unknown>): Promise<{
    session_id: string;
    filters: Record<string, unknown>;
    vehicles: Record<string, unknown>[];
    total: number;
  }> {
    try {
      if (!sessionId) {
        throw new Error('No session ID available');
      }

      const url = API_BASE_URL ? `${API_BASE_URL}/session/${sessionId}/filters` : `/api/session/${sessionId}/filters`;
      console.log('Applying filters to:', url);
      console.log('Filters:', filters);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
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

  async clearFilters(sessionId: string): Promise<{
    session_id: string;
    filters: Record<string, unknown>;
    vehicles: Record<string, unknown>[];
    total: number;
  }> {
    try {
      if (!sessionId) {
        throw new Error('No session ID available');
      }

      const url = API_BASE_URL ? `${API_BASE_URL}/session/${sessionId}/filters` : `/api/session/${sessionId}/filters`;
      console.log('Clearing filters:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
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
  convertVehicle(apiVehicle: Record<string, unknown>): Product {
    const vehicle = (apiVehicle.vehicle as Record<string, unknown>) || apiVehicle;
    const retailListing = (apiVehicle.retailListing as Record<string, unknown>) || {};
    const product = (apiVehicle.product as Record<string, unknown>) || {};
    const offer = (apiVehicle.offer as Record<string, unknown>) || {};
    const photos = (apiVehicle.photos as Record<string, unknown>) || {};

    const title = (apiVehicle.title as string) || (product.title as string) || `${vehicle.make || ''} ${vehicle.model || ''}`.trim();
    const brand = (apiVehicle.brand as string) || (product.brand as string);
    const source = (apiVehicle.source as string) || (offer.seller as string) || (product.source as string);

    const priceText = (apiVehicle.price_text as string) || (offer.price as string) || (apiVehicle.price as string);
    let priceValue = (apiVehicle.price_value as number) || (apiVehicle.price as number) || undefined;

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
      if (vehicle.location) {
        return vehicle.location as string;
      }
      if (apiVehicle.location) {
        return apiVehicle.location as string;
      }
      return undefined;
    })();

    const vin = (vehicle.vin as string) || (apiVehicle.vin as string);

    const imageUrl = (apiVehicle.image_url as string)
      || (apiVehicle.imageUrl as string)
      || (vehicle.image_url as string)
      || ((photos.retail as Array<Record<string, unknown>>)?.[0]?.url as string)
      || (retailListing.primaryImage as string);

    return {
      id: (vehicle.id as string) || (apiVehicle.id as string) || (product.identifier as string) || (product.id as string) || Math.random().toString(36).substr(2, 9),
      title: title || 'Product',
      make: (vehicle.make as string) || brand || source || 'Unknown',
      model: (vehicle.model as string) || title || 'Unknown',
      year: (vehicle.year as number) || (apiVehicle.year as number) || new Date().getFullYear(),
      price: typeof priceValue === 'number' && !Number.isNaN(priceValue) ? priceValue : undefined,
      price_text: priceText,
      price_value: priceValue,
      mileage: (vehicle.mileage as number) || (apiVehicle.mileage as number) || (retailListing.miles as number),
      location,
      vin,
      image_url: imageUrl,
      trim: (vehicle.trim as string) || (apiVehicle.trim as string),
      body_style: (vehicle.bodyStyle as string) || (vehicle.body_style as string) || (apiVehicle.body_style as string),
      engine: (vehicle.engine as string) || (apiVehicle.engine as string),
      transmission: (vehicle.transmission as string) || (apiVehicle.transmission as string),
      exterior_color: (vehicle.exteriorColor as string) || (vehicle.exterior_color as string) || (apiVehicle.exterior_color as string),
      interior_color: (vehicle.interiorColor as string) || (vehicle.interior_color as string) || (apiVehicle.interior_color as string),
      doors: (vehicle.doors as number) || (apiVehicle.doors as number),
      seating_capacity: (vehicle.seating_capacity as number) || (apiVehicle.seating_capacity as number),
      features: (vehicle.features as string[]) || (apiVehicle.features as string[]) || [],
      fuel_economy: vehicle.fuel_economy ? {
        city: (vehicle.fuel_economy as Record<string, unknown>).city as number || 0,
        highway: (vehicle.fuel_economy as Record<string, unknown>).highway as number || 0,
        combined: (vehicle.fuel_economy as Record<string, unknown>).combined as number || 0,
      } : undefined,
      safety_rating: vehicle.safety_rating ? {
        overall: (vehicle.safety_rating as Record<string, unknown>).overall as number || 0,
        frontal: (vehicle.safety_rating as Record<string, unknown>).frontal as number || 0,
        side: (vehicle.safety_rating as Record<string, unknown>).side as number || 0,
        rollover: (vehicle.safety_rating as Record<string, unknown>).rollover as number || 0,
      } : undefined,
      description: (vehicle.description as string) || (apiVehicle.description as string) || (product.description as string),
      dealer_info: retailListing.dealer ? {
        name: ((retailListing.dealer as Record<string, unknown>).name as string) || 'Unknown Dealer',
        phone: (retailListing.dealer as Record<string, unknown>).phone as string,
        email: (retailListing.dealer as Record<string, unknown>).email as string,
      } : undefined,
      carfax_url: (retailListing.carfaxUrl as string) || undefined,
      brand,
      source,
      link: (apiVehicle.link as string) || (offer.url as string) || (product.link as string),
      rating: (apiVehicle.rating as number) || (product.rating as number),
      rating_count: (apiVehicle.rating_count as number) || (apiVehicle.reviewCount as number) || (product.rating_count as number) || (product.reviewCount as number),
      price_currency: (apiVehicle.price_currency as string) || (offer.currency as string),
      product: Object.keys(product).length > 0 ? product : undefined,
      offer: Object.keys(offer).length > 0 ? offer : undefined,
      raw: apiVehicle,
    };
  }
}

export const idssApiService = new IDSSApiService();
