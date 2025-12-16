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

# Copy api directory from project root to web/
if [ -d "$PROJECT_ROOT/api" ]; then
  cp -r "$PROJECT_ROOT/api" "$SCRIPT_DIR/" 2>/dev/null || true
  echo "Copied api/"
else
  echo "WARNING: api/ directory not found at $PROJECT_ROOT/api"
fi

# Copy idss_agent directory
if [ -d "$PROJECT_ROOT/idss_agent" ]; then
  cp -r "$PROJECT_ROOT/idss_agent" "$SCRIPT_DIR/" 2>/dev/null || true
  echo "Copied idss_agent/"
else
  echo "WARNING: idss_agent/ directory not found at $PROJECT_ROOT/idss_agent"
fi

# Copy config directory
if [ -d "$PROJECT_ROOT/config" ]; then
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

# Copy requirements.txt
if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
  cp "$PROJECT_ROOT/requirements.txt" "$SCRIPT_DIR/" 2>/dev/null || true
  echo "Copied requirements.txt"
else
  echo "WARNING: requirements.txt not found at $PROJECT_ROOT/requirements.txt"
fi

echo "Dependencies copy completed"
