"""
State schema for the product search agent.
"""
from typing import TypedDict, Optional, List, Dict, Any, Annotated, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from datetime import datetime


class ProductFilters(TypedDict, total=False):
    """
    Explicit product search filters extracted from user input.
    For electronics products (PC components - GPU, CPU, Motherboard).
    
    NOTE: All filtering uses STRUCTURED filters that map directly to database columns.
    Do NOT use natural language text search - use specific filter fields instead.
    """
    # Product specification filters
    brand: Optional[str]  # e.g., "AMD" or "Intel,ASUS" (comma-separated for multiple)
    year: Optional[str]  # e.g., "2022" or "2022-2024" (range format for release year)
    category: Optional[str]  # e.g., "CPU" or "GPU,Laptop" (product category/type)
    part_type: Optional[str]  # e.g., "cpu", "gpu", "motherboard" (specific part type, lowercase)
    series: Optional[str]  # Specific model/series e.g., "RTX 4070 Ti", "Ryzen 7 7800X3D"
    
    # Product attributes
    features: Optional[List[str]]  # e.g., ["Wi-Fi 6E", "PCIe Gen4", "RGB lighting"]
    
    # Common features (frequently searched)
    rgb_lighting: Optional[bool]  # RGB/RGB lighting support
    wifi: Optional[bool]  # Wi-Fi/Wireless support
    bluetooth: Optional[bool]  # Bluetooth support
    modular: Optional[bool]  # Modular design (PSU, cables)
    fanless: Optional[bool]  # Fanless/passive cooling
    overclockable: Optional[bool]  # Overclocking support
    backlit: Optional[bool]  # Backlit/LED keys (keyboards)
    silent: Optional[bool]  # Silent/quiet operation
    low_profile: Optional[bool]  # Low profile design
    wireless: Optional[bool]  # Wireless connectivity
    
    # Common technical specifications (for PC components)
    socket: Optional[str]  # e.g., "AM5", "LGA 1700" (CPU/motherboard socket)
    vram: Optional[str]  # e.g., "12", "16" (GPU video RAM in GB)
    capacity: Optional[str]  # e.g., "1TB", "32GB" (storage/RAM capacity)
    wattage: Optional[str]  # e.g., "850", "1000" (PSU wattage)
    form_factor: Optional[str]  # e.g., "ATX", "Micro-ATX", "Mini-ITX" (motherboard/case)
    chipset: Optional[str]  # e.g., "Z790", "B650", "X570" (motherboard chipset)
    ram_standard: Optional[str]  # e.g., "DDR5", "DDR4" (RAM standard)
    storage_type: Optional[str]  # e.g., "NVMe", "SSD", "HDD" (storage type)
    cooling_type: Optional[str]  # e.g., "air", "liquid", "AIO" (cooling type)
    certification: Optional[str]  # e.g., "80+ Gold", "80+ Platinum" (PSU efficiency)
    pcie_version: Optional[str]  # e.g., "5.0", "4.0" (PCIe version)
    tdp: Optional[str]  # e.g., "125", "250" (thermal design power in watts)
    
    # GPU-specific filters
    gpu_brand: Optional[str]  # e.g., "NVIDIA", "AMD", "Intel" (GPU manufacturer)
    gpu_series: Optional[str]  # e.g., "RTX 4090", "RX 7900" (GPU model series)
    gpu_tdp: Optional[str]  # e.g., "Under 150W", "250-300W" (GPU power draw)
    power_connector: Optional[str]  # e.g., "8-pin", "16-pin (12VHPWR)" (power connector type)
    recommended_psu: Optional[str]  # e.g., "750W", "850W" (recommended PSU wattage)
    target_resolution: Optional[str]  # e.g., "1080p", "1440p", "4K" (target gaming resolution)
    ray_tracing: Optional[bool]  # Ray tracing support
    upscaling_support: Optional[str]  # e.g., "DLSS", "FSR", "XeSS" (upscaling technology)
    gpu_performance_tier: Optional[str]  # e.g., "Entry", "Mid-Range", "High-End", "Enthusiast"
    card_length: Optional[str]  # e.g., "Under 250mm", "300-350mm" (GPU card length)
    slot_thickness: Optional[str]  # e.g., "2-slot", "3-slot" (PCIe slot thickness)
    video_encoder: Optional[str]  # e.g., "NVENC", "AV1", "AMF" (hardware video encoder)
    display_outputs: Optional[str]  # e.g., "HDMI 2.1", "DisplayPort 2.0" (display outputs)
    
    # CPU-specific filters
    cpu_brand: Optional[str]  # e.g., "Intel", "AMD" (CPU manufacturer)
    core_count: Optional[str]  # e.g., "8", "16" (number of CPU cores)
    thread_count: Optional[str]  # e.g., "16", "32" (number of CPU threads)
    boost_clock: Optional[str]  # e.g., "5.0GHz", "5.5GHz+" (max boost clock)
    cache: Optional[str]  # e.g., "32MB", "64MB" (L3 cache size)
    cpu_performance_tier: Optional[str]  # e.g., "Budget", "Mid-Range", "High-End"
    primary_use_case: Optional[str]  # e.g., "Gaming", "Productivity", "Mixed Use"
    cooling_requirement: Optional[str]  # e.g., "Stock Cooler", "AIO/Custom Loop"
    integrated_graphics: Optional[bool]  # Integrated graphics support
    overclocking_support: Optional[bool]  # Overclocking support
    cpu_generation: Optional[str]  # e.g., "13th Gen Intel", "Ryzen 7000"
    
    # Motherboard-specific filters
    supported_cpu_gen: Optional[str]  # e.g., "12th-14th Gen Intel" (supported CPU generations)
    bios_flashback: Optional[bool]  # BIOS flashback support
    dimm_slots: Optional[str]  # e.g., "2", "4" (number of DIMM slots)
    max_ram_speed: Optional[str]  # e.g., "DDR5-6000", "DDR4-3600" (max supported RAM speed)
    m2_slots: Optional[str]  # e.g., "2", "4" (number of M.2 slots)
    sata_ports: Optional[str]  # e.g., "4", "8" (number of SATA ports)
    usb_c_support: Optional[bool]  # USB-C support
    lan_speed: Optional[str]  # e.g., "1G", "2.5G", "10G" (LAN speed)
    vrm_tier: Optional[str]  # e.g., "Entry", "Mid-Range", "High-End" (VRM quality tier)
    
    # Retail listing filters
    price: Optional[str]  # e.g., "100-500" (range format)
    price_min: Optional[float]  # Minimum price
    price_max: Optional[float]  # Maximum price
    seller: Optional[str]  # e.g., "Best Buy" or "Amazon,Newegg" (preferred retailers)
    condition: Optional[str]  # e.g., "new", "used" (product condition)
    
    # Search query
    query: Optional[str]  # Free-form search query
    keywords: Optional[str]  # Search keywords
    product_name: Optional[str]  # Specific product name


class ImplicitPreferences(TypedDict, total=False):
    """Implicit user preferences inferred from conversation."""
    priorities: Optional[List[str]]  # e.g., ["fuel_efficiency", "safety", "reliability", "luxury"]
    lifestyle: Optional[str]  # e.g., "family-oriented", "outdoorsy", "urban commuter", "performance enthusiast"
    budget_sensitivity: Optional[str]  # e.g., "budget-conscious", "moderate", "luxury-focused"
    brand_affinity: Optional[List[str]]  # Brands user seems to prefer based on conversation
    concerns: Optional[List[str]]  # e.g., ["maintenance costs", "resale value", "insurance costs", "reliability"]
    usage_patterns: Optional[str]  # e.g., "daily commuter", "weekend trips", "family road trips"
    notes: Optional[str]  # Any other inferred information


# Pydantic versions for LLM structured output (mirror TypedDict structure)

class ProductFiltersPydantic(BaseModel):
    """Pydantic version of ProductFilters for LLM structured output."""
    
    # Product specification filters
    brand: Optional[str] = Field(None, description="e.g., 'AMD' or 'Intel,ASUS' (comma-separated for multiple brands)")
    year: Optional[str] = Field(None, description="e.g., '2022' or '2022-2024' (range format for release year)")
    category: Optional[str] = Field(None, description="e.g., 'CPU' or 'GPU,Laptop' (product category/type)")
    part_type: Optional[str] = Field(None, description="e.g., 'cpu', 'gpu', 'motherboard' (specific part type, lowercase)")
    series: Optional[str] = Field(None, description="Specific product model/series for targeted searches. e.g., 'RTX 4070 Ti', 'Ryzen 7 7800X3D', 'Core i7-14700K'")
    
    # Product attributes
    features: Optional[List[str]] = Field(None, description="e.g., ['Wi-Fi 6E', 'PCIe Gen4', 'RGB lighting']")
    
    # Common features (frequently searched)
    rgb_lighting: Optional[bool] = Field(None, description="RGB/RGB lighting support")
    wifi: Optional[bool] = Field(None, description="Wi-Fi/Wireless support")
    bluetooth: Optional[bool] = Field(None, description="Bluetooth support")
    modular: Optional[bool] = Field(None, description="Modular design (PSU, cables)")
    fanless: Optional[bool] = Field(None, description="Fanless/passive cooling")
    overclockable: Optional[bool] = Field(None, description="Overclocking support")
    backlit: Optional[bool] = Field(None, description="Backlit/LED keys (keyboards)")
    silent: Optional[bool] = Field(None, description="Silent/quiet operation")
    low_profile: Optional[bool] = Field(None, description="Low profile design")
    wireless: Optional[bool] = Field(None, description="Wireless connectivity")
    
    # Common technical specifications (for PC components)
    socket: Optional[str] = Field(None, description="e.g., 'AM5', 'LGA 1700' (CPU/motherboard socket)")
    vram: Optional[str] = Field(None, description="e.g., '12', '16' (GPU video RAM in GB)")
    capacity: Optional[str] = Field(None, description="e.g., '1TB', '32GB' (storage/RAM capacity)")
    wattage: Optional[str] = Field(None, description="e.g., '850', '1000' (PSU wattage)")
    form_factor: Optional[str] = Field(None, description="e.g., 'ATX', 'Micro-ATX', 'Mini-ITX' (motherboard/case)")
    chipset: Optional[str] = Field(None, description="e.g., 'Z790', 'B650', 'X570' (motherboard chipset)")
    ram_standard: Optional[str] = Field(None, description="e.g., 'DDR5', 'DDR4' (RAM standard)")
    storage_type: Optional[str] = Field(None, description="e.g., 'NVMe', 'SSD', 'HDD' (storage type)")
    cooling_type: Optional[str] = Field(None, description="e.g., 'air', 'liquid', 'AIO' (cooling type)")
    certification: Optional[str] = Field(None, description="e.g., '80+ Gold', '80+ Platinum' (PSU efficiency)")
    pcie_version: Optional[str] = Field(None, description="e.g., '5.0', '4.0' (PCIe version)")
    tdp: Optional[str] = Field(None, description="e.g., '125', '250' (thermal design power in watts)")
    
    # GPU-specific filters
    gpu_brand: Optional[str] = Field(None, description="e.g., 'NVIDIA', 'AMD', 'Intel' (GPU manufacturer)")
    gpu_series: Optional[str] = Field(None, description="e.g., 'RTX 4090', 'RX 7900' (GPU model series)")
    gpu_tdp: Optional[str] = Field(None, description="e.g., 'Under 150W', '250-300W' (GPU power draw)")
    power_connector: Optional[str] = Field(None, description="e.g., '8-pin', '16-pin (12VHPWR)' (power connector type)")
    recommended_psu: Optional[str] = Field(None, description="e.g., '750W', '850W' (recommended PSU wattage)")
    target_resolution: Optional[str] = Field(None, description="e.g., '1080p', '1440p', '4K' (target gaming resolution)")
    ray_tracing: Optional[bool] = Field(None, description="Ray tracing support")
    upscaling_support: Optional[str] = Field(None, description="e.g., 'DLSS', 'FSR', 'XeSS' (upscaling technology)")
    gpu_performance_tier: Optional[str] = Field(None, description="e.g., 'Entry', 'Mid-Range', 'High-End', 'Enthusiast'")
    card_length: Optional[str] = Field(None, description="e.g., 'Under 250mm', '300-350mm' (GPU card length)")
    slot_thickness: Optional[str] = Field(None, description="e.g., '2-slot', '3-slot' (PCIe slot thickness)")
    video_encoder: Optional[str] = Field(None, description="e.g., 'NVENC', 'AV1', 'AMF' (hardware video encoder)")
    display_outputs: Optional[str] = Field(None, description="e.g., 'HDMI 2.1', 'DisplayPort 2.0' (display outputs)")
    
    # CPU-specific filters
    cpu_brand: Optional[str] = Field(None, description="e.g., 'Intel', 'AMD' (CPU manufacturer)")
    core_count: Optional[str] = Field(None, description="e.g., '8', '16' (number of CPU cores)")
    thread_count: Optional[str] = Field(None, description="e.g., '16', '32' (number of CPU threads)")
    boost_clock: Optional[str] = Field(None, description="e.g., '5.0GHz', '5.5GHz+' (max boost clock)")
    cache: Optional[str] = Field(None, description="e.g., '32MB', '64MB' (L3 cache size)")
    cpu_performance_tier: Optional[str] = Field(None, description="e.g., 'Budget', 'Mid-Range', 'High-End'")
    primary_use_case: Optional[str] = Field(None, description="e.g., 'Gaming', 'Productivity', 'Mixed Use'")
    cooling_requirement: Optional[str] = Field(None, description="e.g., 'Stock Cooler', 'AIO/Custom Loop'")
    integrated_graphics: Optional[bool] = Field(None, description="Integrated graphics support")
    overclocking_support: Optional[bool] = Field(None, description="Overclocking support")
    cpu_generation: Optional[str] = Field(None, description="e.g., '13th Gen Intel', 'Ryzen 7000'")
    
    # Motherboard-specific filters
    supported_cpu_gen: Optional[str] = Field(None, description="e.g., '12th-14th Gen Intel' (supported CPU generations)")
    bios_flashback: Optional[bool] = Field(None, description="BIOS flashback support")
    dimm_slots: Optional[str] = Field(None, description="e.g., '2', '4' (number of DIMM slots)")
    max_ram_speed: Optional[str] = Field(None, description="e.g., 'DDR5-6000', 'DDR4-3600' (max supported RAM speed)")
    m2_slots: Optional[str] = Field(None, description="e.g., '2', '4' (number of M.2 slots)")
    sata_ports: Optional[str] = Field(None, description="e.g., '4', '8' (number of SATA ports)")
    usb_c_support: Optional[bool] = Field(None, description="USB-C support")
    lan_speed: Optional[str] = Field(None, description="e.g., '1G', '2.5G', '10G' (LAN speed)")
    vrm_tier: Optional[str] = Field(None, description="e.g., 'Entry', 'Mid-Range', 'High-End' (VRM quality tier)")
    
    # Retail listing filters
    price: Optional[str] = Field(None, description="e.g., '100-500' (range format)")
    price_min: Optional[float] = Field(None, description="Minimum price")
    price_max: Optional[float] = Field(None, description="Maximum price")
    seller: Optional[str] = Field(None, description="e.g., 'Best Buy' or 'Amazon,Newegg' (preferred retailers)")
    condition: Optional[str] = Field(None, description="e.g., 'new', 'used' (product condition)")
    
    # Search query
    query: Optional[str] = Field(None, description="Free-form search query")
    keywords: Optional[str] = Field(None, description="Search keywords")
    product_name: Optional[str] = Field(None, description="Specific product name")


class ImplicitPreferencesPydantic(BaseModel):
    """Pydantic version of ImplicitPreferences for LLM structured output."""
    priorities: Optional[List[str]] = Field(
        None,
        description=(
            "User's top priorities inferred from phrases like 'safe', 'reliable', 'fuel efficient', 'luxurious', 'spacious'. "
            "Extract from: 'safe product' → ['safety'], 'reliable product' → ['reliability'], 'good performance' → ['performance']. "
            "Common values: 'safety', 'reliability', 'fuel_efficiency', 'luxury', 'performance', 'space', 'technology'"
        )
    )
    lifestyle: Optional[str] = Field(
        None,
        description=(
            "User's lifestyle inferred from context clues like 'family', 'kids', 'outdoor adventures', 'city driving', 'commute'. "
            "Extract from: 'have kids' → 'family-oriented', 'weekend camping' → 'outdoorsy', 'drive to work daily' → 'urban commuter'. "
            "Common values: 'family-oriented', 'outdoorsy', 'urban commuter', 'performance enthusiast', 'business professional'"
        )
    )
    budget_sensitivity: Optional[str] = Field(
        None,
        description=(
            "User's budget consciousness inferred from price mentions and financial language. "
            "Extract from: 'cheapest option' → 'budget-conscious', 'reasonable price' → 'moderate', 'money is not an issue' → 'luxury-focused'. "
            "Common values: 'budget-conscious', 'moderate', 'luxury-focused'"
        )
    )
    brand_affinity: Optional[List[str]] = Field(
        None,
        description=(
            "Brands the user shows preference for through positive mentions or repeated references. "
            "Extract from: 'I love Toyota' → ['Toyota'], 'always driven Honda and Mazda' → ['Honda', 'Mazda']"
        )
    )
    concerns: Optional[List[str]] = Field(
        None,
        description=(
            "User's worries or negative priorities inferred from phrases like 'expensive to maintain', 'high insurance', 'bad resale'. "
            "Extract from: 'low maintenance' → ['maintenance costs'], 'cheap to fix' → ['repair costs'], 'holds value' → ['resale value']. "
            "Common values: 'maintenance costs', 'repair costs', 'insurance costs', 'resale value', 'reliability issues', 'fuel costs'"
        )
    )
    usage_patterns: Optional[str] = Field(
        None,
        description=(
            "How the user plans to use the product, inferred from purpose statements. "
            "Extract from: 'for gaming' → 'gaming', 'for work' → 'professional', 'for content creation' → 'content creation'. "
            "Common values: 'gaming', 'professional', 'content creation', 'general use', 'high performance', 'budget'"
        )
    )
    notes: Optional[str] = Field(
        None,
        description="Any other contextual information that doesn't fit other fields but seems important for understanding user needs"
    )


class ComparisonTable(BaseModel):
    """
    Structured comparison table for comparing products.

    Used when user asks to compare 2-4 products (e.g., "compare Product A vs Product B").
    """
    headers: List[str] = Field(
        description="Column headers: first is 'Attribute', rest are product names"
    )
    rows: List[List[str]] = Field(
        description=(
            "Each row is a list of values. First value is the attribute name, "
            "rest are values for each product. "
            "Example attributes: 'Price', 'Rating', 'Specifications', etc."
        )
    )


class AgentResponse(BaseModel):
    """
    Unified response schema for agent modes using structured output.

    Used by: interview, discovery, and general modes.
    Analytical mode generates this separately after ReAct agent completes.
    """
    ai_response: str = Field(
        description="The main conversational response to the user (keep concise, 2-4 sentences)",
        max_length=800
    )
    quick_replies: Optional[List[str]] = Field(
        default=None,
        description=(
            "Short answer options (2-5 words each) for direct questions in ai_response. "
            "Provide 2-4 options. Only include if ai_response asks a direct question. "
            "Examples: ['Under $20k', '$20k-$30k'], ['Yes', 'No'], ['Sedan', 'SUV']"
        ),
        max_length=4
    )
    suggested_followups: List[str] = Field(
        description=(
            "Suggested user's potential next queries to help users continue conversation. "
        ),
        min_length=0,
        max_length=5
    )
    comparison_table: Optional[ComparisonTable] = Field(
        default=None,
        description=(
            "Comparison table for when user asks to compare 2-4 products. "
            "Leave null if not a comparison query. "
            "When provided, include key attributes like price, rating, specifications, etc."
        )
    )


class ProductSearchState(TypedDict):
    """
    Complete state for the product search agent.

    This state is updated throughout the conversation and maintains:
    - Explicit filters from user requests
    - Conversation history using LangChain messages (with add_messages reducer)
    - Implicit preferences inferred from dialogue
    - Recommended products (up to 20, updated each turn)
    - Questions asked to avoid repetition
    - AI response for current turn
    - User interaction events for tracking engagement
    - Interview mode tracking and insights
    """
    # Core data
    explicit_filters: ProductFilters
    conversation_history: Annotated[List[BaseMessage], add_messages]
    implicit_preferences: ImplicitPreferences



    # Results (up to MAX_RECOMMENDED_PRODUCTS products, updated each turn)
    recommended_products: List[Dict[str, Any]]

    # Metadata
    questions_asked: List[str]  # Track questions to avoid repetition
    previous_filters: ProductFilters  # Track previous filters to detect changes

    # User interaction tracking
    interaction_events: List[Dict[str, Any]]  # Track user interactions with UI
    favorites: List[Dict[str, Any]]  # List of products favorited by user

    # Interview phase tracking
    interviewed: bool  # False = in interview workflow, True = interview complete
    _interview_should_end: bool  # Internal flag for routing within interview workflow
    _semantic_parsing_done: bool  # Internal flag to skip duplicate semantic parsing in interview workflow

    # Current mode tracking
    current_mode: str  # Current operational mode (supervisor/general)

    # Output
    ai_response: str
    quick_replies: Optional[List[str]]  # Short answer options (1-3 words, 2-4 options) for direct questions
    suggested_followups: List[str]  # Suggested next queries (short phrases, 3-5 options)
    comparison_table: Optional[Dict[str, Any]]  # Comparison table data when user asks to compare products
    compatibility_result: Optional[Dict[str, Any]]  # Compatibility check result (for binary compatibility queries)
    build_pc_result: Optional[Dict[str, Any]]  # PC build configuration result (deprecated - agents should build iteratively)
    _latency: Optional[Dict[str, Any]]  # Latency snapshot for the latest turn
    _latency_stats: Optional[Dict[str, Any]]  # Aggregated latency statistics for the session


def create_initial_state() -> ProductSearchState:
    """Create an empty initial state for the product search agent."""
    return ProductSearchState(
        explicit_filters=ProductFilters(),
        conversation_history=[],
        implicit_preferences=ImplicitPreferences(),
        user_latitude=None,
        user_longitude=None,
        recommended_products=[],
        questions_asked=[],
        previous_filters=ProductFilters(),
        interaction_events=[],
        favorites=[],
        interviewed=False,  # Start in interview workflow
        _interview_should_end=False,
        _semantic_parsing_done=False,  # Semantic parsing not done yet
        current_mode="general",  # Initial mode
        ai_response="",
        quick_replies=None,
        suggested_followups=[],
        comparison_table=None,
        compatibility_result=None,
        build_pc_result=None,
        _latency=None,
        _latency_stats={
            "turn_count": 0,
            "total_turn_ms": 0.0,
            "average_turn_ms": None,
        },
    )


def add_user_message(state: ProductSearchState, content: str) -> ProductSearchState:
    """
    Add a user message to the conversation history.
    """
    state["conversation_history"].append(HumanMessage(content=content))
    return state


def add_ai_message(state: ProductSearchState, content: str) -> ProductSearchState:
    """
    Add an AI message to the conversation history.
    """
    state["conversation_history"].append(AIMessage(content=content))
    return state


def get_latest_user_message(state: ProductSearchState) -> Optional[str]:
    """Get the content of the most recent user message."""
    for message in reversed(state["conversation_history"]):
        if isinstance(message, HumanMessage):
            return message.content
    return None
