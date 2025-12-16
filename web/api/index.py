"""
Vercel serverless function handler for FastAPI backend.

This wraps the FastAPI app using Mangum to make it compatible with Vercel's serverless functions.
"""
import sys
import os

# Add project root to path (go up from web/ to project root)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from mangum import Mangum
from api.server import app

# Create ASGI handler for Vercel
handler = Mangum(app, lifespan="off")
