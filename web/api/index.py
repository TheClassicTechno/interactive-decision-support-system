"""
Vercel serverless function handler for FastAPI backend.

This wraps the FastAPI app using Mangum to make it compatible with Vercel's serverless functions.
"""
import sys
import os

# In Vercel, the function runs from /var/task, and the project structure is:
# /var/task/ (project root)
#   - api/
#   - idss_agent/
#   - data/
#   - web/
#     - api/
#       - index.py (this file)
#
# We need to find the project root. Try multiple strategies:
# 1. Go up from web/api/index.py (3 levels)
# 2. Use VERCEL environment variable if available
# 3. Fall back to /var/task (Vercel's default)

current_file = os.path.abspath(__file__)
# Go up: web/api/index.py -> web/api -> web -> project_root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))

# In Vercel, if we're in /var/task, that's already the project root
# But if the file structure is different, try to detect it
if not os.path.exists(os.path.join(project_root, "api")):
    # Try /var/task as fallback (Vercel's function directory)
    if os.path.exists("/var/task/api"):
        project_root = "/var/task"
    # Try going up one more level
    elif os.path.exists(os.path.join(os.path.dirname(project_root), "api")):
        project_root = os.path.dirname(project_root)

sys.path.insert(0, project_root)

# Set environment variable for database path if not already set
# In Vercel, the database should be at project_root/data/pc_parts.db
if not os.getenv("PC_PARTS_DB"):
    db_path = os.path.join(project_root, "data", "pc_parts.db")
    if os.path.exists(db_path):
        os.environ["PC_PARTS_DB"] = db_path

from mangum import Mangum
from api.server import app

# Create ASGI handler for Vercel
handler = Mangum(app, lifespan="off")
