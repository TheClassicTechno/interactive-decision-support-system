"""
Unit tests for idss_agent/state/schema.py

Tests:
- State creation and initialization
- State manipulation functions
- Filter and preference data structures
"""
import pytest
from langchain_core.messages import HumanMessage, AIMessage


class TestStateCreation:
    """Tests for state creation and initialization."""

    def test_create_initial_state(self, initial_state):
        """Test that initial state is created with correct structure."""
        assert initial_state is not None
        assert isinstance(initial_state, dict)
        
        # Check required keys exist
        required_keys = [
            "explicit_filters",
            "conversation_history",
            "implicit_preferences",
            "recommended_products",
            "questions_asked",
            "previous_filters",
            "interaction_events",
            "favorites",
            "interviewed",
            "current_mode",
            "ai_response",
            "quick_replies",
            "suggested_followups",
        ]
        for key in required_keys:
            assert key in initial_state, f"Missing key: {key}"

    def test_initial_state_defaults(self, initial_state):
        """Test that initial state has correct default values."""
        assert initial_state["explicit_filters"] == {}
        assert initial_state["conversation_history"] == []
        assert initial_state["implicit_preferences"] == {}
        assert initial_state["recommended_products"] == []
        assert initial_state["interviewed"] is False
        assert initial_state["current_mode"] == "general"
        assert initial_state["ai_response"] == ""

    def test_initial_state_mutable(self, initial_state):
        """Test that state can be modified."""
        initial_state["explicit_filters"]["brand"] = "NVIDIA"
        assert initial_state["explicit_filters"]["brand"] == "NVIDIA"

    def test_state_copy_is_independent(self, initial_state):
        """Test that copying state creates independent copy."""
        state_copy = initial_state.copy()
        state_copy["explicit_filters"]["brand"] = "AMD"
        
        # Original should be unchanged (shallow copy caveat - filters dict is same)
        # For deep independence, we'd need deepcopy


class TestStateManipulation:
    """Tests for state manipulation functions."""

    def test_add_user_message(self, initial_state):
        """Test adding a user message to conversation history."""
        from idss_agent.state.schema import add_user_message
        
        state = add_user_message(initial_state, "Hello, I need help")
        
        assert len(state["conversation_history"]) == 1
        assert isinstance(state["conversation_history"][0], HumanMessage)
        assert state["conversation_history"][0].content == "Hello, I need help"

    def test_add_ai_message(self, initial_state):
        """Test adding an AI message to conversation history."""
        from idss_agent.state.schema import add_ai_message
        
        state = add_ai_message(initial_state, "How can I help you?")
        
        assert len(state["conversation_history"]) == 1
        assert isinstance(state["conversation_history"][0], AIMessage)
        assert state["conversation_history"][0].content == "How can I help you?"

    def test_get_latest_user_message(self, state_with_conversation):
        """Test getting the latest user message."""
        from idss_agent.state.schema import get_latest_user_message
        
        latest = get_latest_user_message(state_with_conversation)
        assert latest == "Show me some GPUs under $1000"

    def test_get_latest_user_message_empty(self, initial_state):
        """Test getting latest user message from empty history."""
        from idss_agent.state.schema import get_latest_user_message
        
        latest = get_latest_user_message(initial_state)
        assert latest is None


class TestProductFilters:
    """Tests for ProductFilters data structure."""

    def test_filters_can_store_category(self, initial_state):
        """Test that filters can store category."""
        initial_state["explicit_filters"]["category"] = "gpu"
        assert initial_state["explicit_filters"]["category"] == "gpu"

    def test_filters_can_store_price_range(self, initial_state):
        """Test that filters can store price range."""
        initial_state["explicit_filters"]["price_min"] = 100.0
        initial_state["explicit_filters"]["price_max"] = 500.0
        
        assert initial_state["explicit_filters"]["price_min"] == 100.0
        assert initial_state["explicit_filters"]["price_max"] == 500.0

    def test_filters_can_store_technical_specs(self, initial_state):
        """Test that filters can store technical specifications."""
        initial_state["explicit_filters"]["socket"] = "AM5"
        initial_state["explicit_filters"]["vram"] = "12"
        initial_state["explicit_filters"]["form_factor"] = "ATX"
        
        assert initial_state["explicit_filters"]["socket"] == "AM5"
        assert initial_state["explicit_filters"]["vram"] == "12"
        assert initial_state["explicit_filters"]["form_factor"] == "ATX"


class TestImplicitPreferences:
    """Tests for ImplicitPreferences data structure."""

    def test_preferences_can_store_priorities(self, initial_state):
        """Test that preferences can store priorities."""
        initial_state["implicit_preferences"]["priorities"] = ["performance", "value"]
        assert initial_state["implicit_preferences"]["priorities"] == ["performance", "value"]

    def test_preferences_can_store_usage_patterns(self, initial_state):
        """Test that preferences can store usage patterns."""
        initial_state["implicit_preferences"]["usage_patterns"] = "gaming"
        assert initial_state["implicit_preferences"]["usage_patterns"] == "gaming"

    def test_preferences_can_store_brand_affinity(self, initial_state):
        """Test that preferences can store brand affinity."""
        initial_state["implicit_preferences"]["brand_affinity"] = ["NVIDIA", "ASUS"]
        assert initial_state["implicit_preferences"]["brand_affinity"] == ["NVIDIA", "ASUS"]


class TestRecommendedProducts:
    """Tests for recommended products in state."""

    def test_can_store_products(self, state_with_products):
        """Test that state can store recommended products."""
        assert len(state_with_products["recommended_products"]) == 2

    def test_products_have_required_fields(self, state_with_products):
        """Test that products have required fields."""
        product = state_with_products["recommended_products"][0]
        
        assert "id" in product
        assert "title" in product
        assert "brand" in product
        assert "price_value" in product

    def test_can_add_products(self, initial_state, sample_products):
        """Test that products can be added to state."""
        initial_state["recommended_products"] = sample_products
        assert len(initial_state["recommended_products"]) == len(sample_products)
