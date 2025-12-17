"""
Unit tests for idss_agent/processing/recommendation.py

Tests:
- Search query building
- Price extraction
- Product normalization
- Product filtering and ranking
- Consumer product filtering
"""
import pytest
from unittest.mock import patch, MagicMock


class TestBuildSearchQuery:
    """Tests for _build_search_query function."""

    def test_uses_llm_generated_query_first(self):
        """Test that LLM-generated search_query takes priority."""
        from idss_agent.processing.recommendation import _build_search_query
        
        filters = {"search_query": "RTX 4070 gaming GPU"}
        implicit = {}
        
        result = _build_search_query(filters, implicit)
        assert result == "RTX 4070 gaming GPU"

    def test_uses_explicit_query(self):
        """Test that explicit query is used when search_query not present."""
        from idss_agent.processing.recommendation import _build_search_query
        
        filters = {"query": "gaming graphics card"}
        implicit = {}
        
        result = _build_search_query(filters, implicit)
        assert result == "gaming graphics card"

    def test_uses_keywords(self):
        """Test that keywords are used as fallback."""
        from idss_agent.processing.recommendation import _build_search_query
        
        filters = {"keywords": "NVIDIA RTX"}
        implicit = {}
        
        result = _build_search_query(filters, implicit)
        assert result == "NVIDIA RTX"

    def test_returns_none_with_structured_filters(self):
        """Test that None is returned when structured filters are present."""
        from idss_agent.processing.recommendation import _build_search_query
        
        filters = {"part_type": "gpu", "brand": "NVIDIA"}
        implicit = {}
        
        result = _build_search_query(filters, implicit)
        assert result is None

    def test_builds_from_implicit_preferences(self):
        """Test building query from implicit preferences."""
        from idss_agent.processing.recommendation import _build_search_query
        
        filters = {}
        implicit = {"brand_affinity": ["NVIDIA"], "priorities": ["performance"]}
        
        result = _build_search_query(filters, implicit)
        assert "NVIDIA" in result
        assert "performance" in result


class TestExtractPriceBounds:
    """Tests for _extract_price_bounds function."""

    def test_extracts_min_price(self):
        """Test extracting minimum price."""
        from idss_agent.processing.recommendation import _extract_price_bounds
        
        filters = {"price_min": 100.0}
        result = _extract_price_bounds(filters)
        
        assert result["min_price"] == 100.0
        assert result["max_price"] is None

    def test_extracts_max_price(self):
        """Test extracting maximum price."""
        from idss_agent.processing.recommendation import _extract_price_bounds
        
        filters = {"price_max": 500.0}
        result = _extract_price_bounds(filters)
        
        assert result["min_price"] is None
        assert result["max_price"] == 500.0

    def test_extracts_price_range_string(self):
        """Test extracting price from range string."""
        from idss_agent.processing.recommendation import _extract_price_bounds
        
        filters = {"price": "100-500"}
        result = _extract_price_bounds(filters)
        
        assert result["min_price"] == 100.0
        assert result["max_price"] == 500.0

    def test_handles_none_values(self):
        """Test handling None values gracefully."""
        from idss_agent.processing.recommendation import _extract_price_bounds
        
        filters = {}
        result = _extract_price_bounds(filters)
        
        assert result["min_price"] is None
        assert result["max_price"] is None

    def test_handles_invalid_price(self):
        """Test handling invalid price values."""
        from idss_agent.processing.recommendation import _extract_price_bounds
        
        filters = {"price_min": "not-a-number"}
        result = _extract_price_bounds(filters)
        
        assert result["min_price"] is None


class TestNormalizeProduct:
    """Tests for _normalize_product function."""

    def test_normalizes_basic_product(self):
        """Test normalizing a basic product dict."""
        from idss_agent.processing.recommendation import _normalize_product
        
        product = {
            "id": "test-1",
            "title": "Test GPU",
            "brand": "NVIDIA",
            "price": 599.99,
        }
        
        result = _normalize_product(product)
        
        assert result is not None
        assert result["title"] == "Test GPU"
        assert result["brand"] == "NVIDIA"
        assert result["price_value"] == 599.99

    def test_normalizes_with_alternate_field_names(self):
        """Test normalizing product with alternate field names."""
        from idss_agent.processing.recommendation import _normalize_product
        
        product = {
            "product_id": "test-1",
            "name": "Test GPU",
            "manufacturer": "NVIDIA",
            "salePrice": "$599.99",
        }
        
        result = _normalize_product(product)
        
        assert result is not None
        assert result["title"] == "Test GPU"
        assert result["brand"] == "NVIDIA"

    def test_returns_none_for_product_without_title(self):
        """Test that None is returned for product without title."""
        from idss_agent.processing.recommendation import _normalize_product
        
        product = {"id": "test-1", "price": 599.99}
        
        result = _normalize_product(product)
        assert result is None

    def test_parses_price_string(self):
        """Test parsing price from string."""
        from idss_agent.processing.recommendation import _normalize_product
        
        product = {
            "id": "test-1",
            "title": "Test GPU",
            "price": "$599.99",
        }
        
        result = _normalize_product(product)
        assert result["price_value"] == 599.99


class TestNormalizeKGProduct:
    """Tests for _normalize_kg_product function."""

    def test_normalizes_kg_product(self):
        """Test normalizing a Neo4j knowledge graph product."""
        from idss_agent.processing.recommendation import _normalize_kg_product
        
        product = {
            "slug": "nvidia-rtx-4090",
            "name": "NVIDIA GeForce RTX 4090",
            "brand": "NVIDIA",
            "price_avg": 1599.99,
            "product_type": "gpu",
            "vram": "24GB",
        }
        
        result = _normalize_kg_product(product)
        
        assert result is not None
        assert result["title"] == "NVIDIA GeForce RTX 4090"
        assert result["brand"] == "NVIDIA"
        assert result["price_value"] == 1599.99
        assert result["_source"] == "neo4j_kg"

    def test_kg_product_with_image_url(self):
        """Test KG product with image URL."""
        from idss_agent.processing.recommendation import _normalize_kg_product
        
        product = {
            "slug": "test-gpu",
            "name": "Test GPU",
            "imageurl": "https://example.com/image.jpg",
        }
        
        result = _normalize_kg_product(product)
        
        assert result["image_url"] == "https://example.com/image.jpg"
        assert result["photos"]["retail"][0]["url"] == "https://example.com/image.jpg"


class TestProfessionalProductFilter:
    """Tests for _is_professional_product function."""

    def test_identifies_professional_gpu(self):
        """Test identifying professional/workstation GPUs."""
        from idss_agent.processing.recommendation import _is_professional_product
        
        professional_products = [
            {"title": "NVIDIA RTX 6000 Ada"},
            {"title": "NVIDIA Quadro RTX 8000"},
            {"title": "AMD Radeon PRO V620"},
            {"title": "NVIDIA Tesla A100"},
        ]
        
        for product in professional_products:
            assert _is_professional_product(product) is True, f"Should identify {product['title']} as professional"

    def test_allows_consumer_gpu(self):
        """Test allowing consumer GPUs."""
        from idss_agent.processing.recommendation import _is_professional_product
        
        consumer_products = [
            {"title": "NVIDIA GeForce RTX 4090"},
            {"title": "AMD Radeon RX 7900 XTX"},
            {"title": "NVIDIA GeForce RTX 4070"},
        ]
        
        for product in consumer_products:
            assert _is_professional_product(product) is False, f"Should allow {product['title']} as consumer"


class TestGetPerformanceTier:
    """Tests for _get_performance_tier function."""

    def test_identifies_enthusiast_tier(self):
        """Test identifying enthusiast tier products."""
        from idss_agent.processing.recommendation import _get_performance_tier
        
        product = {"title": "NVIDIA GeForce RTX 4090"}
        assert _get_performance_tier(product) == "enthusiast"

    def test_identifies_high_tier(self):
        """Test identifying high tier products."""
        from idss_agent.processing.recommendation import _get_performance_tier
        
        product = {"title": "NVIDIA GeForce RTX 4070 Ti"}
        assert _get_performance_tier(product) == "high"

    def test_identifies_mid_tier(self):
        """Test identifying mid tier products."""
        from idss_agent.processing.recommendation import _get_performance_tier
        
        product = {"title": "NVIDIA GeForce RTX 4070"}
        assert _get_performance_tier(product) == "mid"

    def test_identifies_entry_tier(self):
        """Test identifying entry tier products."""
        from idss_agent.processing.recommendation import _get_performance_tier
        
        product = {"title": "NVIDIA GeForce RTX 4060"}
        assert _get_performance_tier(product) == "entry"

    def test_uses_explicit_tier_attribute(self):
        """Test using explicit performance_tier attribute."""
        from idss_agent.processing.recommendation import _get_performance_tier
        
        product = {"title": "Some GPU", "performance_tier": "high"}
        assert _get_performance_tier(product) == "high"


class TestDeduplicateProducts:
    """Tests for _deduplicate_products function."""

    def test_removes_duplicates(self):
        """Test removing duplicate products."""
        from idss_agent.processing.recommendation import _deduplicate_products
        
        products = [
            {"id": "1", "product": {"id": "gpu-1"}, "offer": {"price": 500}},
            {"id": "2", "product": {"id": "gpu-1"}, "offer": {"price": 550}},
            {"id": "3", "product": {"id": "gpu-2"}, "offer": {"price": 400}},
        ]
        
        result = _deduplicate_products(products)
        
        # Should keep lower priced duplicate
        assert len(result) == 2
        gpu1 = [p for p in result if p["product"]["id"] == "gpu-1"][0]
        assert gpu1["offer"]["price"] == 500

    def test_handles_empty_list(self):
        """Test handling empty product list."""
        from idss_agent.processing.recommendation import _deduplicate_products
        
        result = _deduplicate_products([])
        assert result == []
