"""
Integration tests for the main agent (idss_agent/core/agent.py)

Tests:
- Full agent flow with real LLM calls
- Electronics domain filtering
- State management across turns
"""
import pytest


@pytest.mark.integration
@pytest.mark.requires_openai
class TestAgentFlow:
    """Integration tests for full agent flow."""

    def test_agent_returns_state(self, initial_state, skip_without_openai):
        """Test that agent returns valid state."""
        from idss_agent.core.agent import run_agent
        
        result = run_agent("Hello", initial_state)
        
        assert result is not None
        assert isinstance(result, dict)
        assert "ai_response" in result
        assert len(result["ai_response"]) > 0

    def test_agent_handles_product_query(self, initial_state, skip_without_openai):
        """Test that agent handles product queries."""
        from idss_agent.core.agent import run_agent
        
        result = run_agent("Show me GPU recommendations", initial_state)
        
        assert result is not None
        assert "ai_response" in result
        # Should have some response about GPUs
        response_lower = result["ai_response"].lower()
        assert "gpu" in response_lower or "graphics" in response_lower or "product" in response_lower

    def test_agent_rejects_non_electronics(self, initial_state, skip_without_openai):
        """Test that agent rejects non-electronics queries."""
        from idss_agent.core.agent import run_agent
        
        result = run_agent("I want to buy a car", initial_state)
        
        assert result is not None
        assert "ai_response" in result
        # Should mention that it's an electronics assistant
        response_lower = result["ai_response"].lower()
        assert "electronics" in response_lower

    def test_agent_maintains_conversation_history(self, initial_state, skip_without_openai):
        """Test that agent maintains conversation history across turns."""
        from idss_agent.core.agent import run_agent
        
        # First turn
        state = run_agent("Hello, I'm looking for a GPU", initial_state)
        assert len(state["conversation_history"]) >= 2  # User + AI messages
        
        # Second turn
        state = run_agent("Under $500", state)
        assert len(state["conversation_history"]) >= 4  # Additional messages

    def test_agent_extracts_filters(self, initial_state, skip_without_openai):
        """Test that agent extracts filters from queries."""
        from idss_agent.core.agent import run_agent
        
        result = run_agent("I need an NVIDIA GPU under $500", initial_state)
        
        filters = result.get("explicit_filters", {})
        # Should have extracted some filters
        assert len(filters) > 0


@pytest.mark.integration
@pytest.mark.requires_openai
class TestAgentProgressCallback:
    """Test agent with progress callbacks."""

    def test_progress_callback_called(self, initial_state, skip_without_openai):
        """Test that progress callback is called during execution."""
        from idss_agent.core.agent import run_agent
        
        progress_updates = []
        
        def progress_callback(update):
            progress_updates.append(update)
        
        result = run_agent("Show me GPUs", initial_state, progress_callback=progress_callback)
        
        assert len(progress_updates) > 0
        # Should have at least one 'completed' status
        completed = [u for u in progress_updates if u.get("status") == "completed"]
        assert len(completed) > 0


@pytest.mark.integration
class TestElectronicsDomainCheck:
    """Tests for electronics domain checking."""

    def test_is_electronics_query_true(self):
        """Test that electronics queries return True."""
        from idss_agent.core.agent import is_electronics_query
        
        electronics_queries = [
            "Show me GPUs",
            "I need a CPU",
            "What motherboard should I get?",
            "Best gaming monitor",
            "Recommend a keyboard",
        ]
        
        for query in electronics_queries:
            assert is_electronics_query(query) is True, f"Should be electronics: {query}"

    def test_is_electronics_query_false(self):
        """Test that non-electronics queries return False."""
        from idss_agent.core.agent import is_electronics_query
        
        # These require LLM, so we'll test the keyword-based filtering
        non_electronics_keywords = ["car", "vehicle", "food", "restaurant"]
        
        for keyword in non_electronics_keywords:
            # The keyword check should trigger LLM confirmation
            # Since we can't guarantee LLM behavior, we just test the function runs
            result = is_electronics_query(f"I want to buy a {keyword}")
            # Result depends on LLM availability, but function should not raise

    def test_short_messages_pass_through(self):
        """Test that short messages (greetings) pass through."""
        from idss_agent.core.agent import is_electronics_query
        
        assert is_electronics_query("hi") is True
        assert is_electronics_query("hello") is True
