interface LogEventRequest {
  event_type: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

interface LogEventResponse {
  status: string;
  event_id: number;
  timestamp: string;
}

export class LoggingService {
  private static baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-api-domain.com' 
    : 'http://localhost:8000';

  /**
   * Log a user interaction event
   */
  static async logEvent(sessionId: string, eventType: string, data: Record<string, unknown> = {}): Promise<LogEventResponse> {
    const request: LogEventRequest = {
      event_type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(`${this.baseUrl}/session/${sessionId}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to log event:', error);
      throw error;
    }
  }

  /**
   * Log when user views product details
   */
  static async logProductView(sessionId: string, productId: string): Promise<void> {
    try {
      await this.logEvent(sessionId, 'product_view', {
        product_id: productId,
        id: productId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log product view:', error);
    }
  }

  /**
   * Log when user clicks on a product
   */
  static async logProductClick(sessionId: string, productId: string): Promise<void> {
    try {
      await this.logEvent(sessionId, 'product_click', {
        product_id: productId,
        id: productId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log product click:', error);
    }
  }

  /**
   * Log when user views product photos
   */
  static async logPhotoView(sessionId: string, productId: string, vin?: string): Promise<void> {
    try {
      await this.logEvent(sessionId, 'photo_view', {
        product_id: productId,
        id: productId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log photo view:', error);
    }
  }

  /**
   * Log when user favorites/unfavorites a product
   */
  static async logFavoriteToggle(sessionId: string, productId: string, vin: string, isFavorite: boolean): Promise<void> {
    try {
      await this.logEvent(sessionId, isFavorite ? 'product_favorited' : 'product_unfavorited', {
        product_id: productId,
        id: productId,
        action: isFavorite ? 'favorited' : 'unfavorited',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log favorite toggle:', error);
    }
  }

  /**
   * Log agent response latency
   */
  static async logAgentLatency(sessionId: string, latencyMs: number, message: string): Promise<void> {
    try {
      await this.logEvent(sessionId, 'agent_latency', {
        latency_ms: latencyMs,
        message: message.substring(0, 200), // Truncate message for logging
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log agent latency:', error);
    }
  }

  /**
   * Log custom events
   */
  static async logCustomEvent(sessionId: string, eventType: string, data: Record<string, unknown> = {}): Promise<void> {
    try {
      await this.logEvent(sessionId, eventType, data);
    } catch (error) {
      console.error('Failed to log custom event:', error);
    }
  }
}
