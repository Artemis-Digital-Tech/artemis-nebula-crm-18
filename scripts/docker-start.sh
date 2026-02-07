#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🐳 Iniciando banco de dados PostgreSQL com Docker Compose..."
echo ""

if [ ! -f "dumps/schema.sql" ]; then
  echo "❌ Arquivo dumps/schema.sql não encontrado!"
  echo "   Execute primeiro: ./scripts/create-dump.sh"
  exit 1
fi

echo "📋 Verificando Docker..."
if ! command -v docker &> /dev/null; then
  echo "❌ Docker não está instalado!"
  echo "   Instale o Docker Desktop: https://docs.docker.com/desktop"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "⚠️  Docker não está rodando. Tentando iniciar..."
  open -a Docker 2>/dev/null || true
  echo "   Aguarde alguns segundos para o Docker iniciar..."
  sleep 5
fi

echo ""
echo "🚀 Iniciando containers..."
docker-compose up -d

echo ""
echo "⏳ Aguardando banco de dados ficar pronto..."
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
    echo "✅ Banco de dados está pronto!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "   Aguardando... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Timeout aguardando banco de dados"
  exit 1
fi

echo ""
echo "📊 Informações de conexão:"
echo "   Host: localhost"
echo "   Porta: 54322"
echo "   Database: postgres"
echo "   Usuário: postgres"
echo "   Senha: postgres"
echo ""
echo "📝 Para ver os logs:"
echo "   docker-compose logs -f postgres"
echo ""
echo "🛑 Para parar os containers:"
echo "   docker-compose down"
echo ""
echo "✅ Pronto!"
