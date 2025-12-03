#!/bin/bash

# Quick Setup Script for Docs Navigator MCP - SUSE Edition

set -e

echo "======================================"
echo "Docs Navigator MCP - Quick Setup"
echo "======================================"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm found"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Setup environment
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env to configure your settings"
else
    echo "✅ .env file already exists"
fi

# Build project
echo ""
echo "Building project..."
npm run build

# Check for Ollama
echo ""
echo "Checking for Ollama..."
if command -v ollama &> /dev/null; then
    echo "✅ Ollama found"
    echo ""
    echo "Available Ollama models:"
    ollama list || true
    echo ""
    echo "To pull required models, run:"
    echo "  ollama pull llama3.2:latest"
    echo "  ollama pull nomic-embed-text"
else
    echo "⚠️  Ollama not found"
    echo "   For local AI models, install Ollama from: https://ollama.ai"
    echo "   Or configure OpenAI/Anthropic in .env"
fi

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Configure .env with your preferences"
echo "2. If using Ollama, pull required models:"
echo "   ollama pull llama3.2:latest"
echo "   ollama pull nomic-embed-text"
echo "3. Add to your MCP client config (see MCP_CLIENT_CONFIG.md)"
echo "4. Restart your MCP client"
echo ""
echo "For detailed instructions, see INSTALL.md"
echo ""
