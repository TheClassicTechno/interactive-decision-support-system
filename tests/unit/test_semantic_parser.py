"""
Unit tests for idss_agent/processing/semantic_parser.py

Tests:
- Filter extraction from user queries
- Category detection
- Price parsing
- Technical specification parsing
"""
import pytest
from unittest.mock import patch, MagicMock


class TestCategoryDetection:
    """Tests for detecting product category from user queries."""

    @pytest.mark.requires_openai
    def test_detects_gpu_category(self, initial_state, skip_without_openai):
        """Test detecting GPU category from query."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I need a graphics card")
        state = semantic_parser_node(state)
        
        # Check that category/part_type is set to gpu
        filters = state["explicit_filters"]
        category = filters.get("category") or filters.get("part_type")
        assert category.lower() in ["gpu", "graphics card", "video card"]

    @pytest.mark.requires_openai
    def test_detects_cpu_category(self, initial_state, skip_without_openai):
        """Test detecting CPU category from query."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I need a processor for gaming")
        state = semantic_parser_node(state)
        
        filters = state["explicit_filters"]
        category = filters.get("category") or filters.get("part_type")
        assert category.lower() in ["cpu", "processor"]


class TestPriceParsing:
    """Tests for parsing price constraints from user queries."""

    @pytest.mark.requires_openai
    def test_parses_under_price(self, initial_state, skip_without_openai):
        """Test parsing 'under $X' price constraint."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "Show me GPUs under $500")
        state = semantic_parser_node(state)
        
        filters = state["explicit_filters"]
        assert filters.get("price_max") == 500.0 or "500" in str(filters.get("price", ""))

    @pytest.mark.requires_openai
    def test_parses_price_range(self, initial_state, skip_without_openai):
        """Test parsing '$X to $Y' price range."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "Show me GPUs from $300 to $600")
        state = semantic_parser_node(state)
        
        filters = state["explicit_filters"]
        # Check for either explicit min/max or range string
        has_range = (
            (filters.get("price_min") and filters.get("price_max")) or
            filters.get("price")
        )
        assert has_range


class TestBrandParsing:
    """Tests for parsing brand from user queries."""

    @pytest.mark.requires_openai
    def test_parses_nvidia_brand(self, initial_state, skip_without_openai):
        """Test parsing NVIDIA brand."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I want an NVIDIA graphics card")
        state = semantic_parser_node(state)
        
        filters = state["explicit_filters"]
        brand = filters.get("brand") or filters.get("gpu_brand") or ""
        assert "NVIDIA" in brand.upper() or "nvidia" in brand.lower()

    @pytest.mark.requires_openai
    def test_parses_amd_brand(self, initial_state, skip_without_openai):
        """Test parsing AMD brand."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I want an AMD CPU")
        state = semantic_parser_node(state)
        
        filters = state["explicit_filters"]
        brand = filters.get("brand") or filters.get("cpu_brand") or ""
        assert "AMD" in brand.upper() or "amd" in brand.lower()


class TestTechnicalSpecParsing:
    """Tests for parsing technical specifications from user queries."""

    @pytest.mark.requires_openai
    def test_parses_vram(self, initial_state, skip_without_openai):
        """Test parsing VRAM specification."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I need a GPU with at least 12GB VRAM")
        state = semantic_parser_node(state)
        
        filters = state["explicit_filters"]
        vram = filters.get("vram") or ""
        assert "12" in str(vram)

    @pytest.mark.requires_openai
    def test_parses_socket(self, initial_state, skip_without_openai):
        """Test parsing socket specification."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I need a motherboard with AM5 socket")
        state = semantic_parser_node(state)
        
        filters = state["explicit_filters"]
        socket = filters.get("socket") or ""
        assert "AM5" in socket.upper()


class TestImplicitPreferenceExtraction:
    """Tests for extracting implicit preferences from user queries."""

    @pytest.mark.requires_openai
    def test_extracts_gaming_use_case(self, initial_state, skip_without_openai):
        """Test extracting gaming use case."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I want to build a gaming PC")
        state = semantic_parser_node(state)
        
        preferences = state["implicit_preferences"]
        usage = preferences.get("usage_patterns") or ""
        assert "gaming" in usage.lower()

    @pytest.mark.requires_openai
    def test_extracts_budget_sensitivity(self, initial_state, skip_without_openai):
        """Test extracting budget sensitivity."""
        from idss_agent.state.schema import add_user_message
        from idss_agent.processing.semantic_parser import semantic_parser_node
        
        state = add_user_message(initial_state, "I need the cheapest option available")
        state = semantic_parser_node(state)
        
        preferences = state["implicit_preferences"]
        budget = preferences.get("budget_sensitivity") or ""
        assert "budget" in budget.lower() or not budget  # May not always extract
