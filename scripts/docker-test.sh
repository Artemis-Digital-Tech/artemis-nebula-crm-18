#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🧪 Testando conexão com o banco de dados..."
echo ""

CONNECTION_STRING="postgresql://postgres:postgres@localhost:54322/postgres"

if command -v psql &> /dev/null; then
  echo "✅ psql encontrado. Testando conexão..."
  
  if PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT version();" &> /dev/null; then
    echo "✅ Conexão bem-sucedida!"
    echo ""
    echo "📊 Informações do banco:"
    PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT version();"
    echo ""
    echo "📋 Tabelas criadas:"
    PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "\dt" | head -20
  else
    echo "❌ Não foi possível conectar ao banco de dados"
    echo "   Verifique se o container está rodando: docker-compose ps"
    exit 1
  fi
else
  echo "⚠️  psql não encontrado. Testando via Docker..."
  
  if docker-compose exec -T postgres psql -U postgres -d postgres -c "SELECT version();" &> /dev/null; then
    echo "✅ Conexão bem-sucedida via Docker!"
    echo ""
    echo "📊 Informações do banco:"
    docker-compose exec -T postgres psql -U postgres -d postgres -c "SELECT version();"
    echo ""
    echo "📋 Tabelas criadas:"
    docker-compose exec -T postgres psql -U postgres -d postgres -c "\dt" | head -20
  else
    echo "❌ Não foi possível conectar ao banco de dados"
    echo "   Verifique se o container está rodando: docker-compose ps"
    exit 1
  fi
fi

echo ""
echo "✅ Teste concluído!"
