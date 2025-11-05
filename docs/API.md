# ChainEquity API Documentation

Complete REST API documentation for the ChainEquity backend server.

**Base URL:** `http://localhost:3000` (development)

**Version:** 0.10.2

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Cap Table API](#cap-table-api)
- [Analytics API](#analytics-api)
- [Corporate Actions API](#corporate-actions-api)
- [Issuer API](#issuer-api)
- [Health Check](#health-check)

---

## Authentication

Currently, the API does not require authentication for read operations. Write operations (issuer endpoints) may require authentication in production deployments.

**Future Enhancement:**
```bash
Authorization: Bearer <API_KEY>
```

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

- **Window:** 15 minutes
- **Max Requests:** 100 per window
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

**Example Response (429 Too Many Requests):**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 5 minutes."
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "details": "Optional additional information"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Cap Table API

### Get Full Cap Table

Retrieves the complete capitalization table with all token holders.

**Endpoint:** `GET /api/captable`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Limit number of holders returned |

**Example Request:**
```bash
curl http://localhost:3000/api/captable
```

**Example Response:**
```json
{
  "totalSupply": "1000000000000000000000",
  "totalSupplyFormatted": "1000.0",
  "holderCount": 3,
  "splitMultiplier": 1.0,
  "generatedAt": 1699123456789,
  "blockNumber": 12345,
  "holders": [
    {
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "balance": "500000000000000000000",
      "balanceFormatted": "500.0",
      "ownershipPercentage": 50.0
    },
    {
      "address": "0x0000000000000000000000000000000000000002",
      "balance": "300000000000000000000",
      "balanceFormatted": "300.0",
      "ownershipPercentage": 30.0
    },
    {
      "address": "0x0000000000000000000000000000000000000003",
      "balance": "200000000000000000000",
      "balanceFormatted": "200.0",
      "ownershipPercentage": 20.0
    }
  ]
}
```

---

### Get Cap Table Summary

Retrieves summary statistics without individual holder details.

**Endpoint:** `GET /api/captable/summary`

**Example Request:**
```bash
curl http://localhost:3000/api/captable/summary
```

**Example Response:**
```json
{
  "holderCount": 25,
  "totalSupply": 1000000,
  "medianHolding": 15000,
  "averageHolding": 40000,
  "top10Concentration": 75.5,
  "hhiIndex": 0.1823,
  "splitMultiplier": 2.0,
  "generatedAt": "2025-11-04T15:30:00.000Z"
}
```

---

### Get Token Holders List

Retrieves a list of token holders with their balances.

**Endpoint:** `GET /api/captable/holders`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Max holders to return (default: 100, max: 1000) |

**Example Request:**
```bash
curl http://localhost:3000/api/captable/holders?limit=10
```

**Example Response:**
```json
[
  {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "balance": "500000.0",
    "percentage": 50.0
  },
  {
    "address": "0x0000000000000000000000000000000000000002",
    "balance": "300000.0",
    "percentage": 30.0
  }
]
```

---

### Get Specific Holder Information

Retrieves detailed information about a specific token holder.

**Endpoint:** `GET /api/captable/holder/:address`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| address | string | Ethereum address |

**Example Request:**
```bash
curl http://localhost:3000/api/captable/holder/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "balance": "500000000000000000000",
    "balanceFormatted": "500000.0",
    "ownershipPercentage": 50.0,
    "balanceHistory": [
      {
        "blockNumber": 12340,
        "transactionHash": "0xabc123...",
        "type": "mint",
        "amount": "500000000000000000000",
        "amountFormatted": "500000.0",
        "timestamp": 1699120000
      }
    ],
    "historyCount": 1
  }
}
```

**Example Response (Not Found):**
```json
{
  "error": "Not Found",
  "message": "Holder not found in cap-table",
  "data": {
    "address": "0x0000000000000000000000000000000000000999",
    "balance": "0",
    "ownershipPercentage": 0
  }
}
```

---

### Get Top Holders

Retrieves the top N token holders by balance.

**Endpoint:** `GET /api/captable/top/:limit`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Number of top holders to return (must be positive) |

**Example Request:**
```bash
curl http://localhost:3000/api/captable/top/5
```

**Example Response:**
```json
[
  {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "balance": "500000.0",
    "percentage": 50.0
  },
  {
    "address": "0x0000000000000000000000000000000000000002",
    "balance": "300000.0",
    "percentage": 30.0
  },
  {
    "address": "0x0000000000000000000000000000000000000003",
    "balance": "200000.0",
    "percentage": 20.0
  }
]
```

---

### Export Cap Table

Exports the cap table in CSV or JSON format.

**Endpoint:** `GET /api/captable/export`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | Export format: "csv" or "json" (default: json) |

**Example Request (CSV):**
```bash
curl http://localhost:3000/api/captable/export?format=csv -o captable.csv
```

**Example CSV Output:**
```csv
Address,Balance,Ownership %
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,500000.0,50.00
0x0000000000000000000000000000000000000002,300000.0,30.00
0x0000000000000000000000000000000000000003,200000.0,20.00
```

**Example Request (JSON):**
```bash
curl http://localhost:3000/api/captable/export?format=json -o captable.json
```

---

## Analytics API

### Get Analytics Overview

Retrieves a high-level overview of token analytics.

**Endpoint:** `GET /api/analytics/overview`

**Example Request:**
```bash
curl http://localhost:3000/api/analytics/overview
```

**Example Response:**
```json
{
  "totalSupply": "1000000.0",
  "holderCount": 250,
  "splitMultiplier": 2.0,
  "recentActivity": [
    {
      "type": "StockSplit",
      "blockNumber": 12345,
      "transactionHash": "0xabc123...",
      "timestamp": 1699123456
    },
    {
      "type": "SymbolChange",
      "blockNumber": 12340,
      "transactionHash": "0xdef456...",
      "timestamp": 1699120000
    }
  ]
}
```

---

### Get Holder Analytics

Retrieves detailed holder statistics and concentration metrics.

**Endpoint:** `GET /api/analytics/holders`

**Example Request:**
```bash
curl http://localhost:3000/api/analytics/holders
```

**Example Response:**
```json
{
  "holderCount": 250,
  "top10Concentration": 65.5,
  "hhiIndex": 0.1234,
  "topHolders": [
    {
      "rank": 1,
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "balance": "150000.0",
      "percentage": 15.0
    }
  ],
  "medianHolding": 2500.5,
  "averageHolding": 4000.0,
  "concentrationLevel": "moderate"
}
```

**Concentration Levels:**
- `low`: HHI < 0.15
- `moderate`: HHI 0.15-0.25
- `high`: HHI > 0.25

---

### Get Supply Analytics

Retrieves token supply metrics and statistics.

**Endpoint:** `GET /api/analytics/supply`

**Example Request:**
```bash
curl http://localhost:3000/api/analytics/supply
```

**Example Response:**
```json
{
  "totalSupply": 1000000,
  "splitMultiplier": 2,
  "effectiveSupply": 2000000
}
```

---

### Get Distribution Analytics

Retrieves token distribution analysis with decentralization metrics.

**Endpoint:** `GET /api/analytics/distribution`

**Example Request:**
```bash
curl http://localhost:3000/api/analytics/distribution
```

**Example Response:**
```json
{
  "holderCount": 250,
  "medianHolding": 2500.5,
  "averageHolding": 4000.0,
  "concentrationRatio": 0.1234,
  "giniCoefficient": 0.45,
  "decentralizationScore": 72.5
}
```

**Metrics Explained:**
- **concentrationRatio**: Herfindahl-Hirschman Index (0-1, lower is more distributed)
- **giniCoefficient**: Wealth inequality (0-1, 0 = perfect equality)
- **decentralizationScore**: Custom score (0-100, higher is more decentralized)

---

### Get Event Analytics

Retrieves recent blockchain events with optional pagination.

**Endpoint:** `GET /api/analytics/events`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Max events to return (default: 100, max: 1000) |
| offset | integer | No | Number of events to skip (default: 0) |

**Example Request:**
```bash
curl http://localhost:3000/api/analytics/events?limit=5&offset=0
```

**Example Response:**
```json
[
  {
    "event_type": "Transfer",
    "transaction_hash": "0xabc123...",
    "block_number": 12345,
    "timestamp": 1699123456,
    "from_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "to_address": "0x0000000000000000000000000000000000000002",
    "amount": "10000000000000000000"
  },
  {
    "event_type": "WalletApproved",
    "transaction_hash": "0xdef456...",
    "block_number": 12344,
    "timestamp": 1699123400,
    "from_address": null,
    "to_address": "0x0000000000000000000000000000000000000003",
    "amount": null
  }
]
```

---

## Corporate Actions API

### Get Corporate Action History

Retrieves the complete history of corporate actions.

**Endpoint:** `GET /api/corporate/history`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Max actions to return (default: 50, max: 500) |
| actionType | string | No | Filter by action type |

**Example Request:**
```bash
curl http://localhost:3000/api/corporate/history?limit=10
```

**Example Response:**
```json
[
  {
    "id": 3,
    "action_type": "StockSplit",
    "block_number": 12345,
    "transaction_hash": "0xabc123...",
    "old_value": "10000",
    "new_value": "20000",
    "timestamp": 1699123456,
    "date": "2025-11-04T15:30:56.000Z",
    "multiplierBasisPoints": 10000,
    "multiplierDecimal": 1.0,
    "newSplitMultiplierBasisPoints": 20000,
    "newSplitMultiplierDecimal": 2.0
  },
  {
    "id": 2,
    "action_type": "SymbolChange",
    "block_number": 12340,
    "transaction_hash": "0xdef456...",
    "old_value": "CEQT",
    "new_value": "CEQT2",
    "timestamp": 1699120000,
    "date": "2025-11-04T14:33:20.000Z",
    "oldSymbol": "CEQT",
    "newSymbol": "CEQT2"
  }
]
```

---

### Get Stock Split History

Retrieves all stock split events.

**Endpoint:** `GET /api/corporate/splits`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Max splits to return (default: 50, max: 500) |

**Example Request:**
```bash
curl http://localhost:3000/api/corporate/splits
```

**Example Response:**
```json
[
  {
    "id": 3,
    "action_type": "StockSplit",
    "blockNumber": 12345,
    "transactionHash": "0xabc123...",
    "old_value": "10000",
    "new_value": "20000",
    "multiplierBasisPoints": 10000,
    "multiplierDecimal": 1.0,
    "newSplitMultiplierBasisPoints": 20000,
    "newSplitMultiplierDecimal": 2.0,
    "timestamp": 1699123456,
    "date": "2025-11-04T15:30:56.000Z"
  }
]
```

---

### Get Symbol Change History

Retrieves all token symbol changes.

**Endpoint:** `GET /api/corporate/symbols`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Max changes to return (default: 50, max: 500) |

**Example Request:**
```bash
curl http://localhost:3000/api/corporate/symbols
```

**Example Response:**
```json
[
  {
    "id": 2,
    "action_type": "SymbolChange",
    "blockNumber": 12340,
    "transactionHash": "0xdef456...",
    "oldSymbol": "CEQT",
    "newSymbol": "CEQT2",
    "old_value": "CEQT",
    "new_value": "CEQT2",
    "timestamp": 1699120000,
    "date": "2025-11-04T14:33:20.000Z"
  }
]
```

---

### Get Name Change History

Retrieves all token name changes.

**Endpoint:** `GET /api/corporate/names`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Max changes to return (default: 50, max: 500) |

**Example Request:**
```bash
curl http://localhost:3000/api/corporate/names
```

**Example Response:**
```json
[
  {
    "id": 1,
    "action_type": "NameChange",
    "blockNumber": 12335,
    "transactionHash": "0xghi789...",
    "oldName": "ChainEquity Token",
    "newName": "ChainEquity Securities",
    "old_value": "ChainEquity Token",
    "new_value": "ChainEquity Securities",
    "timestamp": 1699110000,
    "date": "2025-11-04T11:46:40.000Z"
  }
]
```

---

## Issuer API

⚠️ **Note:** These endpoints require issuer privileges and should be protected with authentication in production.

### Execute Stock Split

Executes a stock split on the contract.

**Endpoint:** `POST /api/corporate/split`

**Request Body:**
```json
{
  "multiplierBasisPoints": 20000
}
```

OR

```json
{
  "multiplier": 2.0
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/corporate/split \
  -H "Content-Type: application/json" \
  -d '{"multiplier": 2.0}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Stock split executed successfully",
  "data": {
    "multiplierBasisPoints": 20000,
    "multiplierDecimal": 2.0,
    "previousMultiplierBasisPoints": 10000,
    "previousMultiplierDecimal": 1.0,
    "newMultiplierBasisPoints": 20000,
    "newMultiplierDecimal": 2.0,
    "transactionHash": "0xabc123...",
    "blockNumber": 12345,
    "gasUsed": 30246
  }
}
```

---

### Update Token Symbol

Updates the token's trading symbol.

**Endpoint:** `POST /api/corporate/symbol`

**Request Body:**
```json
{
  "newSymbol": "CEQT2"
}
```

**Validation:**
- Must be 3-5 uppercase letters
- Regex: `^[A-Z]{3,5}$`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/corporate/symbol \
  -H "Content-Type: application/json" \
  -d '{"newSymbol": "CEQT2"}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Token symbol updated successfully",
  "data": {
    "oldSymbol": "CEQT",
    "newSymbol": "CEQT2",
    "transactionHash": "0xdef456...",
    "blockNumber": 12346,
    "gasUsed": 33421
  }
}
```

---

### Update Token Name

Updates the token's name.

**Endpoint:** `POST /api/corporate/name`

**Request Body:**
```json
{
  "newName": "ChainEquity Securities"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/corporate/name \
  -H "Content-Type: application/json" \
  -d '{"newName": "ChainEquity Securities"}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Token name updated successfully",
  "data": {
    "oldName": "ChainEquity Token",
    "newName": "ChainEquity Securities",
    "transactionHash": "0xghi789...",
    "blockNumber": 12347,
    "gasUsed": 33550
  }
}
```

---

## Health Check

### Server Health Check

Checks if the server is running and responsive.

**Endpoint:** `GET /health`

**Example Request:**
```bash
curl http://localhost:3000/health
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-04T15:30:00.000Z"
}
```

---

## Pagination

For endpoints that return large datasets, use pagination parameters:

```bash
# Get first page (default)
curl http://localhost:3000/api/captable/holders?limit=100

# Get second page
curl http://localhost:3000/api/captable/holders?limit=100&offset=100

# Get third page
curl http://localhost:3000/api/captable/holders?limit=100&offset=200
```

---

## Filtering

Some endpoints support filtering by type:

```bash
# Get only stock splits
curl http://localhost:3000/api/corporate/history?actionType=StockSplit

# Get only symbol changes
curl http://localhost:3000/api/corporate/history?actionType=SymbolChange
```

---

## Response Times

Typical response times (localhost):

| Endpoint Type | Avg Response Time |
|---------------|-------------------|
| Cap Table | 50-100ms |
| Analytics | 20-50ms |
| Corporate Actions | 10-30ms |
| Health Check | <5ms |

---

## CORS Configuration

The API allows cross-origin requests with the following configuration:

```javascript
{
  origin: '*',  // Configure appropriately for production
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

---

## WebSocket Support

**Status:** Not currently implemented

**Future Enhancement:** Real-time updates for cap table changes, new events, and corporate actions via WebSocket connections.

```javascript
// Future implementation
const socket = new WebSocket('ws://localhost:3000/ws');

socket.on('newTransfer', (data) => {
  console.log('New transfer:', data);
});

socket.on('stockSplit', (data) => {
  console.log('Stock split executed:', data);
});
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Get cap table
const capTable = await axios.get(`${API_BASE_URL}/captable`);
console.log(`Total Holders: ${capTable.data.holderCount}`);

// Get top 10 holders
const topHolders = await axios.get(`${API_BASE_URL}/captable/top/10`);
topHolders.data.forEach((holder, i) => {
  console.log(`${i + 1}. ${holder.address}: ${holder.percentage}%`);
});

// Get analytics
const analytics = await axios.get(`${API_BASE_URL}/analytics/overview`);
console.log(`Split Multiplier: ${analytics.data.splitMultiplier}x`);
```

### Python

```python
import requests

API_BASE_URL = 'http://localhost:3000/api'

# Get cap table
response = requests.get(f'{API_BASE_URL}/captable')
cap_table = response.json()
print(f"Total Holders: {cap_table['holderCount']}")

# Get top 10 holders
response = requests.get(f'{API_BASE_URL}/captable/top/10')
top_holders = response.json()
for i, holder in enumerate(top_holders, 1):
    print(f"{i}. {holder['address']}: {holder['percentage']}%")
```

### cURL

```bash
# Get cap table summary
curl -X GET http://localhost:3000/api/captable/summary | jq

# Get holder info
curl -X GET http://localhost:3000/api/captable/holder/0x123... | jq

# Export to CSV
curl -X GET "http://localhost:3000/api/captable/export?format=csv" -o captable.csv

# Get corporate actions
curl -X GET http://localhost:3000/api/corporate/history?limit=5 | jq
```

---

## Testing the API

Use the provided Postman collection or create test scripts:

```bash
# Test all endpoints
npm run test:api

# Test specific endpoint
curl http://localhost:3000/health
```

---

## API Versioning

**Current Version:** v1 (implicit)

Future versions will use URL versioning:
```
/api/v1/captable
/api/v2/captable
```

---

## Support

For API issues or questions:
- **GitHub Issues**: [Report bugs](https://github.com/yourusername/chainequity/issues)
- **Documentation**: [Full docs](https://github.com/yourusername/chainequity/docs)

---

**Last Updated:** 2025-11-04
**Version:** 0.10.2
