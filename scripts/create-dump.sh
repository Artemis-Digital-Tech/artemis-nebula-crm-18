#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_DIR="$PROJECT_DIR/dumps"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$DUMP_DIR"

echo "📦 Criando dump do banco de dados Supabase..."
echo "📁 Diretório de destino: $DUMP_DIR"
echo ""

PROJECT_REF="lyqcsclmauwmzipjiazs"

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "⚠️  Variável de ambiente SUPABASE_DB_PASSWORD não encontrada."
  echo "💡 Você pode definir a senha de duas formas:"
  echo "   1. Exportar a variável: export SUPABASE_DB_PASSWORD='sua_senha'"
  echo "   2. Será solicitada durante a execução"
  echo ""
  read -sp "Digite a senha do banco de dados: " DB_PASSWORD
  echo ""
  SUPABASE_DB_PASSWORD="$DB_PASSWORD"
fi

DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

SCHEMA_FILE="${DUMP_DIR}/schema_${TIMESTAMP}.sql"
DATA_FILE="${DUMP_DIR}/data_${TIMESTAMP}.sql"
FULL_DUMP_FILE="${DUMP_DIR}/full_dump_${TIMESTAMP}.sql"

if command -v pg_dump &> /dev/null; then
  echo "✅ pg_dump encontrado. Usando pg_dump para criar o dump..."
  echo ""
  
  echo "🔄 Exportando schema (estrutura)..."
  if pg_dump "$DB_URL" --schema-only --no-owner --no-acl > "$SCHEMA_FILE" 2>&1; then
    if [ -f "$SCHEMA_FILE" ] && [ -s "$SCHEMA_FILE" ]; then
      echo "✅ Schema exportado: $SCHEMA_FILE ($(du -h "$SCHEMA_FILE" | cut -f1))"
    else
      echo "❌ Erro: Schema vazio ou não criado"
      exit 1
    fi
  else
    echo "❌ Erro ao exportar schema. Verifique a senha e a connection string."
    exit 1
  fi
  
  echo ""
  echo "🔄 Exportando dados..."
  if pg_dump "$DB_URL" --data-only --no-owner --no-acl > "$DATA_FILE" 2>&1; then
    if [ -f "$DATA_FILE" ] && [ -s "$DATA_FILE" ]; then
      echo "✅ Dados exportados: $DATA_FILE ($(du -h "$DATA_FILE" | cut -f1))"
    else
      echo "⚠️  Aviso: Arquivo de dados vazio (pode ser normal se não houver dados)"
    fi
  else
    echo "⚠️  Aviso: Não foi possível exportar dados separadamente."
  fi
  
  echo ""
  echo "🔄 Criando dump completo..."
  if pg_dump "$DB_URL" --no-owner --no-acl > "$FULL_DUMP_FILE" 2>&1; then
    if [ -f "$FULL_DUMP_FILE" ] && [ -s "$FULL_DUMP_FILE" ]; then
      echo "✅ Dump completo exportado: $FULL_DUMP_FILE ($(du -h "$FULL_DUMP_FILE" | cut -f1))"
    else
      echo "❌ Erro: Dump completo vazio ou não criado"
      exit 1
    fi
  else
    echo "❌ Erro ao criar dump completo."
    exit 1
  fi
  
else
  echo "❌ pg_dump não encontrado."
  echo ""
  echo "💡 Para instalar o pg_dump:"
  echo ""
  echo "   macOS:"
  echo "     brew install postgresql"
  echo ""
  echo "   Linux (Ubuntu/Debian):"
  echo "     sudo apt-get install postgresql-client"
  echo ""
  echo "   Ou use o Supabase CLI com Docker:"
  echo "     1. Instale Docker Desktop"
  echo "     2. Inicie o Docker"
  echo "     3. Execute: supabase db dump"
  echo ""
  exit 1
fi

echo ""
echo "📊 Resumo dos arquivos criados:"
[ -f "$SCHEMA_FILE" ] && [ -s "$SCHEMA_FILE" ] && echo "   ✅ Schema: $SCHEMA_FILE ($(du -h "$SCHEMA_FILE" | cut -f1))"
[ -f "$DATA_FILE" ] && [ -s "$DATA_FILE" ] && echo "   ✅ Dados: $DATA_FILE ($(du -h "$DATA_FILE" | cut -f1))"
[ -f "$FULL_DUMP_FILE" ] && [ -s "$FULL_DUMP_FILE" ] && echo "   ✅ Dump Completo: $FULL_DUMP_FILE ($(du -h "$FULL_DUMP_FILE" | cut -f1))"
echo ""
echo "✅ Dump concluído com sucesso!"
echo "📁 Arquivos salvos em: $DUMP_DIR"
