#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🛑 Parando containers Docker..."
docker-compose down

echo ""
echo "💡 Para remover os volumes (apagar dados):"
echo "   docker-compose down -v"
echo ""
echo "✅ Containers parados!"
