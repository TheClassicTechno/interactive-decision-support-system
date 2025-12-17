"""
Vercel serverless function handler for FastAPI backend.

This wraps the FastAPI app using Mangum to make it compatible with Vercel's serverless functions.
"""
import sys
import os
import logging

# Setup logging first for debugging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get project root - this file is at <project_root>/api/index.py
current_file = os.path.abspath(__file__)
project_root = os.path.dirname(os.path.dirname(current_file))

# Add project root to Python path
sys.path.insert(0, project_root)

logger.info(f"Initializing serverless function handler")
logger.info(f"Current file: {current_file}")
logger.info(f"Project root: {project_root}")

# Set environment variable for database path if not already set
if not os.getenv("PC_PARTS_DB"):
    possible_db_paths = [
        os.path.join(project_root, "data", "pc_parts.db"),
        "/var/task/data/pc_parts.db",
    ]
    for db_path in possible_db_paths:
        if os.path.exists(db_path):
            os.environ["PC_PARTS_DB"] = db_path
            logger.info(f"Set PC_PARTS_DB to: {db_path}")
            break

# Try importing dependencies with detailed error reporting
try:
    logger.info("Attempting to import mangum...")
    from mangum import Mangum
    logger.info("Successfully imported mangum")
except ImportError as e:
    logger.error(f"Failed to import mangum: {e}")
    logger.error("mangum is required for Vercel serverless functions.")
    logger.error("Ensure requirements.txt includes: mangum>=0.17.0")
    raise

try:
    logger.info("Attempting to import fastapi...")
    from fastapi import FastAPI
    logger.info("Successfully imported fastapi")
except ImportError as e:
    logger.error(f"Failed to import fastapi: {e}")
    logger.error("fastapi is required for the API server.")
    logger.error("Ensure requirements.txt includes: fastapi>=0.104.0")
    raise

try:
    logger.info("Attempting to import api.server...")
    from api.server import app
    logger.info("Successfully imported api.server")
except ImportError as e:
    logger.error(f"Failed to import api.server: {e}")
    logger.error(f"Import error type: {type(e).__name__}")
    import traceback
    logger.error(f"Traceback:\n{traceback.format_exc()}")
    
    # Debugging info
    logger.error("=" * 50)
    logger.error("DEBUGGING INFORMATION")
    logger.error("=" * 50)
    logger.error(f"Python executable: {sys.executable}")
    logger.error(f"Python version: {sys.version}")
    logger.error(f"Python path entries (first 10):")
    for i, path in enumerate(sys.path[:10]):
        logger.error(f"  [{i}] {path}")
    
    # Check directory contents
    api_dir = os.path.join(project_root, "api")
    if os.path.exists(api_dir):
        logger.error(f"Contents of api/ directory:")
        try:
            api_contents = os.listdir(api_dir)
            logger.error(f"  {api_contents}")
        except Exception as api_err:
            logger.error(f"  Could not list api/: {api_err}")
    else:
        logger.error(f"api/ directory not found at {api_dir}")
    
    raise

# Create ASGI handler for Vercel
try:
    handler = Mangum(app, lifespan="off")
    logger.info("Successfully created Mangum handler")
except Exception as e:
    logger.error(f"Failed to create Mangum handler: {e}")
    import traceback
    logger.error(f"Traceback:\n{traceback.format_exc()}")
    raise

# Export handler for Vercel
__all__ = ["handler"]
