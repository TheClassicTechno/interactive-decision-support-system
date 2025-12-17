"""
Shared pytest fixtures for all test modules.

This file is automatically loaded by pytest and provides:
- State fixtures (initial state, populated state)
- Database fixtures (test DB connections)
- Mock fixtures (LLM responses, external services)
- Environment fixtures (test API keys, config)
"""
import os
import sys
import pytest
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import MagicMock, patch

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv(project_root / ".env")


# ============================================================================
# State Fixtures
# ============================================================================

@pytest.fixture
def initial_state():
    """Create a fresh initial state for testing."""
    from idss_agent.state.schema import create_initial_state
    return create_initial_state()


@pytest.fixture
def state_with_filters(initial_state):
    """Create state with some explicit filters set."""
    state = initial_state.copy()
    state["explicit_filters"] = {
        "category": "gpu",
        "brand": "NVIDIA",
        "price_max": 1000.0,
    }
    return state


@pytest.fixture
def state_with_products(initial_state):
    """Create state with recommended products."""
    state = initial_state.copy()
    state["recommended_products"] = [
        {
            "id": "test-gpu-1",
            "title": "NVIDIA GeForce RTX 4070",
            "brand": "NVIDIA",
            "price_value": 599.99,
            "price_text": "$599.99",
            "product": {
                "id": "test-gpu-1",
                "title": "NVIDIA GeForce RTX 4070",
                "brand": "NVIDIA",
                "category": "gpu",
            },
        },
        {
            "id": "test-gpu-2",
            "title": "AMD Radeon RX 7800 XT",
            "brand": "AMD",
            "price_value": 499.99,
            "price_text": "$499.99",
            "product": {
                "id": "test-gpu-2",
                "title": "AMD Radeon RX 7800 XT",
                "brand": "AMD",
                "category": "gpu",
            },
        },
    ]
    return state


@pytest.fixture
def state_with_conversation(state_with_products):
    """Create state with conversation history."""
    from langchain_core.messages import HumanMessage, AIMessage
    
    state = state_with_products.copy()
    state["conversation_history"] = [
        HumanMessage(content="Show me some GPUs under $1000"),
        AIMessage(content="Here are some great GPU options under $1000..."),
    ]
    return state


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture
def local_store():
    """Create a LocalElectronicsStore instance for testing."""
    from idss_agent.tools.local_electronics_store import LocalElectronicsStore
    return LocalElectronicsStore()


@pytest.fixture
def compatibility_tool():
    """Create a compatibility tool instance (may be unavailable if Neo4j not running)."""
    from idss_agent.tools.kg_compatibility import get_compatibility_tool
    return get_compatibility_tool()


# ============================================================================
# Mock Fixtures
# ============================================================================

@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response."""
    def _create_mock(content: str = "Mock response"):
        mock = MagicMock()
        mock.content = content
        return mock
    return _create_mock


@pytest.fixture
def mock_llm():
    """Mock LLM for testing without API calls."""
    with patch("langchain_openai.ChatOpenAI") as mock:
        instance = MagicMock()
        instance.invoke.return_value = MagicMock(content="Mock LLM response")
        mock.return_value = instance
        yield mock


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest.fixture
def sample_products() -> List[Dict[str, Any]]:
    """Sample product data for testing."""
    return [
        {
            "id": "gpu-nvidia-4090",
            "slug": "nvidia-geforce-rtx-4090",
            "title": "NVIDIA GeForce RTX 4090",
            "name": "NVIDIA GeForce RTX 4090",
            "brand": "NVIDIA",
            "price_value": 1599.99,
            "price_text": "$1,599.99",
            "product_type": "gpu",
            "rating": 4.8,
            "vram": "24GB",
            "product": {
                "id": "gpu-nvidia-4090",
                "title": "NVIDIA GeForce RTX 4090",
                "brand": "NVIDIA",
                "category": "gpu",
                "attributes": {"vram": "24GB", "tdp": "450W"},
            },
        },
        {
            "id": "cpu-amd-7800x3d",
            "slug": "amd-ryzen-7-7800x3d",
            "title": "AMD Ryzen 7 7800X3D",
            "name": "AMD Ryzen 7 7800X3D",
            "brand": "AMD",
            "price_value": 449.99,
            "price_text": "$449.99",
            "product_type": "cpu",
            "rating": 4.9,
            "product": {
                "id": "cpu-amd-7800x3d",
                "title": "AMD Ryzen 7 7800X3D",
                "brand": "AMD",
                "category": "cpu",
                "attributes": {"socket": "AM5", "cores": "8", "threads": "16"},
            },
        },
        {
            "id": "mb-asus-x670",
            "slug": "asus-rog-crosshair-x670e-hero",
            "title": "ASUS ROG Crosshair X670E Hero",
            "name": "ASUS ROG Crosshair X670E Hero",
            "brand": "ASUS",
            "price_value": 699.99,
            "price_text": "$699.99",
            "product_type": "motherboard",
            "rating": 4.7,
            "product": {
                "id": "mb-asus-x670",
                "title": "ASUS ROG Crosshair X670E Hero",
                "brand": "ASUS",
                "category": "motherboard",
                "attributes": {"socket": "AM5", "chipset": "X670E", "form_factor": "ATX"},
            },
        },
    ]


@pytest.fixture
def sample_query_list() -> List[Dict[str, str]]:
    """Sample queries for testing with expected categories."""
    return [
        {"query": "Show me GPU recommendations", "expected_category": "gpu"},
        {"query": "I need a CPU for gaming", "expected_category": "cpu"},
        {"query": "What motherboards work with Ryzen 7000?", "expected_category": "motherboard"},
        {"query": "Best budget graphics card under $300", "expected_category": "gpu"},
        {"query": "Compare RTX 4070 vs RX 7800 XT", "expected_type": "comparison"},
    ]


# ============================================================================
# Environment Fixtures
# ============================================================================

@pytest.fixture
def has_openai_key() -> bool:
    """Check if OpenAI API key is available."""
    return bool(os.getenv("OPENAI_API_KEY"))


@pytest.fixture
def has_neo4j() -> bool:
    """Check if Neo4j is available."""
    from idss_agent.tools.kg_compatibility import get_compatibility_tool
    tool = get_compatibility_tool()
    return tool.is_available()


@pytest.fixture
def skip_without_openai(has_openai_key):
    """Skip test if OpenAI API key is not available."""
    if not has_openai_key:
        pytest.skip("OpenAI API key not available")


@pytest.fixture
def skip_without_neo4j(has_neo4j):
    """Skip test if Neo4j is not available."""
    if not has_neo4j:
        pytest.skip("Neo4j not available")


# ============================================================================
# API Test Fixtures
# ============================================================================

@pytest.fixture
def test_client():
    """Create FastAPI test client."""
    from fastapi.testclient import TestClient
    from api.server import app
    return TestClient(app)


@pytest.fixture
def session_id():
    """Generate a unique session ID for testing."""
    import uuid
    return str(uuid.uuid4())
