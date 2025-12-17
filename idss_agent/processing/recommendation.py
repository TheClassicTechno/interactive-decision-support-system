"""Knowledge graph and local database-backed electronics recommendation pipeline."""

from __future__ import annotations

import json
import re
from typing import Any, Callable, Dict, List, Optional

from idss_agent.state.schema import ProductSearchState
from idss_agent.tools.local_electronics_store import LocalElectronicsStore
from idss_agent.tools.kg_compatibility import get_compatibility_tool, is_pc_part, PC_PART_TYPES
from idss_agent.utils.config import get_config
from idss_agent.utils.logger import get_logger


logger = get_logger("components.recommendation")


DEFAULT_COUNTRY = "us"


def _build_search_query(filters: Dict[str, Any], implicit: Dict[str, Any]) -> str:
    """Create a keyword query for database search from filters and preferences."""

    keywords: List[str] = []

    for key in [
        "search_query",
        "query",
        "keywords",
        "product",
        "product_name",
        "category",
        "subcategory",
    ]:
        value = filters.get(key)
        if value:
            keywords.append(str(value))

    brand_affinity = implicit.get("brand_affinity")
    if isinstance(brand_affinity, list):
        keywords.extend(brand_affinity)

    if not keywords and implicit.get("priorities"):
        priorities = implicit["priorities"]
        if isinstance(priorities, list):
            keywords.extend(priorities)

    # Remove duplicates while keeping order
    deduped: List[str] = []
    seen: set[str] = set()
    for word in keywords:
        normalized = word.strip()
        if not normalized or normalized.lower() in seen:
            continue
        deduped.append(normalized)
        seen.add(normalized.lower())

    return " ".join(deduped) if deduped else "electronics"


def _extract_price_bounds(filters: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Pull min/max price values from a variety of filter keys."""

    price_range = filters.get("price") or filters.get("price_range")
    min_price = filters.get("price_min") or filters.get("min_price")
    max_price = filters.get("price_max") or filters.get("max_price")

    if isinstance(price_range, str) and "-" in price_range:
        lower, upper = price_range.split("-", 1)
        if not min_price and lower.strip():
            try:
                min_price = float(lower)
            except ValueError:
                min_price = None
        if not max_price and upper.strip():
            try:
                max_price = float(upper)
            except ValueError:
                max_price = None

    def _coerce(value: Any) -> Optional[float]:
        if value in (None, ""):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    return {
        "min_price": _coerce(min_price),
        "max_price": _coerce(max_price),
    }


def _build_search_payload(
    filters: Dict[str, Any], implicit: Dict[str, Any]
) -> Dict[str, Any]:
    """Prepare parameters for the local database search (legacy function, kept for compatibility)."""

    price_bounds = _extract_price_bounds(filters)

    payload: Dict[str, Any] = {
        "query": _build_search_query(filters, implicit),
        "page": int(filters.get("page", 1) or 1),
        "country": filters.get("country") or DEFAULT_COUNTRY,
        "language": filters.get("language"),
        "sort_by": filters.get("sort_by") or filters.get("sort"),
        "min_price": price_bounds["min_price"],
        "max_price": price_bounds["max_price"],
        "seller": filters.get("seller") or filters.get("retailer"),
    }

    return payload


def _parse_product_list(response_text: str) -> List[Dict[str, Any]]:
    """Parse product response text into a list of product dictionaries (legacy function, kept for compatibility)."""

    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError:
        logger.error("Invalid JSON response: %s", response_text[:200])
        return []

    if isinstance(payload, dict):
        if payload.get("error"):
            logger.error("Product search error: %s", payload["error"])
            return []

        for key in ("items", "products", "data", "results"):
            value = payload.get(key)
            if isinstance(value, list):
                return value

        # Some APIs nest under 'response' or 'payload'
        for key in ("response", "payload"):
            nested = payload.get(key)
            if isinstance(nested, dict):
                for sub_key in ("items", "products", "data", "results"):
                    value = nested.get(sub_key)
                    if isinstance(value, list):
                        return value

        return []

    if isinstance(payload, list):
        return payload

    return []


def _normalize_product(product: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert raw product dict into a structure expected by downstream code."""

    product_id = (
        product.get("product_id")
        or product.get("productId")
        or product.get("id")
        or product.get("itemId")
        or product.get("item_number")
    )
    title = (
        product.get("title")
        or product.get("name")
        or product.get("product_title")
        or product.get("productName")
    )

    if not title:
        return None

    brand = product.get("brand") or product.get("manufacturer")
    price = (
        product.get("price")
        or product.get("sale_price")
        or product.get("salePrice")
        or product.get("finalPrice")
    )
    currency = product.get("currency") or product.get("currencyCode") or "USD"
    url = product.get("url") or product.get("productUrl") or product.get("link")
    image_url = (
        product.get("image")
        or product.get("imageUrl")
        or product.get("image_url")
        or product.get("thumbnail")
    )
    availability = (
        product.get("availability")
        or product.get("stock_status")
        or product.get("stockStatus")
    )

    def parse_price_value(value: Any) -> Optional[float]:
        if value in (None, ""):
            return None

        if isinstance(value, (int, float)):
            return float(value)

        if isinstance(value, str):
            # Extract numeric portion from price string (handles $123.45/mo and similar)
            match = re.findall(r"[0-9]+(?:[.,][0-9]+)?", value)
            if match:
                try:
                    return float(match[0].replace(",", ""))
                except ValueError:
                    return None

        return None

    price_value = parse_price_value(price)

    source = (
        product.get("source")
        or product.get("seller")
        or product.get("sellerName")
        or product.get("store")
    )

    normalized = {
        "id": str(product_id or url or title),
        "title": title,
        "brand": brand,
        "source": source,
        "price_text": str(price) if price is not None else None,
        "price_value": price_value,
        "price_currency": currency,
        "link": url,
        "image_url": image_url,
        "rating": product.get("rating"),
        "rating_count": product.get("ratingCount") or product.get("rating_count") or product.get("reviews"),
        "product": {
            "id": product_id,
            "title": title,
            "brand": brand,
            "category": product.get("category") or product.get("type"),
            "attributes": product.get("attributes") or product.get("specs"),
        },
        "offer": {
            "price": price,
            "currency": currency,
            "seller": source,
            "url": url,
            "availability": availability,
        },
        "rating": product.get("rating"),
        "reviewCount": product.get("reviewCount") or product.get("reviews"),
        "photos": {"retail": [{"url": image_url}]} if image_url else None,
        "_source": product.get("_source") or product.get("source") or "local_db",
        "_raw": product,
    }

    if product_id:
        normalized["product"]["identifier"] = product_id

    # Set standard electronics product fields
    product_brand = brand or source or "Unknown"
    product_name = title

    normalized.setdefault("brand", product_brand)
    normalized.setdefault("product_brand", product_brand)
    normalized.setdefault("product_name", product_name)

    if price_value is not None and "price" not in normalized:
        normalized["price"] = price_value

    if image_url and not normalized.get("photos"):
        normalized["photos"] = {"retail": [{"url": image_url}]}

    return normalized


def _normalize_kg_product(product: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert Neo4j product node to normalized format expected by downstream code."""
    
    # Extract basic fields
    product_id = product.get("product_id") or product.get("slug")
    title = product.get("name") or product.get("raw_name") or product.get("slug")
    
    if not title:
        return None
    
    brand = product.get("brand")
    price = product.get("price_avg") or product.get("price") or product.get("price_min")
    seller = product.get("seller")
    
    # Extract image URL from KG product (can be imageurl or image_url)
    image_url = product.get("imageurl") or product.get("image_url") or product.get("imageUrl")
    
    # Build attributes dict from all product properties
    attributes = {}
    for key, value in product.items():
        if key not in ["product_id", "slug", "name", "raw_name", "brand", "price", 
                      "price_avg", "price_min", "price_max", "seller", "rating", 
                      "rating_count", "product_type", "model", "series", "namespace",
                      "imageurl", "image_url", "imageUrl"]:
            if value is not None:
                attributes[key] = value
    
    normalized = {
        "id": str(product_id or product.get("slug") or title),
        "product_id": product_id or product.get("slug"),
        "title": title,
        "brand": brand,
        "source": seller,
        "price_text": f"${price:,.2f}" if price else None,
        "price_value": float(price) if price else None,
        "price_currency": "USD",
        "link": None,  # KG products don't have URLs
        "image_url": image_url,
        "rating": product.get("rating"),
        "rating_count": product.get("rating_count"),
        "product": {
            "id": product_id or product.get("slug"),
            "title": title,
            "brand": brand,
            "category": product.get("product_type"),
            "attributes": attributes,
        },
        "offer": {
            "price": price,
            "currency": "USD",
            "seller": seller,
            "url": None,
            "availability": None,
        },
        "reviewCount": product.get("rating_count"),
        "photos": {"retail": [{"url": image_url}]} if image_url else None,
        "_source": "neo4j_kg",
        "_raw": product,
    }
    
    # Set standard electronics product fields
    product_brand = brand or "Unknown"
    product_name = title
    
    normalized.setdefault("brand", product_brand)
    normalized.setdefault("product_brand", product_brand)
    normalized.setdefault("product_name", product_name)
    
    if price and "price" not in normalized:
        normalized["price"] = float(price)
    
    # Ensure photos are set if image_url exists
    if image_url and not normalized.get("photos"):
        normalized["photos"] = {"retail": [{"url": image_url}]}
    
    return normalized


def _is_professional_product(product: Dict[str, Any]) -> bool:
    """
    Identify professional/workstation/commercial products that should be filtered out
    for personal/consumer use cases.
    
    Returns True if the product is professional/commercial (should be filtered out).
    """
    title = (product.get("title") or product.get("name") or product.get("raw_name") or "").upper()
    brand = (product.get("brand") or "").upper()
    series = (product.get("series") or product.get("product", {}).get("attributes", {}).get("series") or "").upper()
    
    # Professional GPU patterns (workstation/professional GPUs)
    professional_gpu_patterns = [
        "RTX 6000", "RTX 5000", "RTX 4000", "RTX 3000",  # Professional RTX series
        "QUADRO", "TESLA", "A100", "A6000", "A5000", "A4000", "A3000", "A2000",  # NVIDIA professional
        "PRO V620", "PRO V520", "PRO V340",  # AMD professional
        "ADA", "L40", "L20",  # Professional Ada architecture
        "WORKSTATION", "PROFESSIONAL", "ENTERPRISE",
        "SERVER", "DATACENTER",
    ]
    
    # Professional CPU patterns
    professional_cpu_patterns = [
        "XEON", "EPYC", "THREADRIPPER PRO", "WORKSTATION",
        "SERVER", "DATACENTER", "ENTERPRISE",
    ]
    
    # Professional storage patterns
    professional_storage_patterns = [
        "ENTERPRISE", "DATACENTER", "SERVER", "PROFESSIONAL",
        "G-RAID", "PRO-G",  # Professional storage arrays
    ]
    
    # Check GPU patterns
    if any(pattern in title or pattern in series for pattern in professional_gpu_patterns):
        return True
    
    # Check CPU patterns
    if any(pattern in title or pattern in series for pattern in professional_cpu_patterns):
        return True
    
    # Check storage patterns
    if any(pattern in title or pattern in series for pattern in professional_storage_patterns):
        return True
    
    # Check for professional product names containing "PRO" in specific contexts
    if " PRO " in title and any(keyword in title for keyword in ["GPU", "GRAPHICS", "VIDEO", "WORKSTATION"]):
        return True
    
    return False


def _rank_products_for_consumer_use(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank products to prioritize consumer/personal use options.
    Filters out professional products and ranks remaining by price (ascending).
    """
    # Filter out professional products
    consumer_products = [p for p in products if not _is_professional_product(p)]
    
    # If we filtered out all products, keep some professional ones as fallback
    # but prefer consumer products
    if not consumer_products and products:
        logger.warning("All products filtered as professional, keeping some as fallback")
        consumer_products = products[:10]  # Keep top 10 as fallback
    
    # Sort by price (ascending) - prefer affordable consumer options
    def get_price(product: Dict[str, Any]) -> float:
        price = product.get("price_value") or product.get("price")
        if price is None:
            # Try to extract from price_text
            price_text = product.get("price_text", "")
            if price_text:
                match = re.search(r'[\d,]+\.?\d*', price_text.replace(',', ''))
                if match:
                    try:
                        return float(match.group())
                    except ValueError:
                        pass
        try:
            return float(price) if price is not None else float('inf')
        except (TypeError, ValueError):
            return float('inf')
    
    consumer_products.sort(key=get_price)
    
    return consumer_products


def _deduplicate_products(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate products based on product id or URL."""

    seen: Dict[str, Dict[str, Any]] = {}

    for product in products:
        identifier = (
            product.get("product", {}).get("identifier")
            or product.get("product", {}).get("id")
            or product.get("offer", {}).get("url")
        )

        if not identifier:
            identifier = product.get("product", {}).get("title")

        if not identifier:
            continue

        # Prefer lower priced offer when duplicate ids appear
        existing = seen.get(identifier)
        current_price = product.get("offer", {}).get("price")
        existing_price = existing.get("offer", {}).get("price") if existing else None

        def _price_to_float(value: Any) -> float:
            try:
                return float(value)
            except (TypeError, ValueError):
                return float("inf")

        if not existing or _price_to_float(current_price) < _price_to_float(existing_price):
            seen[identifier] = product

    return list(seen.values())


def update_recommendation_list(
    state: ProductSearchState,
    progress_callback: Optional[Callable[[dict], None]] = None,
) -> ProductSearchState:
    """Populate recommendation slots in state with products from knowledge graph (for PC parts) or local database."""

    if progress_callback:
        progress_callback(
            {
            "step_id": "updating_recommendations",
                "description": "Searching for products",
                "status": "in_progress",
            }
        )

    filters = state["explicit_filters"].copy()
    implicit = state["implicit_preferences"].copy()

    # Build search parameters
    search_query = _build_search_query(filters, implicit)
    price_bounds = _extract_price_bounds(filters)
    
    # Extract part_type from category if available
    part_type = filters.get("category") or filters.get("part_type") or filters.get("type")
    if part_type:
        part_type = part_type.lower().strip()
    
    # Extract brand from filters
    brand = filters.get("brand")
    
    # Don't search for generic "electronics" query
    if search_query == "electronics":
        search_query = None

    # Determine if this is a PC part query - use Neo4j if so
    is_pc_part_query = part_type and is_pc_part(part_type)
    
    products = []
    
    if is_pc_part_query:
        # Use Neo4j knowledge graph for PC parts
        logger.info("Using Neo4j knowledge graph for PC parts search: part_type=%s, brand=%s, price_range=%s-%s",
                    part_type, brand, price_bounds["min_price"], price_bounds["max_price"])
        
        try:
            kg_tool = get_compatibility_tool()
            if kg_tool.is_available():
                kg_products = kg_tool.search_products(
                    part_type=part_type,
                    brand=brand,
                    min_price=price_bounds["min_price"],
                    max_price=price_bounds["max_price"],
                    query=search_query,
                    socket=filters.get("socket"),
                    vram=filters.get("vram"),
                    capacity=filters.get("capacity"),
                    wattage=filters.get("wattage"),
                    form_factor=filters.get("form_factor"),
                    chipset=filters.get("chipset"),
                    ram_standard=filters.get("ram_standard"),
                    storage_type=filters.get("storage_type"),
                    cooling_type=filters.get("cooling_type"),
                    certification=filters.get("certification"),
                    pcie_version=filters.get("pcie_version"),
                    tdp=filters.get("tdp"),
                    year=filters.get("year"),
                    series=filters.get("series"),
                    seller=filters.get("seller") or filters.get("retailer"),
                    # GPU-specific filters
                    gpu_brand=filters.get("gpu_brand"),
                    gpu_series=filters.get("gpu_series"),
                    gpu_tdp=filters.get("gpu_tdp"),
                    power_connector=filters.get("power_connector"),
                    recommended_psu=filters.get("recommended_psu"),
                    target_resolution=filters.get("target_resolution"),
                    ray_tracing=filters.get("ray_tracing"),
                    upscaling_support=filters.get("upscaling_support"),
                    gpu_performance_tier=filters.get("gpu_performance_tier"),
                    card_length=filters.get("card_length"),
                    slot_thickness=filters.get("slot_thickness"),
                    video_encoder=filters.get("video_encoder"),
                    display_outputs=filters.get("display_outputs"),
                    # CPU-specific filters
                    cpu_brand=filters.get("cpu_brand"),
                    core_count=filters.get("core_count"),
                    thread_count=filters.get("thread_count"),
                    boost_clock=filters.get("boost_clock"),
                    cache=filters.get("cache"),
                    cpu_performance_tier=filters.get("cpu_performance_tier"),
                    primary_use_case=filters.get("primary_use_case"),
                    cooling_requirement=filters.get("cooling_requirement"),
                    integrated_graphics=filters.get("integrated_graphics"),
                    overclocking_support=filters.get("overclocking_support"),
                    cpu_generation=filters.get("cpu_generation"),
                    # Motherboard-specific filters
                    supported_cpu_gen=filters.get("supported_cpu_gen"),
                    bios_flashback=filters.get("bios_flashback"),
                    dimm_slots=filters.get("dimm_slots"),
                    max_ram_speed=filters.get("max_ram_speed"),
                    m2_slots=filters.get("m2_slots"),
                    sata_ports=filters.get("sata_ports"),
                    usb_c_support=filters.get("usb_c_support"),
                    lan_speed=filters.get("lan_speed"),
                    vrm_tier=filters.get("vrm_tier"),
                    condition=filters.get("condition"),
                    limit=100,
                )
                
                # Convert KG products to normalized format
                for kg_product in kg_products:
                    normalized = _normalize_kg_product(kg_product)
                    if normalized:
                        products.append(normalized)
                
                logger.info("Neo4j search returned %d products", len(products))
            else:
                logger.warning("Neo4j not available, falling back to local database")
                is_pc_part_query = False  # Fall through to SQLite
        except Exception as exc:
            logger.error("Neo4j search failed: %s, falling back to local database", exc)
            is_pc_part_query = False  # Fall through to SQLite
    
    if not is_pc_part_query or not products:
        # Use local database for non-PC parts or as fallback
        logger.info("Using local database search: query=%s, part_type=%s, brand=%s, price_range=%s-%s",
                    search_query, part_type, brand, price_bounds["min_price"], price_bounds["max_price"])

        try:
            store = LocalElectronicsStore()
            db_products = store.search_products(
                query=search_query,
                part_type=part_type,
                brand=brand,
                min_price=price_bounds["min_price"],
                max_price=price_bounds["max_price"],
                seller=filters.get("seller") or filters.get("retailer"),
                # Pass all technical specification filters
                socket=filters.get("socket"),
                vram=filters.get("vram"),
                capacity=filters.get("capacity"),
                wattage=filters.get("wattage"),
                form_factor=filters.get("form_factor"),
                chipset=filters.get("chipset"),
                ram_standard=filters.get("ram_standard"),
                storage_type=filters.get("storage_type"),
                cooling_type=filters.get("cooling_type"),
                certification=filters.get("certification"),
                pcie_version=filters.get("pcie_version"),
                tdp=filters.get("tdp"),
                year=filters.get("year"),
                series=filters.get("series"),
                limit=100,  # Get more candidates for ranking
            )
            
            # Normalize products (they're already in the right format from LocalElectronicsStore)
            for product in db_products:
                normalized = _normalize_product(product)
                if normalized:
                    products.append(normalized)
        except Exception as exc:
            logger.error("Local database search failed: %s", exc)
            state["recommended_products"] = []
            state["search_error"] = str(exc)
            return state

    if not products:
        logger.warning("Search returned no products for filters: %s", filters)

    # Filter and rank products for consumer/personal use
    consumer_ranked_products = _rank_products_for_consumer_use(products)
    
    # Deduplicate after filtering
    deduped_products = _deduplicate_products(consumer_ranked_products)
    config = get_config()
    max_items = config.limits.get("max_recommended_items", 20)

    top_products = deduped_products[:max_items]
    state["recommended_products"] = top_products
    state["fallback_message"] = None
    state["previous_filters"] = filters
    state.pop("suggestion_reasoning", None)
    state.pop("search_error", None)

    logger.info(
        "✓ Recommendation complete: %d products in state",
        len(top_products),
    )

    if progress_callback:
        progress_callback(
            {
            "step_id": "updating_recommendations",
                "description": (
                    f"Found {len(top_products)} products"
                ),
                "status": "completed",
            }
        )

    return state
