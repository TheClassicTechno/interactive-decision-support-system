'use client';

import { useState, useEffect, useRef } from 'react';
import ChatBox from '@/components/ChatBox';
import RecommendationCarousel from '@/components/RecommendationCarousel';
import ItemDetailModal from '@/components/ItemDetailModal';
import FilterMenu from '@/components/FilterMenu';
import FavoritesPage from '@/components/FavoritesPage';
import ComparisonTable from '@/components/ComparisonTable';
import CompatibilityResult from '@/components/CompatibilityResult';
import { Product } from '@/types/product';
import { ChatMessage, ChatResponse } from '@/types/chat';
import { idssApiService } from '@/services/api';
import { LoggingService } from '@/services/logging';
import { useVerboseLoading } from '@/hooks/useVerboseLoading';

// Format agent response to remove quotes and convert to proper markdown
function formatAgentResponse(response: string): string {
  // Remove surrounding quotes if present
  let formatted = response.trim();
  if ((formatted.startsWith('"') && formatted.endsWith('"')) || 
      (formatted.startsWith("'") && formatted.endsWith("'"))) {
    formatted = formatted.slice(1, -1);
  }
  
  // Convert dashes and asterisks to proper bullet points (keep on same line)
  formatted = formatted.replace(/^[\s]*[-*][\s]+/gm, '• ');
  
  // Clean up any double newlines
  formatted = formatted.replace(/\n\n+/g, '\n\n');
  
  return formatted.trim();
}

// Simple markdown parser for chat messages
function parseMarkdown(text: string): string {
  let html = text;
  
  // Remove exclamation marks before "photos"
  html = html.replace(/!+\s*([Pp]hotos?)/g, '$1');
  
  // Convert bold text **text** or *text* to <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  
  // Convert headings ### Heading to <h3>
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mb-0 mt-0">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mb-0 mt-0">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-0 mt-0">$1</h1>');
  
  // Convert links [text](url) to <a>
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#750013] hover:text-[#750013]/70 underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert bullet points • to proper list items
  html = html.replace(/^• (.*$)/gm, '<li class="mb-2">$1</li>');
  
  // Wrap consecutive list items in <ul>
  html = html.replace(/(<li class="mb-2">.*<\/li>(\s*<li class="mb-2">.*<\/li>)*)/g, '<ul class="list-none space-y-2">$1</ul>');
  
  // Remove line breaks between list items
  html = html.replace(/<\/li>\s*\n\s*<li/g, '</li><li');
  
  // Wrap the first non-list, non-empty line in a paragraph with margin-bottom
  // This targets the first line that doesn't start with '<' (i.e., not an HTML tag)
  html = html.replace(/^([^\n<].*?)\n/, '<p class="mb-2">$1</p>\n');
  
  // Convert single line breaks to <br>, but preserve paragraph structure
  // First, wrap paragraphs separated by blank lines
  html = html.replace(/\n\n+/g, '</p><p class="mb-2">');
  
  // Convert remaining single line breaks to <br> for non-list content
  html = html.replace(/\n(?!<)/g, '<br>');
  
  // Remove extra <br> tags immediately before <ul> tags (to remove blank lines before bullet lists)
  html = html.replace(/(<br>)+<ul/g, '<ul');
  
  // Remove extra <br> tags immediately after </ul> tags (to remove blank lines after bullet lists)
  // Handle cases with whitespace and multiple <br> tags
  html = html.replace(/<\/ul>\s*(<br>)+/g, '</ul>');
  
  // Clean up any empty paragraphs
  html = html.replace(/<p class="mb-2"><\/p>/g, '');
  
  // Ensure all content is wrapped in paragraphs if not already
  if (!html.includes('<p') && !html.includes('<ul') && !html.includes('<h')) {
    html = `<p class="mb-2">${html}</p>`;
  } else {
    // Wrap any leading content not in a tag
    html = html.replace(/^(?!<)([^<]+)/, '<p class="mb-2">$1</p>');
    // Wrap any trailing content not in a tag
    html = html.replace(/([^>]+)$(?!<\/)/, '<p class="mb-2">$1</p>');
  }
  
  return html;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [hasReceivedRecommendations, setHasReceivedRecommendations] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Record<string, unknown>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [detailViewStartTime, setDetailViewStartTime] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [previousView, setPreviousView] = useState<'carousel' | 'favorites' | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const [topSectionHeight, setTopSectionHeight] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  
  const { currentMessage, start, stop, setProgressMessage } = useVerboseLoading();

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = async (product: Product) => {
    const currentlyFavorited = favorites.some(p => p.id === product.id);
    const newFavoritedState = !currentlyFavorited;
    const action = newFavoritedState ? 'favorited' : 'unfavorited';

    // Log the favorite action
    console.log(`User ${action} product:`, product);

    // Update local favorites state
    setFavorites(prev => {
      if (currentlyFavorited) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });

    // Send to backend and get proactive response
    if (sessionId) {
      try {
        console.log('Sending favorite action to backend:', {
          sessionId,
          productId: product.id,
          isFavorited: newFavoritedState
        });

        // Call the new favorite endpoint
        const response = await idssApiService.sendFavoriteAction(sessionId, product, newFavoritedState);

        console.log('Received response from backend:', response);

        // If favorited (not unfavorited) and we got a proactive response
        if (newFavoritedState && response.response) {
          // Add proactive response to chat messages
          setChatMessages(prev => [...prev, {
            id: `favorite-${Date.now()}`,
            role: 'assistant',
            content: response.response,
            timestamp: new Date(),
            quick_replies: response.quick_replies || undefined
          }]);

          console.log('Proactive response added to chat:', response.response);
        }
      } catch (error) {
        console.error('Error sending favorite action to backend:', error);
        console.error('Error details:', error instanceof Error ? error.message : error);
        // Favorite still works locally even if backend fails
      }

      // Also log to analytics event API (non-blocking, keep for backward compatibility)
      LoggingService.logFavoriteToggle(
        sessionId,
        product.id,
        product.vin || 'unknown',
        newFavoritedState
      ).catch(err => console.error('Error logging favorite to analytics:', err));
    }
  };

  const isFavorite = (productId: string) => {
    return favorites.some(p => p.id === productId);
  };

  // Request user location on first load
  useEffect(() => {
    if (!locationRequested && navigator.geolocation) {
      setLocationRequested(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationGranted(true);
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
          setLocationDenied(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, [locationRequested]);

  // Initialize with the agent's first message
  useEffect(() => {
    if (chatMessages.length === 0) {
      const initialMessage: ChatMessage = {
        id: 'initial',
        role: 'assistant',
        content: "Welcome to your personal shopping assistant! Let's find your ideal match. What are you looking for?",
        timestamp: new Date()
      };
      setChatMessages([initialMessage]);
    }
  }, [chatMessages.length]);

  // Auto-scroll chat messages to bottom when new messages arrive or loading state changes
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      // Use requestAnimationFrame for smoother scrolling after DOM updates
      requestAnimationFrame(() => {
        if (chatMessagesContainerRef.current) {
          chatMessagesContainerRef.current.scrollTo({
            top: chatMessagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
  }, [chatMessages, isLoading]);

  // Helper function to handle streaming response
  const handleStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    let currentEventType = '';
    let hasCompleted = false;
    let finalData: ChatResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('event:')) {
          currentEventType = line.substring(6).trim();
          
          if (currentEventType === 'complete') {
            hasCompleted = true;
          }
        } else if (line.startsWith('data:')) {
          const dataStr = line.substring(5).trim();
          
          if (currentEventType === 'progress') {
            try {
              const progressData = JSON.parse(dataStr);
              if (progressData.description) {
                setProgressMessage(progressData.description);
              }
            } catch (e) {
              console.error('Error parsing progress data:', e);
            }
          } else if (currentEventType === 'complete' && hasCompleted) {
            try {
              finalData = JSON.parse(dataStr);
            } catch (e) {
              console.error('Error parsing complete data:', e);
            }
          } else if (currentEventType === 'error') {
            try {
              const errorData = JSON.parse(dataStr);
              throw new Error(errorData.error || 'Unknown error');
            } catch (e) {
              console.error('Error parsing error data:', e);
            }
          }
        }
      }
    }

    return finalData;
  };

  const handleChatMessage = async (message: string) => {
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    start(); // Start verbose loading

    // Track latency
    const startTime = performance.now();

    // Prepare request body with location if available and this is the first user message
    const isFirstUserMessage = chatMessages.filter(m => m.role === 'user').length === 0;
    const requestBody: { message: string; session_id?: string; latitude?: number; longitude?: number } = {
      message,
      ...(sessionId && { session_id: sessionId }),
    };
    
    // Include location with first user message after location is granted
    if (isFirstUserMessage && userLocation && locationGranted) {
      requestBody.latitude = userLocation.latitude;
      requestBody.longitude = userLocation.longitude;
    }

    try {
      // Send message to streaming endpoint
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      // Handle streaming response
      const data = await handleStreamingResponse(response);
      
      if (!data) {
        throw new Error('No data received from streaming response');
      }
      
      // Log API response to console (visible in Chrome DevTools Network/Console tab)
      console.log('%c[API Response]', 'color: #2196F3; font-weight: bold; font-size: 14px', {
        session_id: data.session_id,
        has_compatibility_result: !!data.compatibility_result,
        has_comparison_table: !!data.comparison_table,
        products_count: data.products?.length || 0,
        response_length: data.response?.length || 0
      });
      
      // Update session ID
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      // Add assistant response with formatting
      const formattedResponse = formatAgentResponse(data.response);
      
      // Track latency and log to internal record
      const latency = performance.now() - startTime;
      
      // Log latency to internal record
      if (sessionId) {
        LoggingService.logAgentLatency(sessionId, latency, message).catch(
          err => console.error('Error logging latency:', err)
        );
      }
      
      // Log KG compatibility queries/results to console (visible in Chrome DevTools)
      if (data.compatibility_result) {
        console.group('%c[KG Compatibility Query]', 'color: #4CAF50; font-weight: bold; font-size: 14px');
        console.log('Query Type:', data.compatibility_result.compatible !== undefined ? 'Binary Compatibility Check' : 'Compatibility Recommendations');
        console.log('Result:', data.compatibility_result);
        if (data.compatibility_result.part1_name && data.compatibility_result.part2_name) {
          console.log('Parts:', {
            part1: data.compatibility_result.part1_name,
            part2: data.compatibility_result.part2_name,
            compatible: data.compatibility_result.compatible,
            compatibility_types: data.compatibility_result.compatibility_types || []
          });
        }
        if (data.compatibility_result.error) {
          console.warn('Error:', data.compatibility_result.error);
        }
        console.groupEnd();
      }

      // Log comparison tables (may contain KG compatibility recommendations)
      if (data.comparison_table) {
        console.group('%c[KG Comparison Table]', 'color: #FF9800; font-weight: bold; font-size: 14px');
        console.log('Headers:', data.comparison_table.headers);
        console.log('Rows:', data.comparison_table.rows);
        console.log('Product Count:', data.comparison_table.headers?.length - 1 || 0);
        console.groupEnd();
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: formattedResponse,
        timestamp: new Date(),
        quick_replies: data.quick_replies,
        suggested_followups: data.suggested_followups || [],
        comparison_table: data.comparison_table || null,
        compatibility_result: data.compatibility_result || null
      };
      setChatMessages(prev => [...prev, assistantMessage]);

      // Update products - convert API format to our format
      if (data.products && data.products.length > 0) {
        const convertedProducts = data.products.map((apiProduct: Record<string, unknown>) => {
          return idssApiService.convertProduct(apiProduct);
        });
        setProducts(convertedProducts);
        setHasReceivedRecommendations(true);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I ran into an issue. Mind trying again?`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      stop(); // Stop verbose loading
    }
  };

  const handleFilterChange = async (filters: Record<string, unknown>, clearKeys?: string[]) => {
    setCurrentFilters(filters);
    setIsLoading(true);

    try {
      // Ensure we have a session ID - create one if needed by sending a quick init
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        // Initialize session by sending a simple message
        const initResponse = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Hello' }),
        });
        const initData = await handleStreamingResponse(initResponse);
        if (initData?.session_id) {
          currentSessionId = initData.session_id;
          setSessionId(currentSessionId);
        }
      }

      if (!currentSessionId) {
        throw new Error('Could not establish session');
      }

      // Apply filters directly via the filters API (with optional clear_keys)
      const data = await idssApiService.applyFilters(currentSessionId, filters, clearKeys);
      
      console.log('Filters applied successfully:', data);

      // Update products - convert API format to our format
      if (data.products && data.products.length > 0) {
        const convertedProducts = data.products.map((apiProduct: Record<string, unknown>) => {
          return idssApiService.convertProduct(apiProduct);
        });
        setProducts(convertedProducts);
        setHasReceivedRecommendations(true);
      } else {
        setProducts([]);
      }

    } catch (error) {
      console.error('Error applying filters:', error);
      
      // Add error message only if there's an error
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I ran into an issue applying your filters. Please try again.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSelect = async (product: Product) => {
    // Remember where we came from
    setPreviousView(showFavorites ? 'favorites' : 'carousel');
    // Hide favorites when showing details
    if (showFavorites) {
      setShowFavorites(false);
    }
    setSelectedItem(product);
    setShowDetails(true);
    setDetailViewStartTime(Date.now());
    
    // Log the product view event
    if (sessionId) {
      await LoggingService.logProductView(sessionId, product.id);
    }
  };

  const handleItemSelectSync = (product: Product) => {
    handleItemSelect(product);
  };

  // Find the index of the selected product
  const getSelectedProductIndex = () => {
    if (!selectedItem) return 0;
    return products.findIndex(p => p.id === selectedItem.id) + 1;
  };

  const handleBackToRecommendations = async () => {
    // Log the duration spent viewing details
    if (sessionId && selectedItem && detailViewStartTime) {
      const duration = Date.now() - detailViewStartTime;
      await LoggingService.logCustomEvent(sessionId, 'product_detail_duration', {
        product_id: selectedItem.id,
        id: selectedItem.id,
        duration_ms: duration,
        duration_seconds: Math.round(duration / 1000)
      });
    }
    
    // Return to previous view
    setShowDetails(false);
    setSelectedItem(null);
    if (previousView === 'favorites') {
      setShowFavorites(true);
    }
    setPreviousView(null);
    setDetailViewStartTime(null);
  };

  // Get only the last 3 turns (6 messages max: user-agent-user-agent-user-agent)
  const getLastThreeTurns = () => {
    const maxMessages = 6; // 3 turns = 6 messages max
    return chatMessages.slice(-maxMessages);
  };

  const recentMessages = getLastThreeTurns();

  // Handle drag for resizable splitter
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const containerHeight = window.innerHeight;
      const newHeight = (e.clientY / containerHeight) * 100;
      
      // Constrain between 20% and 80%
      const constrainedHeight = Math.max(20, Math.min(80, newHeight));
      setTopSectionHeight(constrainedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="min-h-screen bg-white">
      <div className="h-screen flex flex-col">
        {/* Recommendations at the top or Details View or Favorites */}
        {(hasReceivedRecommendations || showFavorites || (showDetails && selectedItem)) && (
          <div className="flex-shrink-0 overflow-hidden bg-[#8C1515]/15" style={{ height: `${topSectionHeight}%` }}>
            <div className="p-1 h-full">
              <div className="max-w-6xl mx-auto h-full">
              {showFavorites ? (
                <div className="bg-white rounded-xl p-2 relative overflow-hidden h-full border border-[#8b959e]/30 shadow-sm">
                  <FavoritesPage
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={isFavorite}
                    onItemSelect={handleItemSelectSync}
                    onClose={() => setShowFavorites(false)}
                  />
                </div>
              ) : showDetails && selectedItem ? (
                <div className="bg-white rounded-xl p-2 relative overflow-y-auto h-full border border-[#8b959e]/30 shadow-sm">
                  {/* Back Button */}
                  <button
                    onClick={handleBackToRecommendations}
                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-lg flex items-center justify-center hover:bg-[#8b959e]/10 transition-all duration-200 z-10 border border-[#8b959e]/40"
                  >
                    <svg className="w-3 h-3 text-[#8b959e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* Product Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pr-8">
                    {/* Image */}
                    <div className="aspect-video bg-gradient-to-br from-[#750013] to-white rounded-lg flex items-center justify-center overflow-hidden relative">
                      {selectedItem.image_url ? (
                        <img
                          src={selectedItem.image_url}
                          alt={selectedItem.title || `${selectedItem.year} ${selectedItem.make} ${selectedItem.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-[#8b959e] text-center">
                          <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="text-xs">No Image Available</div>
                        </div>
                      )}
                      
                      {/* Number indicator */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-[#750013] text-[#750013] rounded-lg flex items-center justify-center text-base font-bold shadow-sm">
                        {getSelectedProductIndex()}
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="space-y-1 overflow-y-auto max-h-[calc(100%-1rem)]">
                      <div>
                        <h2 className="text-2xl font-bold text-black mb-1">
                          {selectedItem.title || `${selectedItem.year} ${selectedItem.brand || selectedItem.make} ${selectedItem.model}`}
                        </h2>
                        {selectedItem.brand && (
                          <p className="text-sm text-[#8b959e]">{selectedItem.brand} {selectedItem.series && `• ${selectedItem.series}`}</p>
                        )}
                      </div>
                      
                      {/* Key Info Grid - Price, Rating, Year */}
                      <div className="grid grid-cols-2 gap-1">
                        {selectedItem.price && (
                          <div className="bg-white border border-[#8b959e]/30 rounded p-2 border-l-4 border-l-[#750013]">
                            <div className="text-[#8b959e] text-base">Price</div>
                            <div className="text-lg font-bold text-[#750013]">
                              ${selectedItem.price.toLocaleString()}
                            </div>
                          </div>
                        )}
                        
                        {selectedItem.rating && (
                          <div className="bg-white border border-[#8b959e]/30 rounded p-2 border-l-4 border-l-[#750013]">
                            <div className="text-[#8b959e] text-base">Rating</div>
                            <div className="text-lg font-bold text-black">
                              {selectedItem.rating.toFixed(1)} ★
                              {selectedItem.rating_count && <span className="text-sm font-normal text-[#8b959e]"> ({selectedItem.rating_count.toLocaleString()})</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Type & Retailer */}
                      <div className="grid grid-cols-2 gap-1">
                        {(selectedItem.category || selectedItem.part_type) && (
                          <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                            <div className="text-[#8b959e] text-base">Type</div>
                            <div className="text-black text-base capitalize">{selectedItem.category || selectedItem.part_type}</div>
                          </div>
                        )}
                        
                        {selectedItem.source && (
                          <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                            <div className="text-[#8b959e] text-base">Retailer</div>
                            <div className="text-black text-base">{selectedItem.source}</div>
                          </div>
                        )}
                        
                        {selectedItem.year && (
                          <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                            <div className="text-[#8b959e] text-base">Year</div>
                            <div className="text-black text-base">{selectedItem.year}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* GPU-specific attributes */}
                      {(selectedItem.category === 'gpu' || selectedItem.part_type === 'gpu' || selectedItem.vram) && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.vram && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">VRAM</div>
                              <div className="text-black text-base">{selectedItem.vram} GB</div>
                            </div>
                          )}
                          {selectedItem.memory_type && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Memory Type</div>
                              <div className="text-black text-base">{selectedItem.memory_type}</div>
                            </div>
                          )}
                          {selectedItem.performance_tier && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Performance Tier</div>
                              <div className="text-black text-base capitalize">{selectedItem.performance_tier}</div>
                            </div>
                          )}
                          {selectedItem.target_resolution && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Target Resolution</div>
                              <div className="text-black text-base">{selectedItem.target_resolution}</div>
                            </div>
                          )}
                          {selectedItem.recommended_psu && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Recommended PSU</div>
                              <div className="text-black text-base">{selectedItem.recommended_psu}W</div>
                            </div>
                          )}
                          {selectedItem.power_connector && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Power Connector</div>
                              <div className="text-black text-base">{selectedItem.power_connector}</div>
                            </div>
                          )}
                          {selectedItem.card_length && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Card Length</div>
                              <div className="text-black text-base">{selectedItem.card_length}</div>
                            </div>
                          )}
                          {selectedItem.slot_thickness && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Slot Thickness</div>
                              <div className="text-black text-base">{selectedItem.slot_thickness}</div>
                            </div>
                          )}
                          {selectedItem.cooler_type && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Cooler Type</div>
                              <div className="text-black text-base capitalize">{selectedItem.cooler_type}</div>
                            </div>
                          )}
                          {selectedItem.ray_tracing && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Ray Tracing</div>
                              <div className="text-black text-base">{selectedItem.ray_tracing}</div>
                            </div>
                          )}
                          {selectedItem.upscaling_support && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Upscaling</div>
                              <div className="text-black text-base">{selectedItem.upscaling_support}</div>
                            </div>
                          )}
                          {selectedItem.display_outputs && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Display Outputs</div>
                              <div className="text-black text-base">{selectedItem.display_outputs}</div>
                            </div>
                          )}
                          {selectedItem.video_encoder && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Video Encoder</div>
                              <div className="text-black text-base">{selectedItem.video_encoder}</div>
                            </div>
                          )}
                          {selectedItem.interface && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Interface</div>
                              <div className="text-black text-base">{selectedItem.interface}</div>
                            </div>
                          )}
                          {selectedItem.variant && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Variant</div>
                              <div className="text-black text-base">{selectedItem.variant}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* CPU-specific attributes */}
                      {(selectedItem.category === 'cpu' || selectedItem.part_type === 'cpu' || selectedItem.core_count) && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.core_count && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Cores</div>
                              <div className="text-black text-base">{selectedItem.core_count}</div>
                            </div>
                          )}
                          {selectedItem.thread_count && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Threads</div>
                              <div className="text-black text-base">{selectedItem.thread_count}</div>
                            </div>
                          )}
                          {selectedItem.socket && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Socket</div>
                              <div className="text-black text-base">{selectedItem.socket}</div>
                            </div>
                          )}
                          {selectedItem.architecture && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Architecture</div>
                              <div className="text-black text-base">{selectedItem.architecture}</div>
                            </div>
                          )}
                          {selectedItem.tdp && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">TDP</div>
                              <div className="text-black text-base">{selectedItem.tdp}W</div>
                            </div>
                          )}
                          {selectedItem.integrated_graphics && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Integrated Graphics</div>
                              <div className="text-black text-base">{selectedItem.integrated_graphics}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Motherboard-specific attributes */}
                      {(selectedItem.category === 'motherboard' || selectedItem.part_type === 'motherboard' || selectedItem.chipset) && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.chipset && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Chipset</div>
                              <div className="text-black text-base">{selectedItem.chipset}</div>
                            </div>
                          )}
                          {selectedItem.socket && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Socket</div>
                              <div className="text-black text-base">{selectedItem.socket}</div>
                            </div>
                          )}
                          {selectedItem.form_factor && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Form Factor</div>
                              <div className="text-black text-base">{selectedItem.form_factor}</div>
                            </div>
                          )}
                          {selectedItem.ram_standard && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">RAM Standard</div>
                              <div className="text-black text-base">{selectedItem.ram_standard}</div>
                            </div>
                          )}
                          {selectedItem.m2_slots && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">M.2 Slots</div>
                              <div className="text-black text-base">{selectedItem.m2_slots}</div>
                            </div>
                          )}
                          {selectedItem.wifi && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">WiFi</div>
                              <div className="text-black text-base">{selectedItem.wifi}</div>
                            </div>
                          )}
                          {selectedItem.pcie_version && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">PCIe Version</div>
                              <div className="text-black text-base">{selectedItem.pcie_version}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* PSU-specific attributes */}
                      {(selectedItem.category === 'psu' || selectedItem.part_type === 'psu' || selectedItem.wattage) && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.wattage && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Wattage</div>
                              <div className="text-black text-base">{selectedItem.wattage}W</div>
                            </div>
                          )}
                          {selectedItem.certification && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Certification</div>
                              <div className="text-black text-base">{selectedItem.certification}</div>
                            </div>
                          )}
                          {selectedItem.modularity && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Modularity</div>
                              <div className="text-black text-base capitalize">{selectedItem.modularity}</div>
                            </div>
                          )}
                          {selectedItem.atx_version && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">ATX Version</div>
                              <div className="text-black text-base">{selectedItem.atx_version}</div>
                            </div>
                          )}
                          {selectedItem.noise && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Noise Level</div>
                              <div className="text-black text-base">{selectedItem.noise} dB</div>
                            </div>
                          )}
                          {selectedItem.supports_pcie5_power && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">PCIe 5.0 Power</div>
                              <div className="text-black text-base">{selectedItem.supports_pcie5_power === 'true' ? 'Yes' : 'No'}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Storage-specific attributes */}
                      {(selectedItem.category === 'storage' || selectedItem.part_type === 'storage' || selectedItem.storage_type) && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.capacity && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Capacity</div>
                              <div className="text-black text-base">{selectedItem.capacity}</div>
                            </div>
                          )}
                          {selectedItem.storage_type && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Storage Type</div>
                              <div className="text-black text-base">{selectedItem.storage_type}</div>
                            </div>
                          )}
                          {selectedItem.interface && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Interface</div>
                              <div className="text-black text-base">{selectedItem.interface}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Cooling-specific attributes */}
                      {(selectedItem.category === 'cooling' || selectedItem.part_type === 'cooling' || selectedItem.cooling_type) && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.cooling_type && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Cooling Type</div>
                              <div className="text-black text-base capitalize">{selectedItem.cooling_type}</div>
                            </div>
                          )}
                          {selectedItem.tdp_support && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">TDP Support</div>
                              <div className="text-black text-base">{selectedItem.tdp_support}W</div>
                            </div>
                          )}
                          {selectedItem.socket && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Socket Compatibility</div>
                              <div className="text-black text-base">{selectedItem.socket}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* RAM-specific attributes */}
                      {(selectedItem.category === 'ram' || selectedItem.part_type === 'ram') && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.capacity && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Capacity</div>
                              <div className="text-black text-base">{selectedItem.capacity}</div>
                            </div>
                          )}
                          {selectedItem.ram_standard && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">RAM Type</div>
                              <div className="text-black text-base">{selectedItem.ram_standard}</div>
                            </div>
                          )}
                          {selectedItem.form_factor && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Form Factor</div>
                              <div className="text-black text-base">{selectedItem.form_factor}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Case-specific attributes */}
                      {(selectedItem.category === 'case' || selectedItem.part_type === 'case') && (
                        <div className="grid grid-cols-2 gap-1">
                          {selectedItem.form_factor && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Form Factor</div>
                              <div className="text-black text-base">{selectedItem.form_factor}</div>
                            </div>
                          )}
                          {selectedItem.storage && (
                            <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                              <div className="text-[#8b959e] text-base">Drive Bays</div>
                              <div className="text-black text-base">{selectedItem.storage}</div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Legacy attributes (fallback for non-PC parts) */}
                      {selectedItem.mileage && (
                        <div className="grid grid-cols-2 gap-1">
                          <div className="bg-white border border-[#8b959e]/30 rounded p-2 border-l-4 border-l-[#750013]">
                            <div className="text-[#8b959e] text-base">Mileage</div>
                            <div className="text-lg font-bold text-black">
                              {typeof selectedItem.mileage === 'number' ? selectedItem.mileage.toLocaleString() : selectedItem.mileage} mi
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedItem.location && (
                        <div className="bg-white border border-[#8b959e]/30 rounded p-2 border-l-4 border-l-[#750013]">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-[#750013]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="text-black text-base">
                              {selectedItem.location === '00' ? 'Unknown' : selectedItem.location}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Description */}
                      {selectedItem.description && (
                        <div className="bg-white border border-[#8b959e]/30 rounded p-2">
                          <div className="text-[#8b959e] text-base">Description</div>
                          <div className="text-black text-base">{selectedItem.description}</div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <RecommendationCarousel 
                    products={products} 
                    onItemSelect={handleItemSelectSync}
                    showPlaceholders={false}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={isFavorite}
                    currentIndex={carouselIndex}
                    onIndexChange={setCarouselIndex}
                  />
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Resizable Splitter */}
        {(hasReceivedRecommendations || showFavorites || (showDetails && selectedItem)) && (
          <div 
            className="h-1 bg-[#8b959e]/20 hover:bg-[#8b959e]/30 cursor-row-resize relative group transition-all duration-200"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 w-16 bg-[#8b959e] group-hover:bg-[#750013] rounded-full transition-colors duration-200"></div>
            </div>
          </div>
        )}

        {/* Chat Messages - Only last 3 turns */}
        <div 
          ref={chatMessagesContainerRef}
          className={`overflow-y-auto p-12 relative min-h-0`}
          style={(hasReceivedRecommendations || showFavorites) ? { height: `${100 - topSectionHeight - 11}%` } : { flex: 1 }}
        >
          <div className="max-w-6xl mx-auto flex flex-col justify-end min-h-full space-y-6">
            {recentMessages.map((message) => (
              <div key={message.id} className="flex flex-col">
                <div
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-[#750013] to-[#750013]/70 text-white shadow-sm'
                        : 'bg-white text-black border border-[#8b959e]/30 shadow-sm'
                    }`}
                  >
                    <div 
                      className="text-lg leading-relaxed chat-message prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                    />
                    
                    {/* Display comparison table if present */}
                    {message.comparison_table && (
                      <ComparisonTable comparison={message.comparison_table} />
                    )}
                    
                    {/* Display compatibility result if present */}
                    {message.compatibility_result && (
                      <CompatibilityResult result={message.compatibility_result} />
                    )}
                  </div>
                </div>
                
                {/* Buttons below assistant messages (row format, no headers) */}
                {message.role === 'assistant' && ((message.quick_replies && message.quick_replies.length > 0) || (message.suggested_followups && message.suggested_followups.length > 0)) && (
                  <div className="flex justify-start mt-2">
                    <div className="max-w-[80%] w-full flex flex-wrap gap-2">
                      {(() => {
                        // Smart display logic: if message contains a question, show quick_replies; otherwise show suggested_followups
                        const hasQuestion = message.content.includes('?');
                        const buttonsToShow = hasQuestion 
                          ? (message.quick_replies || [])
                          : (message.suggested_followups || []);
                        
                        return buttonsToShow.map((reply, idx) => {
                          return (
                            <button
                              key={idx}
                              onClick={() => handleChatMessage(reply)}
                              disabled={isLoading}
                              className="px-5 py-3 bg-white hover:bg-[#8b959e]/5 border border-[#8b959e]/40 hover:border-[#750013] text-[#750013] hover:text-[#750013] text-base rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-medium shadow-sm"
                            >
                              {reply}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl border border-[#8b959e]/30 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <span className="text-base text-black backdrop-blur-sm relative overflow-hidden">
                      <span className="loading-ripple">{currentMessage}</span>
                    </span>
                    <div className="flex space-x-1">
                      <div className="w-2.5 h-2.5 bg-[#8b959e] rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-[#750013] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2.5 h-2.5 bg-[#8b959e] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="h-[11%] flex-shrink-0 border-t border-[#8b959e]/30 bg-[#8C1515]/15 flex items-center px-8 py-6">
          <div className="w-3/4 mx-auto">
            <ChatBox
              messages={[]}
              onSendMessage={handleChatMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Filter Menu */}
      <FilterMenu onFilterChange={handleFilterChange} onOpenChange={setIsFilterMenuOpen} />

      {/* Favorites Button */}
      {!isFilterMenuOpen && (
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className="fixed top-24 left-6 w-14 h-14 bg-white border border-[#8b959e]/40 rounded-xl flex items-center justify-center hover:border-[#8b959e] hover:shadow-md transition-all duration-200 shadow-sm z-50"
          title={showFavorites ? "Hide Favorites" : "View Favorites"}
        >
        <svg 
          className={`w-6 h-6 transition-colors ${favorites.length > 0 ? 'text-[#ff1323] fill-[#ff1323]' : 'text-[#750013]'}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
      )}

    </div>
  );
}