"""
Local electronics data access layer backed by SQLite.

Provides filtered queries against the prebuilt pc_parts.db dataset
and returns results in a standardized format for downstream components.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


import time
import threading
from collections import OrderedDict
from idss_agent.utils.logger import get_logger

logger = get_logger("tools.local_electronics_store")


def _project_root() -> Path:
    """Return project root (parent of idss_agent package)."""
    return Path(__file__).resolve().parent.parent.parent


def _get_db_path() -> Path:
    """Get database path from environment variable or default location."""
    import os
    env_path = os.getenv("PC_PARTS_DB")
    if env_path:
        # If absolute path, use as-is; otherwise resolve relative to project root
        path = Path(env_path)
        if path.is_absolute():
            return path
        return _project_root() / path
    return _project_root() / "data" / "pc_parts.db"


DEFAULT_DB_PATH = _get_db_path()


class ElectronicsStoreError(RuntimeError):
    """Raised when the local electronics store encounters an error."""


def _parse_numeric_range(value: Any) -> Tuple[Optional[float], Optional[float]]:
    """Parse numeric range strings like "100-300" or "200"."""
    if not value:
        return (None, None)
    
    value = str(value).strip()
    if "-" not in value:
        try:
            num = float(value)
            return (num, num)
        except ValueError:
            return (None, None)
    
    lower, upper = value.split("-", 1)
    lower_val = float(lower) if lower.strip() else None
    upper_val = float(upper) if upper.strip() else None
    return (lower_val, upper_val)


    
    
class LocalElectronicsStore:
    # _build_query is implemented at the end of the class (see below)
    def _build_query(
        self,
        query: Optional[str],
        part_type: Optional[str],
        brand: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float],
        seller: Optional[str],
        socket: Optional[str],
        vram: Optional[str],
        capacity: Optional[str],
        wattage: Optional[str],
        form_factor: Optional[str],
        chipset: Optional[str],
        ram_standard: Optional[str],
        storage_type: Optional[str],
        cooling_type: Optional[str],
        certification: Optional[str],
        pcie_version: Optional[str],
        tdp: Optional[str],
        year: Optional[str],
        series: Optional[str],
        limit: int,
        offset: int,
    ) -> Tuple[str, Tuple[Any, ...]]:
        base_cols = [
            "id", "product_id", "slug", "product_type", "series", "model", "brand",
            "size", "color", "year", "price", "seller", "rating", "rating_count",
            "socket", "architecture", "pcie_version", "ram_standard", "tdp",
            "vram", "memory_type", "cooler_type", "variant", "is_oc", "revision",
            "interface", "power_connector", "chipset", "form_factor",
            "wattage", "certification", "modularity", "atx_version", "noise",
            "supports_pcie5_power", "storage", "capacity", "storage_type",
            "cooling_type", "tdp_support", "created_at", "updated_at", "raw_name",
            "imageurl"
        ]
        optional_cols = [
            "performance_tier", "recommended_psu", "target_resolution", "ray_tracing",
            "upscaling_support", "card_length", "slot_thickness",
            "video_encoder", "display_outputs",
            "core_count", "thread_count", "integrated_graphics", "m2_slots", "wifi"
        ]
        select = base_cols.copy()
        for c in optional_cols:
            if self.has_a_column(c):
                select.append(c)
        select_clause = f"SELECT {', '.join(select)} FROM {self._table_name}"
        conditions: List[str] = []
        params: List[Any] = []
        # (All the filtering logic as before...)
        # Query search (searches raw_name, model, series, brand)
        if query:
            conditions.append(
                "(raw_name LIKE ? OR model LIKE ? OR series LIKE ? OR brand LIKE ?)"
            )
            query_pattern = f"%{query}%"
            params.extend([query_pattern] * 4)
        if part_type:
            conditions.append("LOWER(product_type) = LOWER(?)")
            params.append(part_type)
        if brand:
            brand_list = [b.strip() for b in brand.split(",")]
            if len(brand_list) == 1:
                conditions.append("LOWER(brand) = LOWER(?)")
                params.append(brand_list[0])
            else:
                placeholders = ",".join(["?"] * len(brand_list))
                conditions.append(f"LOWER(brand) IN ({placeholders})")
                params.extend([b.lower() for b in brand_list])
        if min_price is not None:
            conditions.append("price >= ?")
            params.append(min_price)
        if max_price is not None:
            conditions.append("price <= ?")
            params.append(max_price)
        if seller:
            seller_list = [s.strip() for s in seller.split(",")]
            if len(seller_list) == 1:
                conditions.append("LOWER(seller) LIKE LOWER(?)")
                params.append(f"%{seller_list[0]}%")
            else:
                seller_conditions = []
                for s in seller_list:
                    seller_conditions.append("LOWER(seller) LIKE LOWER(?)")
                    params.append(f"%{s}%")
                conditions.append(f"({' OR '.join(seller_conditions)})")
        if socket:
            socket_list = [s.strip() for s in socket.split(",")]
            if len(socket_list) == 1:
                conditions.append("LOWER(socket) = LOWER(?)")
                params.append(socket_list[0])
            else:
                placeholders = ",".join(["?"] * len(socket_list))
                conditions.append(f"LOWER(socket) IN ({placeholders})")
                params.extend([s.lower() for s in socket_list])
        if vram:
            if "-" in vram:
                lower, upper = vram.split("-", 1)
                try:
                    conditions.append("CAST(vram AS REAL) >= ? AND CAST(vram AS REAL) <= ?")
                    params.append(float(lower.strip()))
                    params.append(float(upper.strip()))
                except ValueError:
                    pass
            else:
                conditions.append("vram = ?")
                params.append(vram.strip())
        if capacity:
            if "-" in capacity:
                conditions.append("(capacity LIKE ? OR capacity LIKE ?)")
                params.append(f"%{capacity.split('-')[0].strip()}%")
                params.append(f"%{capacity.split('-')[1].strip()}%")
            else:
                conditions.append("capacity LIKE ?")
                params.append(f"%{capacity}%")
        if wattage:
            if "-" in wattage:
                lower, upper = wattage.split("-", 1)
                try:
                    conditions.append("CAST(wattage AS REAL) >= ? AND CAST(wattage AS REAL) <= ?")
                    params.append(float(lower.strip()))
                    params.append(float(upper.strip()))
                except ValueError:
                    pass
            else:
                conditions.append("wattage = ?")
                params.append(wattage.strip())
        if form_factor:
            form_factor_list = [f.strip() for f in form_factor.split(",")]
            if len(form_factor_list) == 1:
                conditions.append("LOWER(form_factor) = LOWER(?)")
                params.append(form_factor_list[0])
            else:
                placeholders = ",".join(["?"] * len(form_factor_list))
                conditions.append(f"LOWER(form_factor) IN ({placeholders})")
                params.extend([f.lower() for f in form_factor_list])
        if chipset:
            chipset_list = [c.strip() for c in chipset.split(",")]
            if len(chipset_list) == 1:
                conditions.append("LOWER(chipset) = LOWER(?)")
                params.append(chipset_list[0])
            else:
                placeholders = ",".join(["?"] * len(chipset_list))
                conditions.append(f"LOWER(chipset) IN ({placeholders})")
                params.extend([c.lower() for c in chipset_list])
        if ram_standard:
            ram_list = [r.strip() for r in ram_standard.split(",")]
            if len(ram_list) == 1:
                conditions.append("LOWER(ram_standard) = LOWER(?)")
                params.append(ram_list[0])
            else:
                placeholders = ",".join(["?"] * len(ram_list))
                conditions.append(f"LOWER(ram_standard) IN ({placeholders})")
                params.extend([r.lower() for r in ram_list])
        if storage_type:
            storage_list = [s.strip() for s in storage_type.split(",")]
            if len(storage_list) == 1:
                conditions.append("LOWER(storage_type) = LOWER(?)")
                params.append(storage_list[0])
            else:
                placeholders = ",".join(["?"] * len(storage_list))
                conditions.append(f"LOWER(storage_type) IN ({placeholders})")
                params.extend([s.lower() for s in storage_list])
        if cooling_type:
            cooling_list = [c.strip() for c in cooling_type.split(",")]
            if len(cooling_list) == 1:
                conditions.append("LOWER(cooling_type) = LOWER(?)")
                params.append(cooling_list[0])
            else:
                placeholders = ",".join(["?"] * len(cooling_list))
                conditions.append(f"LOWER(cooling_type) IN ({placeholders})")
                params.extend([c.lower() for c in cooling_list])
        if certification:
            cert_list = [c.strip() for c in certification.split(",")]
            if len(cert_list) == 1:
                conditions.append("LOWER(certification) LIKE LOWER(?)")
                params.append(f"%{cert_list[0]}%")
            else:
                cert_conditions = []
                for c in cert_list:
                    cert_conditions.append("LOWER(certification) LIKE LOWER(?)")
                    params.append(f"%{c}%")
                conditions.append(f"({' OR '.join(cert_conditions)})")
        if pcie_version:
            pcie_list = [p.strip() for p in pcie_version.split(",")]
            if len(pcie_list) == 1:
                conditions.append("pcie_version = ?")
                params.append(pcie_list[0])
            else:
                placeholders = ",".join(["?"] * len(pcie_list))
                conditions.append(f"pcie_version IN ({placeholders})")
                params.extend(pcie_list)
        if tdp:
            if "-" in tdp:
                lower, upper = tdp.split("-", 1)
                try:
                    conditions.append("CAST(tdp AS REAL) >= ? AND CAST(tdp AS REAL) <= ?")
                    params.append(float(lower.strip()))
                    params.append(float(upper.strip()))
                except ValueError:
                    pass
            else:
                conditions.append("tdp = ?")
                params.append(tdp.strip())
        if year:
            if "-" in year:
                lower, upper = year.split("-", 1)
                try:
                    conditions.append("year >= ? AND year <= ?")
                    params.append(int(lower.strip()))
                    params.append(int(upper.strip()))
                except ValueError:
                    pass
            else:
                try:
                    conditions.append("year = ?")
                    params.append(int(year.strip()))
                except ValueError:
                    pass
        if series:
            series_list = [s.strip() for s in series.split(",")]
            if len(series_list) == 1:
                conditions.append("LOWER(series) LIKE LOWER(?)")
                params.append(f"%{series_list[0]}%")
            else:
                series_conditions = []
                for s in series_list:
                    series_conditions.append("LOWER(series) LIKE LOWER(?)")
                    params.append(f"%{s}%")
                conditions.append(f"({' OR '.join(series_conditions)})")
        where_clause = ""
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
        sql = f"{select_clause}{where_clause} ORDER BY price ASC, rating DESC NULLS LAST LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return sql, tuple(params)
    # adds simple in-memory cache to reduce repeated DB hits for identical queries
    _SEARCH_CACHE = None  # In-memory cache for search queries
    _ID_CACHE = None      # In-memory cache for product-by-id lookups

    def __init__(self, db_path: Optional[Path] = None):
        if LocalElectronicsStore._SEARCH_CACHE is None:
            LocalElectronicsStore._SEARCH_CACHE = _TTLCache(max_entries=256, entry_ttl_seconds=60)
        if LocalElectronicsStore._ID_CACHE is None:
            LocalElectronicsStore._ID_CACHE = _TTLCache(max_entries=1024, entry_ttl_seconds=300)
        path = Path(db_path) if db_path else _get_db_path()
        if not path.exists():
            raise FileNotFoundError(
                f"Local electronics database not found at {path}. "
                "Build it via dataset_builder/fetch_pc_parts_dataset.py."
            )
        self.db_path = path
        self._table_name = self._detect_table_name()

    def _search_cache_key(self, sql: str, params: Tuple[Any, ...]) -> str:
        # Build a unique cache key for a search query, including DB and table identity
        payload = {
            "db": str(self.db_path),
            "table": self._table_name,
            "sql": sql,
            "params": params,
        }
        return json.dumps(payload, sort_keys=True, default=str)

    def _id_cache_key(self, product_id: str) -> str:
        # Build a unique cache key for product-by-id lookups
        payload = {
            "db": str(self.db_path),
            "table": self._table_name,
            "product_id": str(product_id),
        }
        return json.dumps(payload, sort_keys=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _detect_table_name(self) -> str:
        """Detect the correct table name in the database.

        Supports both 'pc_parts' (original) and 'pc_parts_augmented' (augmented) tables.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('pc_parts', 'pc_parts_augmented')")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()

        # Prefer augmented table if it exists (has more attributes)
        if 'pc_parts_augmented' in tables:
            logger.info(f"Using augmented table 'pc_parts_augmented' from {self.db_path}")
            return 'pc_parts_augmented'
        elif 'pc_parts' in tables:
            logger.info(f"Using standard table 'pc_parts' from {self.db_path}")
            return 'pc_parts'
        else:
            raise ElectronicsStoreError(
                f"No valid pc_parts table found in {self.db_path}. "
                f"Expected 'pc_parts' or 'pc_parts_augmented', found: {tables}"
            )

    # juli change
    # check if the table has a column
    def has_a_column(self, col_name: str) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({self._table_name})")
        columns = [row[1] for row in cursor.fetchall()]
        conn.close()
        return col_name in columns

    def _row_to_product(self, row: sqlite3.Row) -> Optional[Dict[str, Any]]:
        """Convert a SQLite row into a product dictionary."""
        try:
            # Helper function to safely get row values (sqlite3.Row doesn't have .get())
            def get_row_value(key: str, default: Any = None) -> Any:
                try:
                    return row[key] if key in row.keys() else default
                except (KeyError, IndexError):
                    return default
            # Build product name from available fields
            raw_name = get_row_value("raw_name")
            model = get_row_value("model")
            brand = get_row_value("brand", "")
            series = get_row_value("series", "")
            product_id = get_row_value("product_id")
            product_name = raw_name or model or f"{brand} {series}".strip()
            if not product_name:
                product_name = f"Product {product_id or 'Unknown'}"
            # Build attributes dict from all technical specs
            attributes = {}
            for attr in [
                "socket", "architecture", "pcie_version", "ram_standard", "tdp",
                "vram", "memory_type", "cooler_type", "variant", "is_oc", "revision",
                "interface", "power_connector", "chipset", "form_factor",
                "wattage", "certification", "modularity", "atx_version", "noise",
                "supports_pcie5_power", "storage", "capacity", "storage_type",
                "cooling_type", "tdp_support", "performance_tier",
                "recommended_psu", "target_resolution", "ray_tracing",
                "upscaling_support", "card_length", "slot_thickness",
                "video_encoder", "display_outputs",
                "core_count", "thread_count", "integrated_graphics",
                "m2_slots", "wifi", "architecture"
            ]:
                value = get_row_value(attr)
                if value is not None:
                    attributes[attr] = value
            # Get image URL
            image_url = get_row_value("imageurl")
            # Get performance tier
            performance_tier = get_row_value("performance_tier")
            # Get common fields
            row_id = get_row_value("id")
            product_type = get_row_value("product_type")
            price = get_row_value("price")
            rating = get_row_value("rating")
            rating_count = get_row_value("rating_count")
            seller = get_row_value("seller")
            year = get_row_value("year")
            # Build normalized product dict
            normalized = {
                "id": str(product_id or row_id or ""),
                "product_id": str(product_id or row_id or ""),
                "title": product_name,
                "name": product_name,
                "product_title": product_name,
                "productName": product_name,
                "brand": brand,
                "model": model,
                "model_number": model,
                "series": series,
                "category": product_type,
                "type": product_type,
                "part_type": product_type,
                "price": float(price) if price is not None else None,
                "sale_price": float(price) if price is not None else None,
                "salePrice": float(price) if price is not None else None,
                "finalPrice": float(price) if price is not None else None,
                "currency": "USD",
                "currencyCode": "USD",
                "rating": float(rating) if rating is not None else None,
                "ratingCount": int(rating_count) if rating_count is not None else None,
                "rating_count": int(rating_count) if rating_count is not None else None,
                "reviews": int(rating_count) if rating_count is not None else None,
                "source": seller,
                "seller": seller,
                "sellerName": seller,
                "store": seller,
                "year": int(year) if year is not None else None,
                "attributes": attributes,
                "specs": attributes,  # Use same dict for compatibility
                "image_url": image_url,
                "imageUrl": image_url,
                "image": image_url,
                "thumbnail": image_url,
                "performance_tier": performance_tier,
                "_source": "local_db",
            }
            # Add all technical attributes to top level for easy access
            for key, value in attributes.items():
                if value is not None:
                    normalized[key] = value
            return normalized
        except Exception as exc:
            logger.warning("Failed to convert row to product: %s", exc)
            import traceback
            logger.debug(traceback.format_exc())
            return None

    def search_products(
        self,
        query: Optional[str] = None,
        part_type: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        seller: Optional[str] = None,
        socket: Optional[str] = None,
        vram: Optional[str] = None,
        capacity: Optional[str] = None,
        wattage: Optional[str] = None,
        form_factor: Optional[str] = None,
        chipset: Optional[str] = None,
        ram_standard: Optional[str] = None,
        storage_type: Optional[str] = None,
        cooling_type: Optional[str] = None,
        certification: Optional[str] = None,
        pcie_version: Optional[str] = None,
        tdp: Optional[str] = None,
        year: Optional[str] = None,
        series: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        sql, params = self._build_query(
            query=query,
            part_type=part_type,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            seller=seller,
            socket=socket,
            vram=vram,
            capacity=capacity,
            wattage=wattage,
            form_factor=form_factor,
            chipset=chipset,
            ram_standard=ram_standard,
            storage_type=storage_type,
            cooling_type=cooling_type,
            certification=certification,
            pcie_version=pcie_version,
            tdp=tdp,
            year=year,
            series=series,
            limit=limit,
            offset=offset,
        )

        # cache lookup/search
        # Check if this query result is already cached (fast path)
        cache_key = self._search_cache_key(sql, params)
        cached = self._SEARCH_CACHE.get(cache_key)
        if cached is not None:
            logger.info("Local electronics cache hit (search)")
            # Return a copy to prevent accidental mutation by callers
            return list(cached)

        # Not cached, run the query and cache the result
        logger.info("Local electronics cache miss (search)")
        logger.info("Electronics search SQL: %s | params=%s", sql, params)

        try:
            with self._connect() as conn:
                rows = conn.execute(sql, params).fetchall()
        except sqlite3.Error as exc:
            raise ElectronicsStoreError(f"SQLite query failed: {exc}") from exc

        products: List[Dict[str, Any]] = []
        for row in rows:
            product = self._row_to_product(row)
            if product:
                products.append(product)

        # cache store/search
        # Store the result in cache for future identical queries
        self._SEARCH_CACHE.set(cache_key, list(products))
        logger.info("Local electronics query returned %d products", len(products))
        return products

    def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        #  CACHE lookup by id
        # Check if this product id is already cached (fast path)
        cache_key = self._id_cache_key(product_id)
        cached = self._ID_CACHE.get(cache_key)
        if cached is not None:
            logger.info("Local electronics cache hit (get_product_by_id)")
            # copy to avoid mutation
            return dict(cached) if cached is not None else None

        # Not cached: run the query and cache the result
        logger.info("Local electronics cache miss (get_product_by_id)")

        sql = f"""
            SELECT id, product_id, slug, product_type, series, model, brand,
                   size, color, year, price, seller, rating, rating_count,
                   socket, architecture, pcie_version, ram_standard, tdp,
                   vram, memory_type, cooler_type, variant, is_oc, revision,
                   interface, power_connector, chipset, form_factor,
                   wattage, certification, modularity, atx_version, noise,
                   supports_pcie5_power, storage, capacity, storage_type,
                   cooling_type, tdp_support, created_at, updated_at, raw_name,
                   imageurl, performance_tier,
                   recommended_psu, target_resolution, ray_tracing,
                   upscaling_support, card_length, slot_thickness,
                   video_encoder, display_outputs,
                   core_count, thread_count, integrated_graphics, m2_slots, wifi
            FROM {self._table_name}
            WHERE product_id = ? OR id = ?
            LIMIT 1
        """

        try:
            with self._connect() as conn:
                row = conn.execute(sql, (product_id, product_id)).fetchone()
                if row:
                    product = self._row_to_product(row)
                    #  cache store by id
                    if product is not None:
                        self._ID_CACHE.set(cache_key, dict(product))
                    return product
        except sqlite3.Error as exc:
            logger.error(f"Failed to fetch product {product_id}: {exc}")

        return None
# In-memory TTL+LRU cache implementation 
#  for search and product-by-id lookups 
# This ensures repeated queries are served efficiently from memory, 
# reducing latency and improving system performance 

# the TTL prevents stale entries and maxsize prevents memory blowups
# this is also thread safe

class _TTLCache:
   

    def __init__(self, max_entries: int = 256, entry_ttl_seconds: int = 60):
        self.max_entries = max_entries  # Maximum number of entries in cache
        self.entry_ttl_seconds = entry_ttl_seconds  # Time-to-live for each entry in seconds
        self._cache_entries: "OrderedDict[str, Tuple[float, Any]]" = OrderedDict()
        self._cache_lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        # Retrieve a value by key if present and not expired, else return None.
        now = time.time()
        with self._cache_lock:
            item = self._cache_entries.get(key)
            if not item:
                return None

            expires_at, value = item
            if expires_at < now:
                # Expired: remove and return None
                self._cache_entries.pop(key, None)
                return None

            # LRU touch: move to end
            self._cache_entries.move_to_end(key)
            return value

    def set(self, key: str, value: Any) -> None:
        # Store a value by key, updating expiry and LRU order, evict oldest if needed
        now = time.time()
        expires_at = now + self.entry_ttl_seconds
        with self._cache_lock:
            if key in self._cache_entries:
                self._cache_entries.move_to_end(key)
            self._cache_entries[key] = (expires_at, value)

            # Evict oldest until within max_entries
            while len(self._cache_entries) > self.max_entries:
                self._cache_entries.popitem(last=False)

    def clear(self) -> None:
        # Remove all entries from the cache
        with self._cache_lock:
            self._cache_entries.clear()
    
    
    def get_product_by_id(
        self,
        product_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single product by its product_id.
        
        Args:
            product_id: Product identifier to look up.
        
        Returns:
            Product dictionary or None if not found.
        """
        sql = f"""
            SELECT id, product_id, slug, product_type, series, model, brand,
                   size, color, year, price, seller, rating, rating_count,
                   socket, architecture, pcie_version, ram_standard, tdp,
                   vram, memory_type, cooler_type, variant, is_oc, revision,
                   interface, power_connector, chipset, form_factor,
                   wattage, certification, modularity, atx_version, noise,
                   supports_pcie5_power, storage, capacity, storage_type,
                   cooling_type, tdp_support, created_at, updated_at, raw_name,
                   imageurl, performance_tier,
                   recommended_psu, target_resolution, ray_tracing,
                   upscaling_support, card_length, slot_thickness,
                   video_encoder, display_outputs,
                   core_count, thread_count, integrated_graphics, m2_slots, wifi
            FROM {self._table_name}
            WHERE product_id = ? OR id = ?
            LIMIT 1
        """
        
        try:
            with self._connect() as conn:
                row = conn.execute(sql, (product_id, product_id)).fetchone()
                if row:
                    return self._row_to_product(row)
        except sqlite3.Error as exc:
            logger.error(f"Failed to fetch product {product_id}: {exc}")
        
        return None
    
    @staticmethod
    def _extract_brand(product_name: Optional[str]) -> Optional[str]:
        """Extract brand from product name (simple heuristic)."""
        if not product_name:
            return None
        
        # Common brand prefixes
        brands = [
            "ASUS", "Dell", "HP", "Lenovo", "Apple", "Samsung", "LG", "Sony",
            "Microsoft", "Intel", "AMD", "NVIDIA", "Corsair", "EVGA",
            "Gigabyte", "MSI", "ASRock", "Seagate", "Western Digital", "WD",
            "Kingston", "Crucial", "G.Skill", "Thermaltake", "Cooler Master",
            "NZXT", "Fractal Design", "be quiet!", "Noctua", "Logitech",
            "Razer", "SteelSeries", "HyperX", "JBL", "Bose", "Sennheiser",
        ]
        
        product_upper = product_name.upper()
        for brand in brands:
            if product_upper.startswith(brand):
                return brand
        
        # Fallback: first word
        return product_name.split()[0] if product_name.split() else None


