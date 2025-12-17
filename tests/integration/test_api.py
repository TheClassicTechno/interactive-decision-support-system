"""
Integration tests for the FastAPI server (api/server.py)

Tests:
- API endpoints
- Session management
- Chat functionality
"""
import pytest


@pytest.mark.integration
class TestAPIEndpoints:
    """Tests for API endpoints."""

    def test_health_check(self, test_client):
        """Test health check endpoint."""
        response = test_client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "service" in data

    def test_chat_endpoint(self, test_client, session_id):
        """Test chat endpoint."""
        response = test_client.post("/chat", json={
            "message": "Hello",
            "session_id": session_id
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data

    def test_session_management(self, test_client, session_id):
        """Test session creation and retrieval."""
        # Create session via chat
        response = test_client.post("/chat", json={
            "message": "Hello",
            "session_id": session_id
        })
        assert response.status_code == 200
        
        # Get session
        response = test_client.get(f"/session/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["session_id"] == session_id

    def test_session_reset(self, test_client, session_id):
        """Test session reset."""
        # Create session
        test_client.post("/chat", json={
            "message": "Hello",
            "session_id": session_id
        })
        
        # Reset session
        response = test_client.post("/session/reset", json={
            "session_id": session_id
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reset"

    def test_invalid_session(self, test_client):
        """Test accessing non-existent session."""
        response = test_client.get("/session/nonexistent-session-id")
        assert response.status_code == 404


@pytest.mark.integration
class TestFiltersEndpoint:
    """Tests for filters endpoint."""

    def test_apply_filters(self, test_client, session_id):
        """Test applying filters directly."""
        # Create session first
        test_client.post("/chat", json={
            "message": "Hello",
            "session_id": session_id
        })
        
        # Apply filters
        response = test_client.post(f"/session/{session_id}/filters", json={
            "filters": {
                "category": "gpu",
                "brand": "NVIDIA"
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["filters"]["category"] == "gpu"
        assert data["filters"]["brand"] == "NVIDIA"

    def test_clear_filters(self, test_client, session_id):
        """Test clearing specific filters."""
        # Create session and set filters
        test_client.post("/chat", json={
            "message": "Hello",
            "session_id": session_id
        })
        test_client.post(f"/session/{session_id}/filters", json={
            "filters": {"category": "gpu", "brand": "NVIDIA"}
        })
        
        # Clear brand filter
        response = test_client.post(f"/session/{session_id}/filters", json={
            "filters": {},
            "clear_keys": ["brand"]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "brand" not in data["filters"]
        assert data["filters"]["category"] == "gpu"


@pytest.mark.integration
class TestEventsEndpoint:
    """Tests for event logging endpoint."""

    def test_log_event(self, test_client, session_id):
        """Test logging an interaction event."""
        # Create session
        test_client.post("/chat", json={
            "message": "Hello",
            "session_id": session_id
        })
        
        # Log event
        response = test_client.post(f"/session/{session_id}/event", json={
            "event_type": "product_view",
            "data": {"product_id": "test-123"}
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "logged"

    def test_get_events(self, test_client, session_id):
        """Test retrieving events."""
        # Create session and log event
        test_client.post("/chat", json={
            "message": "Hello",
            "session_id": session_id
        })
        test_client.post(f"/session/{session_id}/event", json={
            "event_type": "product_view",
            "data": {"product_id": "test-123"}
        })
        
        # Get events
        response = test_client.get(f"/session/{session_id}/events")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
