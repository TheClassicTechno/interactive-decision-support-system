#!/bin/bash
# Copy required dependencies into web/ directory for Vercel deployment
# This script runs from web/ directory (Vercel root), so go up one level to project root

set -e

# Get the script directory (web/) and project root (parent)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"
echo "Current directory: $(pwd)"

# Copy directories and files needed for Python backend
echo "Copying dependencies for Vercel deployment..."

# Copy api files from project root to web/api/
# We DON'T copy index.py from root - web/api/index.py is the canonical Vercel handler
if [ -d "$PROJECT_ROOT/api" ]; then
  mkdir -p "$SCRIPT_DIR/api"
  
  # Copy specific files we need (not index.py - keep web/api/index.py as handler)
  if [ -f "$PROJECT_ROOT/api/server.py" ]; then
    cp "$PROJECT_ROOT/api/server.py" "$SCRIPT_DIR/api/" 2>/dev/null || true
    echo "  Copied api/server.py"
  fi
  if [ -f "$PROJECT_ROOT/api/models.py" ]; then
    cp "$PROJECT_ROOT/api/models.py" "$SCRIPT_DIR/api/" 2>/dev/null || true
    echo "  Copied api/models.py"
  fi
  if [ -f "$PROJECT_ROOT/api/__init__.py" ]; then
    cp "$PROJECT_ROOT/api/__init__.py" "$SCRIPT_DIR/api/" 2>/dev/null || true
    echo "  Copied api/__init__.py"
  fi
  # Copy backend/ subdirectory if it exists
  if [ -d "$PROJECT_ROOT/api/backend" ]; then
    cp -r "$PROJECT_ROOT/api/backend" "$SCRIPT_DIR/api/" 2>/dev/null || true
    echo "  Copied api/backend/"
  fi
  echo "Copied api/ files"
else
  echo "WARNING: api/ directory not found at $PROJECT_ROOT/api"
fi

# Copy idss_agent directory
if [ -d "$PROJECT_ROOT/idss_agent" ]; then
  rm -rf "$SCRIPT_DIR/idss_agent" 2>/dev/null || true
  cp -r "$PROJECT_ROOT/idss_agent" "$SCRIPT_DIR/" 2>/dev/null || true
  echo "Copied idss_agent/"
else
  echo "WARNING: idss_agent/ directory not found at $PROJECT_ROOT/idss_agent"
fi

# Copy config directory
if [ -d "$PROJECT_ROOT/config" ]; then
  rm -rf "$SCRIPT_DIR/config" 2>/dev/null || true
  cp -r "$PROJECT_ROOT/config" "$SCRIPT_DIR/" 2>/dev/null || true
  echo "Copied config/"
else
  echo "WARNING: config/ directory not found at $PROJECT_ROOT/config"
fi

# Copy data directory (database files)
if [ -d "$PROJECT_ROOT/data" ]; then
  mkdir -p "$SCRIPT_DIR/data"
  cp -r "$PROJECT_ROOT/data"/* "$SCRIPT_DIR/data/" 2>/dev/null || true
  echo "Copied data/"
else
  echo "WARNING: data/ directory not found at $PROJECT_ROOT/data"
fi

# Copy requirements.txt from project root if it exists
if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
  cp "$PROJECT_ROOT/requirements.txt" "$SCRIPT_DIR/requirements.txt" 2>/dev/null || true
  echo "Copied requirements.txt"
fi

# Verify pyproject.toml exists (Vercel prefers this)
if [ -f "$SCRIPT_DIR/pyproject.toml" ]; then
  echo "pyproject.toml already exists in web/"
else
  echo "WARNING: pyproject.toml not found in web/ directory"
fi

echo ""
echo "Verifying copied files..."
echo "api/ exists: $([ -d "$SCRIPT_DIR/api" ] && echo 'YES' || echo 'NO')"
echo "api/server.py exists: $([ -f "$SCRIPT_DIR/api/server.py" ] && echo 'YES' || echo 'NO')"
echo "api/index.py exists: $([ -f "$SCRIPT_DIR/api/index.py" ] && echo 'YES' || echo 'NO')"
echo "idss_agent/ exists: $([ -d "$SCRIPT_DIR/idss_agent" ] && echo 'YES' || echo 'NO')"
echo "config/ exists: $([ -d "$SCRIPT_DIR/config" ] && echo 'YES' || echo 'NO')"
echo "data/ exists: $([ -d "$SCRIPT_DIR/data" ] && echo 'YES' || echo 'NO')"
echo "requirements.txt exists: $([ -f "$SCRIPT_DIR/requirements.txt" ] && echo 'YES' || echo 'NO')"
echo "pyproject.toml exists: $([ -f "$SCRIPT_DIR/pyproject.toml" ] && echo 'YES' || echo 'NO')"
echo ""
echo "Dependencies copy completed"
