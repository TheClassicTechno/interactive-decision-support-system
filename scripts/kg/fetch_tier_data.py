#!/usr/bin/env python3
"""
Fetch GPU/CPU tier classification data from Wikipedia.

This script scrapes Wikipedia pages for GPU and CPU series to extract
performance tier information (entry-level, mid-range, high-end, enthusiast).

Tier data is stored in:
1. Local SQLite database (pc_parts_augmented.db)
2. Neo4j knowledge graph nodes

Wikipedia sources:
- NVIDIA GeForce series pages
- AMD Radeon RX series pages
- Intel Arc series pages
- Intel Core series pages
- AMD Ryzen series pages
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Setup project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
import sys
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv(PROJECT_ROOT / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
LOGGER = logging.getLogger("fetch_tier_data")


# Wikipedia pages for GPU series tiers
GPU_WIKIPEDIA_PAGES = {
    # NVIDIA GeForce RTX 40 Series
    "nvidia_rtx_40": {
        "url": "https://en.wikipedia.org/wiki/GeForce_40_series",
        "brand": "NVIDIA",
        "series_prefix": "RTX 40",
    },
    # NVIDIA GeForce RTX 30 Series
    "nvidia_rtx_30": {
        "url": "https://en.wikipedia.org/wiki/GeForce_30_series",
        "brand": "NVIDIA",
        "series_prefix": "RTX 30",
    },
    # AMD Radeon RX 7000 Series
    "amd_rx_7000": {
        "url": "https://en.wikipedia.org/wiki/Radeon_RX_7000_series",
        "brand": "AMD",
        "series_prefix": "RX 7",
    },
    # AMD Radeon RX 6000 Series
    "amd_rx_6000": {
        "url": "https://en.wikipedia.org/wiki/Radeon_RX_6000_series",
        "brand": "AMD",
        "series_prefix": "RX 6",
    },
    # AMD Radeon RX 5000 Series
    "amd_rx_5000": {
        "url": "https://en.wikipedia.org/wiki/Radeon_RX_5000_series",
        "brand": "AMD",
        "series_prefix": "RX 5",
    },
    # Intel Arc
    "intel_arc": {
        "url": "https://en.wikipedia.org/wiki/Intel_Arc",
        "brand": "Intel",
        "series_prefix": "Arc",
    },
}

# CPU Wikipedia pages
CPU_WIKIPEDIA_PAGES = {
    # Intel Core 14th gen (Raptor Lake Refresh)
    "intel_14th_gen": {
        "url": "https://en.wikipedia.org/wiki/Raptor_Lake",
        "brand": "Intel",
        "series_prefix": "Core i",
    },
    # Intel Core 13th gen (Raptor Lake)
    "intel_13th_gen": {
        "url": "https://en.wikipedia.org/wiki/Raptor_Lake",
        "brand": "Intel",
        "series_prefix": "Core i",
    },
    # AMD Ryzen 7000 Series
    "amd_ryzen_7000": {
        "url": "https://en.wikipedia.org/wiki/Ryzen#Ryzen_7000_series",
        "brand": "AMD",
        "series_prefix": "Ryzen",
    },
    # AMD Ryzen 5000 Series
    "amd_ryzen_5000": {
        "url": "https://en.wikipedia.org/wiki/Ryzen#Ryzen_5000_series",
        "brand": "AMD",
        "series_prefix": "Ryzen",
    },
}

# Common tier keywords found in Wikipedia tables
TIER_KEYWORDS = {
    "entry": ["entry-level", "entry level", "budget", "entry"],
    "mid": ["mid-range", "mid range", "midrange", "mainstream", "mid"],
    "high": ["high-end", "high end", "performance", "high"],
    "enthusiast": ["enthusiast", "flagship", "ultra", "extreme", "halo"],
}


@dataclass
class ProductTierInfo:
    """Tier information for a product."""
    model_name: str  # e.g., "RTX 4060", "RX 7600"
    brand: str  # e.g., "NVIDIA", "AMD"
    tier: str  # "entry", "mid", "high", "enthusiast"
    series: str  # e.g., "RTX 40", "RX 7000"
    year: Optional[int] = None
    source_url: str = ""
    confidence: float = 1.0


def fetch_page(url: str, retries: int = 3) -> Optional[str]:
    """Fetch a Wikipedia page with retries."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; PCPartsBot/1.0; +https://github.com/your-repo)"
    }
    
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            LOGGER.warning("Attempt %d failed for %s: %s", attempt + 1, url, e)
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    
    return None


def classify_tier_from_text(text: str) -> Optional[str]:
    """Classify tier based on text content."""
    text_lower = text.lower()
    
    for tier, keywords in TIER_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return tier
    
    return None


def parse_gpu_tier_table(soup: BeautifulSoup, config: dict) -> List[ProductTierInfo]:
    """
    Parse GPU tier information from Wikipedia tables.
    
    Wikipedia GPU pages typically have tables with headers like:
    - "Entry-level" / "Mid-range" / "High-end" sections
    - Or tables with tier columns
    """
    results: List[ProductTierInfo] = []
    brand = config["brand"]
    series_prefix = config["series_prefix"]
    url = config["url"]
    
    # Strategy 1: Look for section headers that indicate tier
    headers = soup.find_all(["h2", "h3", "h4"])
    
    current_tier = None
    for header in headers:
        header_text = header.get_text(strip=True).lower()
        
        # Check if header indicates a tier
        detected_tier = classify_tier_from_text(header_text)
        if detected_tier:
            current_tier = detected_tier
            LOGGER.debug("Found tier section: %s -> %s", header_text, current_tier)
            
            # Find the next table after this header
            next_elem = header.find_next_sibling()
            while next_elem:
                if next_elem.name == "table":
                    # Extract model names from this table
                    models = extract_models_from_table(next_elem, brand, series_prefix)
                    for model in models:
                        results.append(ProductTierInfo(
                            model_name=model["name"],
                            brand=brand,
                            tier=current_tier,
                            series=model.get("series", series_prefix),
                            year=model.get("year"),
                            source_url=url,
                            confidence=0.9
                        ))
                    break
                elif next_elem.name in ["h2", "h3", "h4"]:
                    break
                next_elem = next_elem.find_next_sibling()
    
    # Strategy 2: Look for tables with "Cards" section (like AMD Wikipedia pages)
    info_boxes = soup.find_all("table", class_="infobox")
    for infobox in info_boxes:
        rows = infobox.find_all("tr")
        current_tier = None
        
        for row in rows:
            header = row.find("th")
            if header:
                header_text = header.get_text(strip=True).lower()
                detected_tier = classify_tier_from_text(header_text)
                if detected_tier:
                    current_tier = detected_tier
            
            # Look for model names in td cells
            if current_tier:
                cells = row.find_all("td")
                for cell in cells:
                    cell_text = cell.get_text(strip=True)
                    # Look for GPU model patterns
                    models = extract_gpu_models_from_text(cell_text, brand)
                    for model in models:
                        results.append(ProductTierInfo(
                            model_name=model,
                            brand=brand,
                            tier=current_tier,
                            series=series_prefix,
                            source_url=url,
                            confidence=0.85
                        ))
    
    # Strategy 3: Parse main content tables with model specs
    tables = soup.find_all("table", class_="wikitable")
    for table in tables:
        # Check table headers for tier column
        headers_row = table.find("tr")
        if headers_row:
            header_cells = headers_row.find_all(["th", "td"])
            header_texts = [h.get_text(strip=True).lower() for h in header_cells]
            
            # Find model name column and tier column indices
            model_col = None
            tier_col = None
            for i, text in enumerate(header_texts):
                if any(kw in text for kw in ["model", "name", "card", "product"]):
                    model_col = i
                if any(kw in text for kw in ["segment", "tier", "class", "category"]):
                    tier_col = i
            
            if model_col is not None:
                for row in table.find_all("tr")[1:]:  # Skip header row
                    cells = row.find_all(["td", "th"])
                    if len(cells) > model_col:
                        model_text = cells[model_col].get_text(strip=True)
                        models = extract_gpu_models_from_text(model_text, brand)
                        
                        # Determine tier
                        tier = None
                        if tier_col is not None and len(cells) > tier_col:
                            tier_text = cells[tier_col].get_text(strip=True)
                            tier = classify_tier_from_text(tier_text)
                        
                        # Fallback: infer tier from model number
                        if not tier and models:
                            tier = infer_tier_from_model(models[0], brand)
                        
                        if tier:
                            for model in models:
                                results.append(ProductTierInfo(
                                    model_name=model,
                                    brand=brand,
                                    tier=tier,
                                    series=series_prefix,
                                    source_url=url,
                                    confidence=0.8
                                ))
    
    return results


def extract_models_from_table(table, brand: str, series_prefix: str) -> List[Dict[str, Any]]:
    """Extract model information from a Wikipedia table."""
    models = []
    
    rows = table.find_all("tr")
    for row in rows:
        cells = row.find_all(["td", "th"])
        if cells:
            first_cell_text = cells[0].get_text(strip=True)
            # Look for GPU model patterns
            model_matches = extract_gpu_models_from_text(first_cell_text, brand)
            for model in model_matches:
                models.append({"name": model, "series": series_prefix})
    
    return models


def extract_gpu_models_from_text(text: str, brand: str) -> List[str]:
    """Extract GPU model names from text."""
    models = []
    
    # NVIDIA patterns
    if brand.upper() == "NVIDIA":
        # RTX patterns: RTX 4090, RTX 4080 SUPER, etc.
        rtx_pattern = r"RTX\s*(\d{4})\s*(Ti|SUPER|S)?"
        for match in re.finditer(rtx_pattern, text, re.IGNORECASE):
            model = f"RTX {match.group(1)}"
            if match.group(2):
                model += f" {match.group(2).upper()}"
            models.append(model)
        
        # GTX patterns: GTX 1660, GTX 1650 SUPER, etc.
        gtx_pattern = r"GTX\s*(\d{4})\s*(Ti|SUPER|S)?"
        for match in re.finditer(gtx_pattern, text, re.IGNORECASE):
            model = f"GTX {match.group(1)}"
            if match.group(2):
                model += f" {match.group(2).upper()}"
            models.append(model)
    
    # AMD patterns
    elif brand.upper() == "AMD":
        # RX patterns: RX 7900 XTX, RX 7600 XT, etc.
        rx_pattern = r"(?:Radeon\s*)?RX\s*(\d{4})\s*(XTX|XT|M)?"
        for match in re.finditer(rx_pattern, text, re.IGNORECASE):
            model = f"RX {match.group(1)}"
            if match.group(2):
                model += f" {match.group(2).upper()}"
            models.append(model)
    
    # Intel patterns
    elif brand.upper() == "INTEL":
        # Arc patterns: Arc A770, Arc A380, etc.
        arc_pattern = r"Arc\s*([AB]\d{3})\s*(M)?"
        for match in re.finditer(arc_pattern, text, re.IGNORECASE):
            model = f"Arc {match.group(1).upper()}"
            if match.group(2):
                model += f" {match.group(2).upper()}"
            models.append(model)
    
    return list(set(models))


def infer_tier_from_model(model: str, brand: str) -> Optional[str]:
    """Infer tier from model number using heuristics."""
    model_upper = model.upper()
    
    if brand.upper() == "NVIDIA":
        # RTX 40 series
        if "4090" in model_upper:
            return "enthusiast"
        if "4080" in model_upper:
            return "enthusiast" if "SUPER" not in model_upper else "high"
        if "4070" in model_upper:
            if "TI" in model_upper or "SUPER" in model_upper:
                return "high"
            return "mid"
        if "4060" in model_upper:
            if "TI" in model_upper:
                return "mid"
            return "entry"
        
        # RTX 30 series
        if "3090" in model_upper or "3080" in model_upper:
            return "enthusiast"
        if "3070" in model_upper:
            return "high"
        if "3060" in model_upper:
            return "mid" if "TI" in model_upper else "entry"
        
        # GTX 16 series
        if "1660" in model_upper:
            return "entry" if "SUPER" not in model_upper else "mid"
        if "1650" in model_upper:
            return "entry"
    
    elif brand.upper() == "AMD":
        # RX 7000 series
        if "7900" in model_upper:
            return "enthusiast"
        if "7800" in model_upper:
            return "high"
        if "7700" in model_upper:
            return "mid"
        if "7600" in model_upper:
            return "entry" if "XT" not in model_upper else "mid"
        
        # RX 6000 series
        if "6900" in model_upper or "6950" in model_upper:
            return "enthusiast"
        if "6800" in model_upper:
            return "high"
        if "6700" in model_upper:
            return "mid"
        if "6600" in model_upper or "6500" in model_upper or "6400" in model_upper:
            return "entry"
        
        # RX 5000 series
        if "5700" in model_upper:
            return "high"
        if "5600" in model_upper:
            return "mid"
        if "5500" in model_upper or "5300" in model_upper:
            return "entry"
    
    elif brand.upper() == "INTEL":
        # Arc series
        if "A770" in model_upper or "A750" in model_upper:
            return "high"
        if "A580" in model_upper:
            return "mid"
        if "A380" in model_upper or "A310" in model_upper:
            return "entry"
    
    return None


def fetch_all_gpu_tiers() -> List[ProductTierInfo]:
    """Fetch tier data for all GPU series from Wikipedia."""
    all_tiers: List[ProductTierInfo] = []
    
    for series_name, config in GPU_WIKIPEDIA_PAGES.items():
        LOGGER.info("Fetching tier data for %s from %s", series_name, config["url"])
        
        html = fetch_page(config["url"])
        if not html:
            LOGGER.error("Failed to fetch page for %s", series_name)
            continue
        
        soup = BeautifulSoup(html, "html.parser")
        tiers = parse_gpu_tier_table(soup, config)
        
        LOGGER.info("Found %d tier entries for %s", len(tiers), series_name)
        all_tiers.extend(tiers)
        
        # Be nice to Wikipedia
        time.sleep(1)
    
    # Deduplicate by model name
    seen = set()
    unique_tiers = []
    for tier in all_tiers:
        key = (tier.model_name.upper(), tier.brand.upper())
        if key not in seen:
            seen.add(key)
            unique_tiers.append(tier)
    
    return unique_tiers


def add_hardcoded_tiers() -> List[ProductTierInfo]:
    """
    Add hardcoded tier data for common GPUs.
    This serves as a fallback/supplement to web scraping.
    Based on official specifications and market positioning.
    """
    tiers = []
    
    # NVIDIA RTX 40 Series (based on official positioning)
    nvidia_40_tiers = {
        "RTX 4090": "enthusiast",
        "RTX 4080 SUPER": "enthusiast",
        "RTX 4080": "enthusiast",
        "RTX 4070 TI SUPER": "high",
        "RTX 4070 TI": "high",
        "RTX 4070 SUPER": "high",
        "RTX 4070": "mid",
        "RTX 4060 TI": "mid",
        "RTX 4060": "entry",
    }
    
    for model, tier in nvidia_40_tiers.items():
        tiers.append(ProductTierInfo(
            model_name=model,
            brand="NVIDIA",
            tier=tier,
            series="RTX 40",
            year=2023 if "4060" in model else 2022,
            source_url="hardcoded",
            confidence=1.0
        ))
    
    # NVIDIA RTX 30 Series
    nvidia_30_tiers = {
        "RTX 3090 TI": "enthusiast",
        "RTX 3090": "enthusiast",
        "RTX 3080 TI": "enthusiast",
        "RTX 3080": "enthusiast",
        "RTX 3070 TI": "high",
        "RTX 3070": "high",
        "RTX 3060 TI": "mid",
        "RTX 3060": "entry",
        "RTX 3050": "entry",
    }
    
    for model, tier in nvidia_30_tiers.items():
        tiers.append(ProductTierInfo(
            model_name=model,
            brand="NVIDIA",
            tier=tier,
            series="RTX 30",
            year=2020 if "3080" in model or "3090" in model else 2021,
            source_url="hardcoded",
            confidence=1.0
        ))
    
    # AMD RX 7000 Series
    amd_7000_tiers = {
        "RX 7900 XTX": "enthusiast",
        "RX 7900 XT": "enthusiast",
        "RX 7900 GRE": "high",
        "RX 7800 XT": "high",
        "RX 7700 XT": "mid",
        "RX 7600 XT": "mid",
        "RX 7600": "entry",
    }
    
    for model, tier in amd_7000_tiers.items():
        tiers.append(ProductTierInfo(
            model_name=model,
            brand="AMD",
            tier=tier,
            series="RX 7000",
            year=2023 if "7600" in model or "7700" in model or "7800" in model else 2022,
            source_url="hardcoded",
            confidence=1.0
        ))
    
    # AMD RX 6000 Series
    amd_6000_tiers = {
        "RX 6950 XT": "enthusiast",
        "RX 6900 XT": "enthusiast",
        "RX 6800 XT": "high",
        "RX 6800": "high",
        "RX 6750 XT": "mid",
        "RX 6700 XT": "mid",
        "RX 6700": "mid",
        "RX 6650 XT": "entry",
        "RX 6600 XT": "entry",
        "RX 6600": "entry",
        "RX 6500 XT": "entry",
        "RX 6400": "entry",
    }
    
    for model, tier in amd_6000_tiers.items():
        tiers.append(ProductTierInfo(
            model_name=model,
            brand="AMD",
            tier=tier,
            series="RX 6000",
            year=2022 if "6950" in model or "6750" in model or "6650" in model else 2020,
            source_url="hardcoded",
            confidence=1.0
        ))
    
    # Intel Arc
    intel_arc_tiers = {
        "Arc A770": "high",
        "Arc A750": "high",
        "Arc A580": "mid",
        "Arc A380": "entry",
        "Arc A310": "entry",
    }
    
    for model, tier in intel_arc_tiers.items():
        tiers.append(ProductTierInfo(
            model_name=model,
            brand="Intel",
            tier=tier,
            series="Arc",
            year=2022,
            source_url="hardcoded",
            confidence=1.0
        ))
    
    # NVIDIA RTX 50 Series (2025)
    nvidia_50_tiers = {
        "RTX 5090": "enthusiast",
        "RTX 5080": "enthusiast",
        "RTX 5070 TI": "high",
        "RTX 5070": "mid",
        "RTX 5060 TI": "mid",
        "RTX 5060": "entry",
    }
    
    for model, tier in nvidia_50_tiers.items():
        tiers.append(ProductTierInfo(
            model_name=model,
            brand="NVIDIA",
            tier=tier,
            series="RTX 50",
            year=2025,
            source_url="hardcoded",
            confidence=1.0
        ))
    
    return tiers


def update_sqlite_with_tiers(
    db_path: Path,
    tiers: List[ProductTierInfo],
    dry_run: bool = False
) -> int:
    """
    Update SQLite database with tier information.
    
    Adds a 'performance_tier' column if it doesn't exist and updates products.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if performance_tier column exists, add if not
    cursor.execute("PRAGMA table_info(pc_parts_augmented)")
    columns = {row[1] for row in cursor.fetchall()}
    
    if "performance_tier" not in columns:
        LOGGER.info("Adding 'performance_tier' column to pc_parts_augmented")
        if not dry_run:
            cursor.execute("ALTER TABLE pc_parts_augmented ADD COLUMN performance_tier TEXT")
    
    # Build lookup from tier data
    tier_lookup = {}
    for tier in tiers:
        # Create multiple lookup keys to match different naming conventions
        model = tier.model_name.upper()
        brand = tier.brand.upper()
        
        # Direct model name
        tier_lookup[(brand, model)] = tier.tier
        
        # Without spaces between RTX/RX and number
        compact_model = model.replace(" ", "")
        tier_lookup[(brand, compact_model)] = tier.tier
        
        # With "GEFORCE" prefix for NVIDIA
        if brand == "NVIDIA":
            tier_lookup[(brand, f"GEFORCE {model}")] = tier.tier
        
        # With "RADEON" prefix for AMD
        if brand == "AMD":
            tier_lookup[(brand, f"RADEON {model}")] = tier.tier
    
    # Update products
    cursor.execute("""
        SELECT id, brand, model, series, raw_name, product_type 
        FROM pc_parts_augmented 
        WHERE product_type = 'gpu'
    """)
    
    products = cursor.fetchall()
    updated_count = 0
    
    for product_id, brand, model, series, raw_name, product_type in products:
        brand_upper = (brand or "").upper()
        
        # Try to find tier match
        tier = None
        
        # Try model field
        if model:
            model_upper = model.upper()
            tier = tier_lookup.get((brand_upper, model_upper))
            
            if not tier:
                # Try extracting model from model field
                models = extract_gpu_models_from_text(model_upper, brand_upper)
                for m in models:
                    tier = tier_lookup.get((brand_upper, m.upper()))
                    if tier:
                        break
        
        # Try series field
        if not tier and series:
            series_upper = series.upper()
            tier = tier_lookup.get((brand_upper, series_upper))
            
            if not tier:
                models = extract_gpu_models_from_text(series_upper, brand_upper)
                for m in models:
                    tier = tier_lookup.get((brand_upper, m.upper()))
                    if tier:
                        break
        
        # Try raw_name field
        if not tier and raw_name:
            raw_upper = raw_name.upper()
            models = extract_gpu_models_from_text(raw_upper, brand_upper)
            for m in models:
                tier = tier_lookup.get((brand_upper, m.upper()))
                if tier:
                    break
        
        # Fallback: infer from raw_name
        if not tier and raw_name:
            models = extract_gpu_models_from_text(raw_name, brand_upper)
            for m in models:
                tier = infer_tier_from_model(m, brand_upper)
                if tier:
                    break
        
        if tier:
            if not dry_run:
                cursor.execute(
                    "UPDATE pc_parts_augmented SET performance_tier = ? WHERE id = ?",
                    (tier, product_id)
                )
            updated_count += 1
            LOGGER.debug("Updated product %s with tier: %s", product_id, tier)
    
    if not dry_run:
        conn.commit()
    
    conn.close()
    
    LOGGER.info("Updated %d products with tier information", updated_count)
    return updated_count


def update_neo4j_with_tiers(tiers: List[ProductTierInfo], dry_run: bool = False) -> int:
    """
    Update Neo4j knowledge graph nodes with tier information.
    """
    import os
    
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USER")
    neo4j_password = os.getenv("NEO4J_PASSWORD")
    
    if not all([neo4j_uri, neo4j_user, neo4j_password]):
        LOGGER.warning("Neo4j credentials not configured, skipping Neo4j update")
        return 0
    
    try:
        from neo4j import GraphDatabase
    except ImportError:
        LOGGER.warning("neo4j package not installed, skipping Neo4j update")
        return 0
    
    # Build tier lookup
    tier_lookup = {}
    for tier in tiers:
        model = tier.model_name.upper()
        brand = tier.brand.upper()
        tier_lookup[(brand, model)] = tier.tier
        
        # Add variations
        compact_model = model.replace(" ", "")
        tier_lookup[(brand, compact_model)] = tier.tier
    
    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
    updated_count = 0
    
    try:
        with driver.session() as session:
            # Get all GPU products
            result = session.run("""
                MATCH (p:Product)
                WHERE p.product_type = 'gpu'
                RETURN p.slug as slug, p.brand as brand, p.model as model, 
                       p.series as series, p.raw_name as raw_name
            """)
            
            for record in result:
                slug = record["slug"]
                brand = (record["brand"] or "").upper()
                model = record["model"]
                series = record["series"]
                raw_name = record["raw_name"]
                
                # Find tier
                tier = None
                
                # Try model
                if model:
                    model_upper = model.upper()
                    tier = tier_lookup.get((brand, model_upper))
                    
                    if not tier:
                        models = extract_gpu_models_from_text(model_upper, brand)
                        for m in models:
                            tier = tier_lookup.get((brand, m.upper()))
                            if tier:
                                break
                
                # Try series
                if not tier and series:
                    series_upper = series.upper()
                    models = extract_gpu_models_from_text(series_upper, brand)
                    for m in models:
                        tier = tier_lookup.get((brand, m.upper()))
                        if tier:
                            break
                
                # Try raw_name
                if not tier and raw_name:
                    models = extract_gpu_models_from_text(raw_name, brand)
                    for m in models:
                        tier = tier_lookup.get((brand, m.upper()))
                        if tier:
                            break
                
                # Fallback inference
                if not tier and raw_name:
                    models = extract_gpu_models_from_text(raw_name, brand)
                    for m in models:
                        tier = infer_tier_from_model(m, brand)
                        if tier:
                            break
                
                if tier and not dry_run:
                    session.run("""
                        MATCH (p:Product {slug: $slug})
                        SET p.performance_tier = $tier
                    """, slug=slug, tier=tier)
                    updated_count += 1
                    LOGGER.debug("Updated Neo4j node %s with tier: %s", slug, tier)
    
    except Exception as e:
        LOGGER.error("Failed to update Neo4j: %s", e)
    finally:
        driver.close()
    
    LOGGER.info("Updated %d Neo4j nodes with tier information", updated_count)
    return updated_count


def main():
    parser = argparse.ArgumentParser(description="Fetch GPU/CPU tier data from Wikipedia")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually update databases")
    parser.add_argument("--sqlite-only", action="store_true", help="Only update SQLite, skip Neo4j")
    parser.add_argument("--neo4j-only", action="store_true", help="Only update Neo4j, skip SQLite")
    parser.add_argument("--skip-web", action="store_true", help="Skip web scraping, use only hardcoded data")
    parser.add_argument("--db-path", type=Path, default=PROJECT_ROOT / "data" / "pc_parts_augmented.db",
                        help="Path to SQLite database")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    LOGGER.info("Starting tier data fetch...")
    
    # Collect tier data
    all_tiers: List[ProductTierInfo] = []
    
    # Add hardcoded tiers (always)
    hardcoded = add_hardcoded_tiers()
    LOGGER.info("Added %d hardcoded tier entries", len(hardcoded))
    all_tiers.extend(hardcoded)
    
    # Fetch from Wikipedia if not skipped
    if not args.skip_web:
        try:
            web_tiers = fetch_all_gpu_tiers()
            LOGGER.info("Fetched %d tier entries from Wikipedia", len(web_tiers))
            all_tiers.extend(web_tiers)
        except Exception as e:
            LOGGER.error("Failed to fetch from Wikipedia: %s", e)
    
    # Deduplicate (prefer hardcoded with confidence 1.0)
    tier_dict: Dict[Tuple[str, str], ProductTierInfo] = {}
    for tier in all_tiers:
        key = (tier.brand.upper(), tier.model_name.upper())
        existing = tier_dict.get(key)
        if not existing or tier.confidence > existing.confidence:
            tier_dict[key] = tier
    
    final_tiers = list(tier_dict.values())
    LOGGER.info("Total unique tier entries: %d", len(final_tiers))
    
    # Update databases
    if not args.neo4j_only:
        if args.db_path.exists():
            sqlite_updated = update_sqlite_with_tiers(args.db_path, final_tiers, args.dry_run)
            LOGGER.info("SQLite: %d products updated", sqlite_updated)
        else:
            LOGGER.error("SQLite database not found at %s", args.db_path)
    
    if not args.sqlite_only:
        neo4j_updated = update_neo4j_with_tiers(final_tiers, args.dry_run)
        LOGGER.info("Neo4j: %d products updated", neo4j_updated)
    
    LOGGER.info("Done!")


if __name__ == "__main__":
    main()
