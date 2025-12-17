# IDSS API Documentation

**Version:** 2.0.0  
**Base URL:** `http://localhost:8000`  
**Protocol:** HTTP/REST with Server-Sent Events (SSE) support

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Headers](#base-url--headers)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Chat](#chat)
   - [Chat Stream](#chat-stream)
   - [Session Management](#session-management)
   - [Event Tracking](#event-tracking)
7. [Data Models](#data-models)
8. [Interactive Elements](#interactive-elements)
9. [Code Examples](#code-examples)

---

## Overview

The Interactive Decision Support System (IDSS) API provides conversational AI capabilities for PC components and electronics shopping assistance. The system uses intent-based routing to provide personalized recommendations, answer analytical questions, and guide users through an interview process.

### Key Features

- **Intent-based routing** (buying, browsing, research, general)
- **Conversational interview** for understanding user needs
- **Real-time product recommendations** from Neo4j knowledge graph (PC parts) and SQLite database (other electronics)
- **Compatibility checking** for PC components using knowledge graph relationships
- **Analytical queries** with access to product specifications and compatibility data
- **Interactive elements** (quick replies and suggested follow-ups)
- **Server-Sent Events** for real-time progress updates
- **Session management** for conversation continuity

---

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible on the local network.

> **Note:** For production deployment, implement proper authentication mechanisms (API keys, OAuth, etc.).

---

## Base URL & Headers

### Base URL
```
http://localhost:8000
```

### Recommended Headers
```http
Content-Type: application/json
Accept: application/json
```

For streaming endpoints:
```http
Content-Type: application/json
Accept: text/event-stream
```

---

## Response Format

### Standard JSON Response

All non-streaming endpoints return JSON responses with the following structure:

```json
{
  "response": "string",
  "products": [],
  "filters": {},
  "preferences": {},
  "session_id": "string",
  "interviewed": false,
  "quick_replies": ["string"] | null,
  "suggested_followups": ["string"],
  "comparison_table": {},
  "compatibility_result": {}
}
```

### Server-Sent Events (SSE) Format

Streaming endpoints use SSE with the following event types:

- `progress`: Progress updates during execution
- `complete`: Final response with full data
- `error`: Error information

---

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input parameters |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error |

---

## Endpoints

### Health Check

Check if the API server is running.

#### Request

```http
GET /
```

#### Response

```json
{
  "status": "online",
  "service": "IDSS API",
  "version": "2.0.0"
}
```

#### Example

```bash
curl http://localhost:8000/
```

---

### Chat

Send a message to the conversational agent and receive a response with product recommendations.

#### Request

```http
POST /chat
Content-Type: application/json
```

**Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | User's message or query |
| `session_id` | string | No | Session ID for conversation continuity. If not provided, a new session is created. |

#### Request Body Example

```json
{
  "message": "I need a gaming CPU under $300",
  "session_id": "optional-session-id"
}
```

#### Response

**Status Code:** `200 OK`

**Response Body:**

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | AI-generated response text |
| `products` | array | List of recommended products (up to 20) |
| `filters` | object | Extracted explicit search filters |
| `preferences` | object | Inferred implicit preferences |
| `session_id` | string | Session ID for subsequent requests |
| `interviewed` | boolean | Whether interview process is complete |
| `quick_replies` | array\|null | Short answer options (1-5 words, 2-4 options) for direct questions |
| `suggested_followups` | array | Suggested next user inputs (short phrases, 3-5 options) |
| `comparison_table` | object | Optional comparison table for analytical queries |
| `compatibility_result` | object | Optional compatibility check result for PC parts |

#### Response Example

```json
{
  "response": "I found 12 gaming CPUs under $300. The AMD Ryzen 5 5600X stands out with excellent gaming performance and great value. Would you prefer AMD or Intel?",
  "products": [
    {
      "id": "rapidapi:1234567890",
      "name": "AMD Ryzen 5 5600X",
      "brand": "AMD",
      "product_type": "CPU",
      "price": 199.99,
      "price_text": "$199.99",
      "rating": 4.8,
      "rating_count": 1250,
      "imageurl": "https://example.com/image.jpg",
      "attributes": {
        "socket": "AM4",
        "cores": 6,
        "threads": 12,
        "base_clock": "3.7 GHz",
        "boost_clock": "4.6 GHz",
        "tdp": "65W"
      }
    }
  ],
  "filters": {
    "part_type": "CPU",
    "price": "0-300",
    "query": "gaming"
  },
  "preferences": {
    "priorities": ["performance", "value"],
    "usage_patterns": "gaming"
  },
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "interviewed": false,
  "quick_replies": ["AMD", "Intel", "Either"],
  "suggested_followups": [
    "Show me Intel options",
    "What about compatibility?",
    "Compare top 3"
  ]
}
```

#### Example Request

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need a gaming CPU under $300"
  }'
```

---

### Chat Stream

Send a message and receive real-time progress updates via Server-Sent Events (SSE).

#### Request

```http
POST /chat/stream
Content-Type: application/json
Accept: text/event-stream
```

**Body Parameters:** Same as `/chat` endpoint

#### Response

**Status Code:** `200 OK`  
**Content-Type:** `text/event-stream`

**Event Types:**

1. **progress** - Execution progress updates

```
event: progress
data: {"step_id": "intent_classification", "description": "Classifying user intent", "status": "in_progress"}

event: progress
data: {"step_id": "intent_classification", "description": "Intent classified", "status": "completed"}
```

2. **complete** - Final response (same structure as `/chat` endpoint)

```
event: complete
data: {"response": "...", "products": [...], "session_id": "...", ...}
```

3. **error** - Error information

```
event: error
data: {"error": "Error message", "detail": "Detailed error information"}
```

#### Progress Steps by Mode

**Buying Mode (Not Interviewed):**
1. Understanding your request
2. Routing to buying mode
3. Extracting preferences
4. Conducting interview
5. Searching for products
6. Presenting recommendations
7. Complete

**Discovery Mode:**
1. Understanding your request
2. Routing to discovery mode
3. Analyzing search criteria
4. Searching for products
5. Presenting products
6. Complete

**Analytical Mode:**
1. Understanding your request
2. Routing to analytical mode
3. Parsing question context
4. Executing tools
5. Synthesizing answer
6. Complete

#### Example Request

```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Show me DDR5 RAM"
  }'
```

---

### Session Management

#### Get Session State

Retrieve current state for a session.

```http
GET /session/{session_id}
```

**Response:**

```json
{
  "session_id": "string",
  "filters": {},
  "preferences": {},
  "products": [],
  "conversation_history": []
}
```

#### Reset Session

Reset or create a new session.

```http
POST /session/reset
Content-Type: application/json
```

**Request Body:**

```json
{
  "session_id": "optional-session-id"
}
```

**Response:**

```json
{
  "session_id": "new-or-reset-session-id",
  "status": "reset"
}
```

#### Delete Session

Delete a session.

```http
DELETE /session/{session_id}
```

**Response:**

```json
{
  "status": "deleted",
  "session_id": "deleted-session-id"
}
```

#### List Sessions

Get all active sessions.

```http
GET /sessions
```

**Response:**

```json
{
  "active_sessions": 3,
  "session_ids": ["id1", "id2", "id3"]
}
```

---

### Event Tracking

Track user interactions with products for analytics.

#### Log Event

```http
POST /session/{session_id}/event
Content-Type: application/json
```

**Request Body:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event_type` | string | Yes | Type of event (see event types below) |
| `data` | object | Yes | Event-specific data |
| `timestamp` | string | No | ISO timestamp (auto-generated if not provided) |

**Event Types:**

- `product_click` - User clicked on a product
- `product_view` - User viewed product details
- `compatibility_check` - User checked compatibility between products
- `link_click` - User clicked on external link
- Custom event types

**Request Example:**

```json
{
  "event_type": "product_click",
  "data": {
    "product_id": "rapidapi:1234567890",
    "product_index": 0,
    "product_type": "CPU",
    "brand": "AMD"
  }
}
```

**Response:**

```json
{
  "status": "logged",
  "event_id": 0,
  "timestamp": "2025-12-05T10:00:00.000000"
}
```

#### Retrieve Events

Get all events for a session, optionally filtered by type.

```http
GET /session/{session_id}/events?event_type={optional_type}
```

**Response:**

```json
{
  "session_id": "string",
  "events": [
    {
      "event_type": "product_click",
      "data": {},
      "timestamp": "2025-12-05T10:00:00.000000"
    }
  ],
  "total": 1
}
```

---

## Data Models

### Product Object

```typescript
{
  id: string;                    // Product identifier
  name: string;                  // Product name
  brand?: string;                // Brand name (e.g., "AMD", "NVIDIA")
  product_type?: string;         // Product type (e.g., "CPU", "GPU", "RAM")
  price?: number;                // Price in USD
  price_text?: string;           // Formatted price string
  price_min?: number;            // Minimum price
  price_max?: number;            // Maximum price
  price_avg?: number;           // Average price
  rating?: number;              // Rating (0-5)
  rating_count?: number;        // Number of ratings
  imageurl?: string;            // Product image URL
  seller?: string;              // Seller/retailer name
  attributes?: {                // Product attributes (varies by type)
    socket?: string;            // CPU/Motherboard socket
    vram?: string;              // GPU video RAM
    capacity?: string;          // Storage/RAM capacity
    wattage?: string;           // PSU wattage
    form_factor?: string;       // Form factor
    chipset?: string;           // Motherboard chipset
    ram_standard?: string;      // RAM standard (DDR4, DDR5)
    // ... more attributes
  };
  link?: string;                // Product link
  source?: string;              // Data source
}
```

### Filters Object

```typescript
{
  brand?: string;               // "AMD" or "AMD,Intel" (comma-separated)
  part_type?: string;           // "CPU", "GPU", "Motherboard", etc.
  category?: string;            // Product category
  series?: string;              // Product series (e.g., "Ryzen 7")
  price?: string;               // "100-500" (range format)
  seller?: string;              // Preferred retailers
  socket?: string;              // CPU/Motherboard socket
  vram?: string;                // GPU video RAM
  capacity?: string;            // Storage/RAM capacity
  wattage?: string;             // PSU wattage
  form_factor?: string;         // Form factor
  chipset?: string;             // Motherboard chipset
  ram_standard?: string;       // RAM standard
  query?: string;               // Free-form search query
  // ... more filters
}
```

### Preferences Object

```typescript
{
  priorities?: string[];        // ["performance", "value", "reliability"]
  lifestyle?: string;           // "gaming", "professional", "budget-conscious"
  budget_sensitivity?: string;  // "budget-conscious", "moderate", "luxury-focused"
  brand_affinity?: string[];   // Preferred brands
  concerns?: string[];         // ["compatibility", "power consumption"]
  usage_patterns?: string;     // "gaming", "content creation", "office work"
  notes?: string;               // Any other inferred information
}
```

### Compatibility Result Object

```typescript
{
  compatible: boolean;          // Overall compatibility status
  parts: Array<{                // Parts being checked
    id: string;
    name: string;
    type: string;
  }>;
  relationships: Array<{        // Compatibility relationships
    type: string;              // "SOCKET_COMPATIBLE_WITH", "RAM_COMPATIBLE_WITH", etc.
    compatible: boolean;
    details?: string;          // Additional details
  }>;
  warnings?: string[];         // Compatibility warnings
  recommendations?: string[];  // Recommendations for fixes
}
```

---

## Interactive Elements

The API provides two types of interactive elements to enhance user experience:

### Quick Replies

Short answer options (1-5 words, 2-4 options) that appear when the AI asks a direct question.

**Purpose:** Allow users to quickly answer questions by clicking instead of typing.

**Examples:**
- Budget questions: `["Under $200", "$200-$500", "$500+"]`
- Brand preference: `["AMD", "Intel", "Either"]`
- Yes/No: `["Yes", "No", "Maybe"]`

**When to Display:** Only when `quick_replies` is not `null`

### Suggested Follow-ups

Short phrases (3-5 options) representing what the user might want to say or ask next.

**Purpose:** Help users continue the conversation by suggesting common next steps.

**Examples:**
- `["Show me Intel options", "What about compatibility?", "Compare top 3"]`
- `["I want a GPU", "Show cheaper options", "Tell me more"]`
- `["Check power requirements", "Compare performance", "Show alternatives"]`

**When to Display:** Always present (array may be empty but field is always included)

### Implementation Guidelines

1. **Quick Replies:**
   - Display as pill-shaped buttons below the AI message
   - On click, send the selected text as the user's next message
   - Hide after user makes a selection

2. **Suggested Follow-ups:**
   - Display as chips/buttons in a separate section
   - Keep visible even after selection
   - Can click multiple times to explore different paths

---

## Code Examples

### Python

#### Basic Chat Request

```python
import requests

BASE_URL = "http://localhost:8000"

response = requests.post(
    f"{BASE_URL}/chat",
    json={
        "message": "I need a gaming GPU under $500"
    }
)

data = response.json()
print(f"AI Response: {data['response']}")
print(f"Products Found: {len(data['products'])}")
print(f"Quick Replies: {data['quick_replies']}")
print(f"Suggested Follow-ups: {data['suggested_followups']}")
```

#### Streaming Chat with SSE

```python
import requests
import json

response = requests.post(
    f"{BASE_URL}/chat/stream",
    json={"message": "Show me DDR5 RAM"},
    stream=True
)

event_type = None
for line in response.iter_lines(decode_unicode=True):
    if not line:
        continue

    if line.startswith('event:'):
        event_type = line.split(':', 1)[1].strip()
    elif line.startswith('data:'):
        data = json.loads(line.split(':', 1)[1])

        if event_type == 'progress':
            print(f"Progress: {data['description']}")
        elif event_type == 'complete':
            print(f"Complete! Found {len(data['products'])} products")
        elif event_type == 'error':
            print(f"Error: {data['error']}")
```

### JavaScript/TypeScript

#### Basic Chat Request

```javascript
const BASE_URL = 'http://localhost:8000';

async function sendMessage(message, sessionId = null) {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  const data = await response.json();
  return data;
}

// Usage
const result = await sendMessage('I need a gaming CPU');
console.log('AI Response:', result.response);
console.log('Quick Replies:', result.quick_replies);
console.log('Suggested Follow-ups:', result.suggested_followups);
console.log('Products:', result.products.length);
```

#### Streaming with EventSource

```javascript
function streamChat(message, sessionId = null) {
  const url = new URL(`${BASE_URL}/chat/stream`);

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({ message, session_id: sessionId }),
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let eventType = null;

    function processStream() {
      reader.read().then(({ done, value }) => {
        if (done) return;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        lines.forEach(line => {
          if (line.startsWith('event:')) {
            eventType = line.split(':')[1].trim();
          } else if (line.startsWith('data:')) {
            const data = JSON.parse(line.split('data:')[1]);

            if (eventType === 'progress') {
              console.log('Progress:', data.description);
            } else if (eventType === 'complete') {
              console.log('Complete!', data);
            } else if (eventType === 'error') {
              console.error('Error:', data.error);
            }
          }
        });

        processStream();
      });
    }

    processStream();
  });
}
```

### cURL

#### Send a Chat Message

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need an AMD CPU for gaming under $300"
  }'
```

#### Stream Chat with Progress

```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Show me DDR5 RAM"
  }'
```

#### Reset Session

```bash
curl -X POST http://localhost:8000/session/reset \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "existing-session-id"
  }'
```

#### Log an Event

```bash
curl -X POST http://localhost:8000/session/abc123/event \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "product_click",
    "data": {
      "product_id": "rapidapi:1234567890",
      "product_index": 0,
      "product_type": "CPU"
    }
  }'
```

---

## Rate Limiting

Currently, there are no rate limits enforced. For production deployment, implement appropriate rate limiting based on your infrastructure and usage patterns.

---

## Changelog

### Version 2.0.0 (2025-12-05)

**Changed:**
- Updated to PC parts and electronics domain
- Product recommendations now use Neo4j knowledge graph for PC parts
- Added compatibility checking for PC components
- Updated data models to reflect electronics products
- Removed vehicle-specific endpoints and models

**Added:**
- Compatibility result object in responses
- PC component-specific filters and attributes
- Knowledge graph integration for recommendations

### Version 1.0.0 (2025-10-24)

**Added:**
- Initial API release
- Chat and streaming chat endpoints
- Session management
- Event tracking
- Interactive elements (quick replies and suggested follow-ups)
- Intent-based routing (buying, browsing, research, general)
- Real-time progress updates via SSE
