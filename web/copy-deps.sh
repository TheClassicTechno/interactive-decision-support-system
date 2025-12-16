#!/bin/bash
# Copy required dependencies into web/ directory for Vercel deployment

set -e

# This script runs from web/ directory, so go up one level to project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT" || exit 1

# Copy directories and files needed for Python backend
echo "Copying dependencies for Vercel deployment..."

# Copy api directory
if [ -d "api" ]; then
  cp -r api web/ 2>/dev/null || true
  echo "Copied api/"
fi

# Copy idss_agent directory
if [ -d "idss_agent" ]; then
  cp -r idss_agent web/ 2>/dev/null || true
  echo "Copied idss_agent/"
fi

# Copy config directory
if [ -d "config" ]; then
  cp -r config web/ 2>/dev/null || true
  echo "Copied config/"
fi

# Copy data directory (database files)
if [ -d "data" ]; then
  mkdir -p web/data
  cp -r data/* web/data/ 2>/dev/null || true
  echo "Copied data/"
fi

# Copy requirements.txt
if [ -f "requirements.txt" ]; then
  cp requirements.txt web/ 2>/dev/null || true
  echo "Copied requirements.txt"
fi

echo "Dependencies copied successfully"
