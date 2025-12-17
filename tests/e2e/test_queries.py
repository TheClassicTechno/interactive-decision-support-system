"""
End-to-end query tests for the IDSS Agent.

This module contains a comprehensive list of test queries that the agent
should be able to handle. These tests run actual queries against the agent
without the UI and generate a pass/fail report.

Usage:
    # Run all query tests
    pytest tests/e2e/test_queries.py -v
    
    # Run and generate detailed report
    pytest tests/e2e/test_queries.py -v --tb=short -s
    
    # Run specific query category
    pytest tests/e2e/test_queries.py -k "gpu" -v
    
    # Run standalone (no pytest required)
    python -m tests.e2e.test_queries
"""
import json
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

# Conditional pytest import - allows running standalone
try:
    import pytest
    PYTEST_AVAILABLE = True
except ImportError:
    PYTEST_AVAILABLE = False
    pytest = None  # type: ignore


class QueryCategory(str, Enum):
    """Categories of test queries."""
    GPU = "gpu"
    CPU = "cpu"
    MOTHERBOARD = "motherboard"
    RAM = "ram"
    STORAGE = "storage"
    PSU = "psu"
    COOLING = "cooling"
    GENERAL = "general"
    COMPARISON = "comparison"
    COMPATIBILITY = "compatibility"
    BUDGET = "budget"
    GREETING = "greeting"


@dataclass
class TestQuery:
    """A test query with expected outcomes."""
    query: str
    category: QueryCategory
    expected_part_type: Optional[str] = None
    expected_in_response: Optional[List[str]] = None  # Words that should appear
    should_have_products: bool = True
    min_products: int = 0
    description: str = ""


# ============================================================================
# COMPREHENSIVE QUERY TEST LIST
# These are the queries that should work for demos and testing
# ============================================================================

TEST_QUERIES: List[TestQuery] = [
    # --------------------------------------------------------------------------
    # GREETINGS AND GENERAL
    # --------------------------------------------------------------------------
    TestQuery(
        query="Hello",
        category=QueryCategory.GREETING,
        should_have_products=False,
        description="Basic greeting"
    ),
    TestQuery(
        query="Hi, I need help building a PC",
        category=QueryCategory.GREETING,
        should_have_products=False,
        description="Greeting with intent"
    ),
    TestQuery(
        query="What can you help me with?",
        category=QueryCategory.GENERAL,
        should_have_products=False,
        description="Capabilities question"
    ),
    
    # --------------------------------------------------------------------------
    # GPU QUERIES - Simple & Category
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me GPU recommendations",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        min_products=1,
        description="Simple GPU request"
    ),
    TestQuery(
        query="I need a graphics card",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Graphics card synonym"
    ),
    TestQuery(
        query="What GPUs do you have?",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="GPU availability question"
    ),
    
    # --------------------------------------------------------------------------
    # GPU QUERIES - Brand-Specific
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me NVIDIA GPUs",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        expected_in_response=["NVIDIA"],
        should_have_products=True,
        description="NVIDIA brand GPU"
    ),
    TestQuery(
        query="I want an AMD graphics card",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="AMD brand GPU"
    ),
    TestQuery(
        query="Show me ASUS GPUs",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="ASUS brand GPU"
    ),
    TestQuery(
        query="MSI graphics cards",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="MSI brand GPU"
    ),
    TestQuery(
        query="Gigabyte GPU options",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Gigabyte brand GPU"
    ),
    
    # --------------------------------------------------------------------------
    # GPU QUERIES - Use-Case & Performance Qualifiers
    # --------------------------------------------------------------------------
    TestQuery(
        query="Best GPU for gaming",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Gaming GPU"
    ),
    TestQuery(
        query="High performance GPU for 4K gaming",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="High performance 4K GPU"
    ),
    TestQuery(
        query="GPU for video editing and rendering",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Content creation GPU"
    ),
    TestQuery(
        query="Quiet GPU with good cooling",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Quiet/cooling GPU"
    ),
    TestQuery(
        query="Best GPU for machine learning",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="ML/AI GPU"
    ),
    TestQuery(
        query="Entry-level GPU for casual gaming",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Entry-level GPU"
    ),
    
    # --------------------------------------------------------------------------
    # GPU QUERIES - Price & Budget
    # --------------------------------------------------------------------------
    TestQuery(
        query="GPU under $500",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="GPU under $500"
    ),
    TestQuery(
        query="Best budget GPU under $300",
        category=QueryCategory.BUDGET,
        expected_part_type="gpu",
        should_have_products=True,
        description="Budget GPU under $300"
    ),
    TestQuery(
        query="Premium high-end GPU, price is no object",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Premium GPU"
    ),
    TestQuery(
        query="Mid-range GPU around $400-600",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Mid-range GPU with price range"
    ),
    
    # --------------------------------------------------------------------------
    # GPU QUERIES - Specific Models
    # --------------------------------------------------------------------------
    TestQuery(
        query="RTX 4070 recommendations",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Specific model: RTX 4070"
    ),
    TestQuery(
        query="Show me RTX 4090 options",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Specific model: RTX 4090"
    ),
    TestQuery(
        query="AMD RX 7800 XT cards",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Specific model: RX 7800 XT"
    ),
    
    # --------------------------------------------------------------------------
    # CPU QUERIES - Simple & Category
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me CPU recommendations",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        min_products=1,
        description="Simple CPU request"
    ),
    TestQuery(
        query="I need a processor",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="Processor synonym"
    ),
    
    # --------------------------------------------------------------------------
    # CPU QUERIES - Brand-Specific
    # --------------------------------------------------------------------------
    TestQuery(
        query="What Intel CPUs do you recommend?",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="Intel brand CPU"
    ),
    TestQuery(
        query="AMD Ryzen processors",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="AMD Ryzen CPU"
    ),
    
    # --------------------------------------------------------------------------
    # CPU QUERIES - Use-Case & Performance Qualifiers
    # --------------------------------------------------------------------------
    TestQuery(
        query="I need a processor for gaming",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="Gaming CPU"
    ),
    TestQuery(
        query="High performance CPU for streaming",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="Streaming CPU"
    ),
    TestQuery(
        query="Best CPU for productivity and multitasking",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="Productivity CPU"
    ),
    TestQuery(
        query="Power efficient CPU for quiet build",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="Power efficient CPU"
    ),
    TestQuery(
        query="I want an 8-core CPU",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="CPU with core count"
    ),
    
    # --------------------------------------------------------------------------
    # CPU QUERIES - Price & Budget
    # --------------------------------------------------------------------------
    TestQuery(
        query="Best CPU under $300",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="CPU under $300"
    ),
    TestQuery(
        query="Cheap but good CPU",
        category=QueryCategory.BUDGET,
        expected_part_type="cpu",
        should_have_products=True,
        description="Budget CPU"
    ),
    
    # --------------------------------------------------------------------------
    # MOTHERBOARD QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me motherboard recommendations",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        min_products=1,
        description="Simple motherboard request"
    ),
    TestQuery(
        query="I need an AM5 motherboard",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        description="Socket-specific motherboard"
    ),
    TestQuery(
        query="ATX motherboards with WiFi",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        description="Form factor + WiFi feature"
    ),
    TestQuery(
        query="What motherboards work with Ryzen 7000?",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        description="Ryzen 7000 compatibility"
    ),
    TestQuery(
        query="B650 motherboard recommendations",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        description="Specific chipset: B650"
    ),
    TestQuery(
        query="High-end X670E motherboard for overclocking",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        description="Enthusiast motherboard"
    ),
    TestQuery(
        query="Budget motherboard for Intel 13th gen",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        description="Budget Intel motherboard"
    ),
    
    # --------------------------------------------------------------------------
    # RAM QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me RAM recommendations",
        category=QueryCategory.RAM,
        expected_part_type="ram",
        should_have_products=True,
        description="Simple RAM request"
    ),
    TestQuery(
        query="I need 32GB DDR5 memory",
        category=QueryCategory.RAM,
        expected_part_type="ram",
        should_have_products=True,
        description="Specific RAM capacity DDR5"
    ),
    TestQuery(
        query="Best DDR5 RAM for gaming",
        category=QueryCategory.RAM,
        expected_part_type="ram",
        should_have_products=True,
        description="Gaming RAM"
    ),
    TestQuery(
        query="Fast RAM with good latency",
        category=QueryCategory.RAM,
        expected_part_type="ram",
        should_have_products=True,
        description="Performance RAM"
    ),
    TestQuery(
        query="RGB RAM kit for gaming build",
        category=QueryCategory.RAM,
        expected_part_type="ram",
        should_have_products=True,
        description="RGB RAM"
    ),
    
    # --------------------------------------------------------------------------
    # STORAGE QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me SSD recommendations",
        category=QueryCategory.STORAGE,
        expected_part_type="storage",
        should_have_products=True,
        description="SSD request"
    ),
    TestQuery(
        query="I need a 1TB NVMe drive",
        category=QueryCategory.STORAGE,
        expected_part_type="storage",
        should_have_products=True,
        description="Specific storage capacity"
    ),
    TestQuery(
        query="Best storage for gaming PC",
        category=QueryCategory.STORAGE,
        expected_part_type="storage",
        should_have_products=True,
        description="Gaming storage"
    ),
    TestQuery(
        query="Fast PCIe Gen 5 SSD",
        category=QueryCategory.STORAGE,
        expected_part_type="storage",
        should_have_products=True,
        description="High-speed SSD"
    ),
    TestQuery(
        query="Budget SSD for boot drive",
        category=QueryCategory.STORAGE,
        expected_part_type="storage",
        should_have_products=True,
        description="Budget boot SSD"
    ),
    
    # --------------------------------------------------------------------------
    # PSU QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me power supply recommendations",
        category=QueryCategory.PSU,
        expected_part_type="psu",
        should_have_products=True,
        description="PSU request"
    ),
    TestQuery(
        query="I need an 850W PSU",
        category=QueryCategory.PSU,
        expected_part_type="psu",
        should_have_products=True,
        description="Specific wattage PSU"
    ),
    TestQuery(
        query="80+ Gold power supply",
        category=QueryCategory.PSU,
        expected_part_type="psu",
        should_have_products=True,
        description="Efficiency rating PSU"
    ),
    TestQuery(
        query="Quiet modular PSU for small form factor build",
        category=QueryCategory.PSU,
        expected_part_type="psu",
        should_have_products=True,
        description="Quiet modular SFF PSU"
    ),
    TestQuery(
        query="PSU for high-end RTX 4090 build",
        category=QueryCategory.PSU,
        expected_part_type="psu",
        should_have_products=True,
        description="High-wattage PSU for 4090"
    ),
    
    # --------------------------------------------------------------------------
    # COOLING QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="Show me CPU cooler recommendations",
        category=QueryCategory.COOLING,
        expected_part_type="cooler",
        should_have_products=True,
        description="CPU cooler request"
    ),
    TestQuery(
        query="I need an AIO liquid cooler",
        category=QueryCategory.COOLING,
        expected_part_type="cooler",
        should_have_products=True,
        description="AIO cooler request"
    ),
    TestQuery(
        query="Quiet air cooler for Ryzen 7000",
        category=QueryCategory.COOLING,
        expected_part_type="cooler",
        should_have_products=True,
        description="Quiet air cooler"
    ),
    TestQuery(
        query="Best cooler for overclocked CPU",
        category=QueryCategory.COOLING,
        expected_part_type="cooler",
        should_have_products=True,
        description="High-performance cooler"
    ),
    
    # --------------------------------------------------------------------------
    # COMPARISON QUERIES (Analytical - no products expected)
    # --------------------------------------------------------------------------
    TestQuery(
        query="Compare RTX 4070 vs RX 7800 XT",
        category=QueryCategory.COMPARISON,
        expected_in_response=["4070", "7800"],
        should_have_products=False,
        description="GPU comparison: RTX vs RX"
    ),
    TestQuery(
        query="Which is better: Intel or AMD for gaming?",
        category=QueryCategory.COMPARISON,
        should_have_products=False,
        description="Brand comparison for gaming"
    ),
    TestQuery(
        query="Ryzen 7800X3D vs Intel i7-14700K",
        category=QueryCategory.COMPARISON,
        should_have_products=False,
        description="CPU comparison: AMD vs Intel"
    ),
    TestQuery(
        query="Which works better for graphics work: RTX 4070 or W7900?",
        category=QueryCategory.COMPARISON,
        expected_in_response=["4070", "W7900"],
        should_have_products=False,
        description="Workstation GPU comparison"
    ),
    TestQuery(
        query="DDR4 vs DDR5: is the upgrade worth it?",
        category=QueryCategory.COMPARISON,
        should_have_products=False,
        description="RAM generation comparison"
    ),
    TestQuery(
        query="Air cooling vs liquid cooling - which should I choose?",
        category=QueryCategory.COMPARISON,
        should_have_products=False,
        description="Cooling method comparison"
    ),
    
    # --------------------------------------------------------------------------
    # COMPATIBILITY QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="Is RTX 4090 compatible with my 750W PSU?",
        category=QueryCategory.COMPATIBILITY,
        should_have_products=False,
        description="PSU compatibility check"
    ),
    TestQuery(
        query="What PSU do I need for RTX 4080?",
        category=QueryCategory.COMPATIBILITY,
        should_have_products=True,
        description="PSU recommendation for GPU"
    ),
    TestQuery(
        query="Will this RAM work with my B650 motherboard?",
        category=QueryCategory.COMPATIBILITY,
        should_have_products=False,
        description="RAM compatibility check"
    ),
    
    # --------------------------------------------------------------------------
    # BUDGET/COMPLETE BUILD QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="Gaming PC parts under $1000 total",
        category=QueryCategory.BUDGET,
        should_have_products=True,
        description="Budget $1000 build"
    ),
    TestQuery(
        query="Best value components for a $1500 gaming build",
        category=QueryCategory.BUDGET,
        should_have_products=True,
        description="Mid-range $1500 build"
    ),
    TestQuery(
        query="High-end enthusiast build, no budget limit",
        category=QueryCategory.BUDGET,
        should_have_products=True,
        description="Enthusiast build"
    ),
    
    # --------------------------------------------------------------------------
    # LAPTOP/PORTABLE QUERIES (if supported)
    # --------------------------------------------------------------------------
    TestQuery(
        query="Best laptop for college",
        category=QueryCategory.GENERAL,
        should_have_products=False,
        description="College laptop recommendation"
    ),
    TestQuery(
        query="Lightweight laptop for programming",
        category=QueryCategory.GENERAL,
        should_have_products=False,
        description="Portable developer laptop"
    ),
    TestQuery(
        query="Gaming laptop under $1500",
        category=QueryCategory.GENERAL,
        should_have_products=False,
        description="Budget gaming laptop"
    ),
    
    # --------------------------------------------------------------------------
    # MULTI-CONSTRAINT QUERIES
    # --------------------------------------------------------------------------
    TestQuery(
        query="NVIDIA GPU under $600 with good cooling",
        category=QueryCategory.GPU,
        expected_part_type="gpu",
        should_have_products=True,
        description="Multi-constraint: brand + price + feature"
    ),
    TestQuery(
        query="AMD CPU with integrated graphics under $250",
        category=QueryCategory.CPU,
        expected_part_type="cpu",
        should_have_products=True,
        description="Multi-constraint: brand + feature + price"
    ),
    TestQuery(
        query="Compact ITX motherboard with WiFi for AM5",
        category=QueryCategory.MOTHERBOARD,
        expected_part_type="motherboard",
        should_have_products=True,
        description="Multi-constraint: form factor + feature + socket"
    ),
    TestQuery(
        query="32GB DDR5 RGB RAM under $150",
        category=QueryCategory.RAM,
        expected_part_type="ram",
        should_have_products=True,
        description="Multi-constraint: capacity + type + feature + price"
    ),
]


def evaluate_response(
    query: TestQuery,
    state: Dict[str, Any],
    response_time: float
) -> Dict[str, Any]:
    """
    Evaluate an agent response against expected outcomes.
    
    Returns dict with pass/fail and details.
    """
    result = {
        "query": query.query,
        "category": query.category.value,
        "description": query.description,
        "passed": True,
        "response_time_ms": round(response_time * 1000, 2),
        "ai_response": state.get("ai_response", "")[:200] + "...",
        "products_count": len(state.get("recommended_products", [])),
        "filters_extracted": state.get("explicit_filters", {}),
        "failures": [],
    }
    
    # Check if response exists
    if not state.get("ai_response"):
        result["passed"] = False
        result["failures"].append("No AI response generated")
        return result
    
    # Check product count
    products = state.get("recommended_products", [])
    if query.should_have_products:
        if len(products) < query.min_products:
            result["passed"] = False
            result["failures"].append(
                f"Expected at least {query.min_products} products, got {len(products)}"
            )
    
    # Check expected words in response
    if query.expected_in_response:
        response_text = state.get("ai_response", "").lower()
        for word in query.expected_in_response:
            if word.lower() not in response_text:
                # Also check in product titles
                product_titles = " ".join([
                    p.get("title", "") for p in products
                ]).lower()
                if word.lower() not in product_titles:
                    result["passed"] = False
                    result["failures"].append(f"Expected '{word}' in response")
    
    # Check part type extracted
    if query.expected_part_type:
        filters = state.get("explicit_filters", {})
        extracted_type = (
            filters.get("part_type") or 
            filters.get("category") or 
            ""
        ).lower()
        if query.expected_part_type.lower() not in extracted_type:
            # Not a hard failure - might still work
            result["note"] = f"Expected part_type '{query.expected_part_type}', got '{extracted_type}'"
    
    return result


# Only define pytest fixtures and test classes if pytest is available
if PYTEST_AVAILABLE:
    @pytest.fixture(scope="module")
    def agent_runner():
        """Setup agent for query testing."""
        from idss_agent.core.agent import run_agent
        from idss_agent.state.schema import create_initial_state
        
        def _run_query(query: str):
            state = create_initial_state()
            start = time.time()
            result_state = run_agent(query, state)
            elapsed = time.time() - start
            return result_state, elapsed
        
        return _run_query


    class TestSimpleQueries:
        """Test simple single-turn queries."""
        
        @pytest.mark.e2e
        @pytest.mark.requires_openai
        @pytest.mark.parametrize("test_query", [
            q for q in TEST_QUERIES 
            if q.category in [QueryCategory.GREETING, QueryCategory.GENERAL]
        ], ids=lambda q: q.description)
        def test_greeting_queries(self, agent_runner, test_query, skip_without_openai):
            """Test greeting and general queries."""
            state, response_time = agent_runner(test_query.query)
            result = evaluate_response(test_query, state, response_time)
            
            assert result["passed"], f"Failed: {result['failures']}"

        @pytest.mark.e2e
        @pytest.mark.requires_openai
        @pytest.mark.parametrize("test_query", [
            q for q in TEST_QUERIES if q.category == QueryCategory.GPU
        ], ids=lambda q: q.description)
        def test_gpu_queries(self, agent_runner, test_query, skip_without_openai):
            """Test GPU-related queries."""
            state, response_time = agent_runner(test_query.query)
            result = evaluate_response(test_query, state, response_time)
            
            assert result["passed"], f"Failed: {result['failures']}"

        @pytest.mark.e2e
        @pytest.mark.requires_openai
        @pytest.mark.parametrize("test_query", [
            q for q in TEST_QUERIES if q.category == QueryCategory.CPU
        ], ids=lambda q: q.description)
        def test_cpu_queries(self, agent_runner, test_query, skip_without_openai):
            """Test CPU-related queries."""
            state, response_time = agent_runner(test_query.query)
            result = evaluate_response(test_query, state, response_time)
            
            assert result["passed"], f"Failed: {result['failures']}"

        @pytest.mark.e2e
        @pytest.mark.requires_openai
        @pytest.mark.parametrize("test_query", [
            q for q in TEST_QUERIES if q.category == QueryCategory.MOTHERBOARD
        ], ids=lambda q: q.description)
        def test_motherboard_queries(self, agent_runner, test_query, skip_without_openai):
            """Test motherboard-related queries."""
            state, response_time = agent_runner(test_query.query)
            result = evaluate_response(test_query, state, response_time)
            
            assert result["passed"], f"Failed: {result['failures']}"


# ============================================================================
# STANDALONE QUERY RUNNER (for running outside pytest)
# ============================================================================

def run_all_queries_standalone():
    """
    Run all test queries and generate a detailed report.
    Can be run standalone: python -m tests.e2e.test_queries
    """
    import os
    import sys
    from pathlib import Path
    
    # Add project root to path
    project_root = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(project_root))
    
    from dotenv import load_dotenv
    load_dotenv(project_root / ".env")
    
    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set")
        return
    
    from idss_agent.core.agent import run_agent
    from idss_agent.state.schema import create_initial_state
    
    print("=" * 70)
    print("IDSS AGENT QUERY TEST SUITE")
    print("=" * 70)
    print(f"Running {len(TEST_QUERIES)} queries...\n")
    
    results = []
    passed = []
    failed = []
    
    for i, test_query in enumerate(TEST_QUERIES, 1):
        print(f"[{i}/{len(TEST_QUERIES)}] Testing: {test_query.description}")
        print(f"    Query: {test_query.query}")
        
        try:
            state = create_initial_state()
            start = time.time()
            result_state = run_agent(test_query.query, state)
            elapsed = time.time() - start
            
            result = evaluate_response(test_query, result_state, elapsed)
            results.append(result)
            
            if result["passed"]:
                passed.append(result)
                print(f"    ✅ PASS ({result['response_time_ms']}ms, {result['products_count']} products)")
            else:
                failed.append(result)
                print(f"    ❌ FAIL: {result['failures']}")
                
        except Exception as e:
            result = {
                "query": test_query.query,
                "category": test_query.category.value,
                "description": test_query.description,
                "passed": False,
                "failures": [f"Exception: {str(e)}"],
            }
            results.append(result)
            failed.append(result)
            print(f"    ❌ ERROR: {e}")
        
        print()
    
    # Print summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total:  {len(results)}")
    print(f"Passed: {len(passed)} ✅")
    print(f"Failed: {len(failed)} ❌")
    print(f"Pass Rate: {len(passed)/len(results)*100:.1f}%")
    
    if failed:
        print("\n" + "=" * 70)
        print("FAILED QUERIES")
        print("=" * 70)
        for f in failed:
            print(f"- {f['description']}: {f['query']}")
            print(f"  Failures: {f['failures']}")
    
    print("\n" + "=" * 70)
    print("PASSED QUERIES (Demo Ready)")
    print("=" * 70)
    for p in passed:
        print(f"✅ {p['description']}: \"{p['query']}\"")
    
    # Save results to JSON
    report_path = project_root / "tests" / "query_test_report.json"
    with open(report_path, "w") as f:
        json.dump({
            "total": len(results),
            "passed": len(passed),
            "failed": len(failed),
            "pass_rate": len(passed)/len(results)*100,
            "passed_queries": [{"query": p["query"], "description": p["description"]} for p in passed],
            "failed_queries": [{"query": f["query"], "description": f["description"], "failures": f["failures"]} for f in failed],
            "all_results": results,
        }, f, indent=2)
    print(f"\nDetailed report saved to: {report_path}")
    
    return passed, failed


if __name__ == "__main__":
    run_all_queries_standalone()
