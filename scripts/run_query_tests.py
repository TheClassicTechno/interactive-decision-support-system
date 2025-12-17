#!/usr/bin/env python3
"""
Standalone script to run query tests against the IDSS agent.

This script runs queries directly against the agent without needing pytest,
making it easy to test the agent from the command line.

Usage:
    # Run all queries
    python scripts/run_query_tests.py
    
    # Run specific category
    python scripts/run_query_tests.py --category gpu
    
    # Run a single custom query
    python scripts/run_query_tests.py --query "Show me GPU recommendations"
    
    # Verbose output
    python scripts/run_query_tests.py -v
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv(project_root / ".env")


# Import test queries
from tests.e2e.test_queries import TEST_QUERIES, TestQuery, QueryCategory, evaluate_response


def run_single_query(query: str, verbose: bool = False) -> Dict[str, Any]:
    """Run a single query against the agent."""
    from idss_agent.core.agent import run_agent
    from idss_agent.state.schema import create_initial_state
    
    state = create_initial_state()
    start = time.time()
    result_state = run_agent(query, state)
    elapsed = time.time() - start
    
    result = {
        "query": query,
        "response_time_ms": round(elapsed * 1000, 2),
        "ai_response": result_state.get("ai_response", ""),
        "products_count": len(result_state.get("recommended_products", [])),
        "products": result_state.get("recommended_products", [])[:5],  # First 5
        "filters": result_state.get("explicit_filters", {}),
        "preferences": result_state.get("implicit_preferences", {}),
    }
    
    if verbose:
        print(f"\nQuery: {query}")
        print(f"Response Time: {result['response_time_ms']}ms")
        print(f"Products Found: {result['products_count']}")
        print(f"\nAI Response:\n{result['ai_response']}")
        print(f"\nFilters Extracted: {json.dumps(result['filters'], indent=2)}")
        if result['products']:
            print(f"\nTop Products:")
            for p in result['products']:
                print(f"  - {p.get('title', 'Unknown')} (${p.get('price_value', 'N/A')})")
    
    return result


def run_test_suite(
    category: Optional[str] = None,
    verbose: bool = False,
    limit: Optional[int] = None
) -> Dict[str, Any]:
    """Run the full test suite."""
    from idss_agent.core.agent import run_agent
    from idss_agent.state.schema import create_initial_state
    
    # Filter queries by category if specified
    queries = TEST_QUERIES
    if category:
        try:
            cat = QueryCategory(category.lower())
            queries = [q for q in TEST_QUERIES if q.category == cat]
        except ValueError:
            print(f"Invalid category: {category}")
            print(f"Valid categories: {[c.value for c in QueryCategory]}")
            sys.exit(1)
    
    if limit:
        queries = queries[:limit]
    
    print("=" * 70)
    print("IDSS AGENT QUERY TEST SUITE")
    print("=" * 70)
    print(f"Running {len(queries)} queries...")
    if category:
        print(f"Category: {category}")
    print()
    
    results = []
    passed = []
    failed = []
    
    for i, test_query in enumerate(queries, 1):
        print(f"[{i}/{len(queries)}] {test_query.description}")
        print(f"    Query: \"{test_query.query}\"")
        
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
            
            if verbose:
                print(f"    Response: {result_state.get('ai_response', '')[:100]}...")
                
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
    if results:
        print(f"Pass Rate: {len(passed)/len(results)*100:.1f}%")
    
    # Print pass list (for demo)
    if passed:
        print("\n" + "=" * 70)
        print("PASSED QUERIES (Demo Ready)")
        print("=" * 70)
        for p in passed:
            print(f"✅ \"{p['query']}\"")
            print(f"   ({p['description']})")
    
    # Print fail list
    if failed:
        print("\n" + "=" * 70)
        print("FAILED QUERIES")
        print("=" * 70)
        for f in failed:
            print(f"❌ \"{f['query']}\"")
            print(f"   Failures: {f['failures']}")
    
    # Save report
    report = {
        "total": len(results),
        "passed": len(passed),
        "failed": len(failed),
        "pass_rate": len(passed)/len(results)*100 if results else 0,
        "passed_queries": [p["query"] for p in passed],
        "failed_queries": [{"query": f["query"], "failures": f["failures"]} for f in failed],
    }
    
    report_path = project_root / "tests" / "query_test_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nReport saved to: {report_path}")
    
    return report


def main():
    parser = argparse.ArgumentParser(description="Run query tests against IDSS agent")
    parser.add_argument("--query", "-q", help="Run a single custom query")
    parser.add_argument("--category", "-c", help="Filter by category (gpu, cpu, etc.)")
    parser.add_argument("--limit", "-l", type=int, help="Limit number of queries")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--list-categories", action="store_true", help="List available categories")
    
    args = parser.parse_args()
    
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY environment variable not set")
        print("Please set it: export OPENAI_API_KEY='sk-...'")
        sys.exit(1)
    
    if args.list_categories:
        print("Available categories:")
        for cat in QueryCategory:
            count = len([q for q in TEST_QUERIES if q.category == cat])
            print(f"  - {cat.value}: {count} queries")
        sys.exit(0)
    
    if args.query:
        # Run single query
        result = run_single_query(args.query, verbose=args.verbose)
        if not args.verbose:
            print(f"\nResponse: {result['ai_response'][:500]}...")
            print(f"\nProducts: {result['products_count']}")
    else:
        # Run test suite
        run_test_suite(
            category=args.category,
            verbose=args.verbose,
            limit=args.limit
        )


if __name__ == "__main__":
    main()
