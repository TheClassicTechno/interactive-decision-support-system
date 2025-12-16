"""
Vercel serverless function handler for FastAPI backend.

This wraps the FastAPI app using Mangum to make it compatible with Vercel's serverless functions.
"""
import sys
import os
import json

# In Vercel with root directory set to 'web/', the structure is:
# /var/task/ (web/ directory contents)
#   - api/
#     - index.py (this file)
#   - src/
#   - ...
# 
# Files included via includeFiles are placed relative to /var/task.
# Since we include ../api/**, ../idss_agent/**, etc., they should be at:
# /var/task/../api/ (parent of /var/task)
# But Vercel might place them differently. Let's try multiple strategies.

current_file = os.path.abspath(__file__)
# In Vercel with root='web/', files are copied into web/ during build
# So the structure in /var/task is:
# /var/task/ (web/ directory)
#   - api/ (copied from ../api/)
#   - idss_agent/ (copied from ../idss_agent/)
#   - config/ (copied from ../config/)
#   - data/ (copied from ../data/)
#   - requirements.txt (copied from ../requirements.txt)
#   - api/index.py (this file, in web/api/)

# Since files are copied into web/, /var/task is the project root
project_root = "/var/task"

# Verify api/server.py exists (if not, try alternative paths)
if not os.path.exists(os.path.join(project_root, "api", "server.py")):
    # Fallback: try going up from current file location
    possible_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))
    if os.path.exists(os.path.join(possible_root, "api", "server.py")):
        project_root = possible_root
    else:
        # Last resort: search for it
        for root in ["/var/task", os.path.dirname("/var/task"), possible_root]:
            if os.path.exists(os.path.join(root, "api", "server.py")):
                project_root = root
                break

sys.path.insert(0, project_root)

# Set environment variable for database path if not already set
if not os.getenv("PC_PARTS_DB"):
    # Try multiple possible locations
    possible_db_paths = [
        os.path.join(project_root, "data", "pc_parts.db"),
        "/var/task/data/pc_parts.db",
        os.path.join(os.path.dirname(project_root), "data", "pc_parts.db"),
    ]
    for db_path in possible_db_paths:
        if os.path.exists(db_path):
            os.environ["PC_PARTS_DB"] = db_path
            break

# Add comprehensive error handling and logging for debugging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info(f"Initializing serverless function handler")
logger.info(f"Current file: {current_file}")
logger.info(f"Project root: {project_root}")
logger.info(f"Python path: {sys.path[:3]}...")  # First 3 entries

# Check if required directories exist
required_dirs = ["api", "idss_agent"]
for dir_name in required_dirs:
    dir_path = os.path.join(project_root, dir_name)
    exists = os.path.exists(dir_path)
    logger.info(f"Directory {dir_name}: {'EXISTS' if exists else 'MISSING'} at {dir_path}")
    if exists:
        try:
            files = os.listdir(dir_path)[:5]  # First 5 files
            logger.info(f"  Sample files: {files}")
        except Exception as e:
            logger.warning(f"  Could not list files: {e}")

# Check for api/server.py specifically
api_server_path = os.path.join(project_root, "api", "server.py")
logger.info(f"Looking for api/server.py at: {api_server_path}")
logger.info(f"api/server.py exists: {os.path.exists(api_server_path)}")

# Try importing with detailed error reporting
try:
    logger.info("Attempting to import mangum...")
    from mangum import Mangum
    logger.info("Successfully imported mangum")
except ImportError as e:
    logger.error(f"Failed to import mangum: {e}")
    logger.error("This usually means Python dependencies are not installed.")
    logger.error("Check that requirements.txt is in the web/ directory and Vercel is installing it.")
    raise

try:
    logger.info("Attempting to import api.server...")
    from api.server import app
    logger.info("Successfully imported api.server")
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.error(f"Import error type: {type(e).__name__}")
    import traceback
    logger.error(f"Traceback:\n{traceback.format_exc()}")
    
    # Try to provide helpful debugging info
    logger.error("=" * 50)
    logger.error("DEBUGGING INFORMATION")
    logger.error("=" * 50)
    logger.error(f"Current file: {current_file}")
    logger.error(f"Project root: {project_root}")
    logger.error(f"Python executable: {sys.executable}")
    logger.error(f"Python version: {sys.version}")
    logger.error(f"Python path entries:")
    for i, path in enumerate(sys.path[:10]):  # First 10 entries
        logger.error(f"  [{i}] {path}")
    
    if os.path.exists(project_root):
        logger.error(f"Contents of project_root ({project_root}):")
        try:
            contents = os.listdir(project_root)
            logger.error(f"  {contents[:20]}")  # First 20 items
        except Exception as list_err:
            logger.error(f"  Could not list: {list_err}")
    
    if os.path.exists(os.path.join(project_root, "api")):
        logger.error(f"Contents of api/ directory:")
        try:
            api_contents = os.listdir(os.path.join(project_root, "api"))
            logger.error(f"  {api_contents}")
        except Exception as api_err:
            logger.error(f"  Could not list api/: {api_err}")
    
    raise

# Create ASGI handler for Vercel
try:
    handler = Mangum(app, lifespan="off")
    logger.info("Successfully created Mangum handler")
except Exception as e:
    logger.error(f"Failed to create Mangum handler: {e}")
    import traceback
    error_trace = traceback.format_exc()
    logger.error(error_trace)
    # Log critical debugging info before raising
    logger.error(f"CRITICAL: project_root={project_root}")
    logger.error(f"CRITICAL: api/server.py exists={os.path.exists(os.path.join(project_root, 'api', 'server.py'))}")
    if os.path.exists(project_root):
        try:
            logger.error(f"CRITICAL: Contents of {project_root}: {os.listdir(project_root)[:10]}")
        except:
            pass
    raise

# Export handler for Vercel
__all__ = ["handler"]
