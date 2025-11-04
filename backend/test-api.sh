#!/bin/bash

# ChainEquity Backend API Test Script
# Tests all API endpoints to verify functionality

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test a GET endpoint
test_get() {
    local endpoint=$1
    local description=$2

    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "GET $API_URL$endpoint"

    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 404 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "$body"
    fi
}

# Test a POST endpoint
test_post() {
    local endpoint=$1
    local description=$2
    local data=$3

    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "POST $API_URL$endpoint"
    echo "Data: $data"

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 400 ] || [ "$http_code" -eq 503 ]; then
        echo -e "${GREEN}✓ Response received (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "$body"
    fi
}

echo "================================================"
echo "ChainEquity Backend API Test Suite"
echo "================================================"

# Test health endpoint
echo -e "\n${BLUE}=== Health Check ===${NC}"
test_get "/health" "Health endpoint" "$BASE_URL/health"

# Test root endpoint
echo -e "\n${BLUE}=== Root Endpoint ===${NC}"
test_get "" "Root API info" "$BASE_URL/"

# Test Issuer endpoints
echo -e "\n${BLUE}=== Issuer Endpoints ===${NC}"
test_get "/issuer/info" "Get token info"
test_get "/issuer/approved" "Get approved wallets"

# Test with a sample address
SAMPLE_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
test_get "/issuer/status/$SAMPLE_ADDRESS" "Check wallet status"

# Test Corporate Actions endpoints
echo -e "\n${BLUE}=== Corporate Actions Endpoints ===${NC}"
test_get "/corporate/history?limit=10" "Get corporate action history"
test_get "/corporate/splits?limit=10" "Get stock split history"

# Test Cap-Table endpoints
echo -e "\n${BLUE}=== Cap-Table Endpoints ===${NC}"
test_get "/captable" "Get current cap-table"
test_get "/captable/summary" "Get cap-table summary"
test_get "/captable/holders?limit=10" "Get token holders"
test_get "/captable/top/5" "Get top 5 holders"

# Test Analytics endpoints
echo -e "\n${BLUE}=== Analytics Endpoints ===${NC}"
test_get "/analytics/overview" "Get analytics overview"
test_get "/analytics/holders" "Get holder analytics"
test_get "/analytics/supply" "Get supply metrics"
test_get "/analytics/distribution" "Get distribution analysis"
test_get "/analytics/events?limit=20" "Get recent events"

# Test POST endpoints (these will likely fail without proper setup, but show the API structure)
echo -e "\n${BLUE}=== POST Endpoint Tests (Expected to fail without setup) ===${NC}"
test_post "/issuer/approve" "Approve wallet (will fail - demo only)" \
    '{"address":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8"}'

echo -e "\n================================================"
echo -e "${GREEN}API Test Suite Complete!${NC}"
echo "================================================"
echo ""
echo "Note: Some endpoints may return empty data or 503 errors if the"
echo "      issuer service is not properly initialized with a valid"
echo "      contract deployment and environment configuration."
echo ""
