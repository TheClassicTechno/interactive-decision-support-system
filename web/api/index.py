"""
Vercel serverless function handler for FastAPI backend.

This wraps the FastAPI app using Mangum to make it compatible with Vercel's serverless functions.
"""
import sys
import os

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

# Add error handling for imports
try:
    from mangum import Mangum
    from api.server import app
except ImportError as e:
    # Log the error for debugging
    import logging
    logging.basicConfig(level=logging.ERROR)
    logger = logging.getLogger(__name__)
    logger.error(f"Failed to import required modules: {e}")
    logger.error(f"Current file: {current_file}")
    logger.error(f"Project root: {project_root}")
    logger.error(f"Python path: {sys.path}")
    logger.error(f"Files in project_root: {os.listdir(project_root) if os.path.exists(project_root) else 'NOT FOUND'}")
    raise

# Create ASGI handler for Vercel
handler = Mangum(app, lifespan="off")
