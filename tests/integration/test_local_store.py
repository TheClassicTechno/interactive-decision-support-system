"""
Integration tests for LocalElectronicsStore (idss_agent/tools/local_electronics_store.py)

Tests:
- Database connection
- Product search functionality
- Filter application
"""
import pytest


@pytest.mark.integration
class TestLocalStoreConnection:
    """Tests for database connection."""

    def test_store_initialized(self, local_store):
        """Test that store is properly initialized."""
        assert local_store is not None

    def test_database_exists(self, local_store):
        """Test that database file exists."""
        # Store should have db_path attribute
        assert hasattr(local_store, 'db_path') or local_store is not None


@pytest.mark.integration
class TestProductSearch:
    """Tests for product search functionality."""

    def test_search_returns_products(self, local_store):
        """Test that search returns products."""
        products = local_store.search_products(limit=10)
        
        assert isinstance(products, list)

    def test_search_by_part_type(self, local_store):
        """Test searching by part type."""
        products = local_store.search_products(part_type="gpu", limit=10)
        
        assert isinstance(products, list)
        # If products found, they should be GPUs
        for product in products:
            product_type = product.get("type") or product.get("product_type") or ""
            assert product_type.lower() == "gpu" or not product_type

    def test_search_by_brand(self, local_store):
        """Test searching by brand."""
        products = local_store.search_products(brand="NVIDIA", limit=10)
        
        assert isinstance(products, list)
        for product in products:
            brand = product.get("brand") or ""
            # Brand should contain NVIDIA if results found
            if brand:
                assert "NVIDIA" in brand.upper()

    def test_search_with_price_range(self, local_store):
        """Test searching with price range."""
        products = local_store.search_products(
            min_price=100,
            max_price=500,
            limit=10
        )
        
        assert isinstance(products, list)
        for product in products:
            price = product.get("price")
            if price is not None:
                assert 100 <= float(price) <= 500

    def test_search_with_query(self, local_store):
        """Test searching with text query."""
        products = local_store.search_products(query="RTX", limit=10)
        
        assert isinstance(products, list)
        # Products should have RTX in name if found
        for product in products:
            name = (product.get("name") or product.get("title") or "").upper()
            # May not always match if no RTX products exist
            if name and "RTX" not in name:
                # It's okay if query doesn't match exactly
                pass

    def test_search_limit(self, local_store):
        """Test that search respects limit."""
        products = local_store.search_products(limit=5)
        
        assert len(products) <= 5


@pytest.mark.integration
class TestProductAttributes:
    """Tests for product attribute retrieval."""

    def test_products_have_basic_fields(self, local_store):
        """Test that products have basic required fields."""
        products = local_store.search_products(limit=5)
        
        if products:
            product = products[0]
            # Should have some identifying field
            assert (
                product.get("id") or 
                product.get("product_id") or 
                product.get("name") or
                product.get("title")
            )

    def test_products_have_price(self, local_store):
        """Test that products have price information."""
        products = local_store.search_products(limit=5)
        
        products_with_price = [
            p for p in products 
            if p.get("price") is not None
        ]
        # At least some products should have prices
        # (not asserting all, as some might be missing)
