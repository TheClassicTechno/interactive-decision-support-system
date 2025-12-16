"""
Simple test endpoint to verify Vercel Python function is working.
"""
import json

def handler(request):
    """Simple handler that returns a JSON response."""
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'status': 'ok',
            'message': 'Python function is working',
            'path': request.get('path', 'unknown')
        })
    }
