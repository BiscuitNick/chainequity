# ChainEquity - Quick Start with Docker

## 🚀 Get Running in 60 Seconds

### **Step 1: Start Everything**

```bash
docker-compose -f docker-compose.full.yml up
```

Wait for all services to start (~60-90 seconds first time)

### **Step 2: Access the Platform**

- **Frontend UI:** http://localhost:3050
- **Backend API:** http://localhost:4000
- **Blockchain RPC:** http://localhost:8545

### **Step 3: Connect Your Wallet**

Add this network to MetaMask:
- **Network Name:** ChainEquity Local
- **RPC URL:** http://localhost:8545
- **Chain ID:** 31337
- **Currency:** ETH

Import Hardhat test account:
```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### **That's It! Start Using ChainEquity!** 🎉

---

## 📦 What's Running?

✅ **Hardhat** - Local blockchain with contracts deployed
✅ **Backend** - REST API for token operations
✅ **Indexer** - Event monitoring service
✅ **Frontend** - React UI for token management

## 🛑 Stop Everything

```bash
docker-compose -f docker-compose.full.yml down
```

## 📖 Full Documentation

See [DOCKER_FULL_STACK.md](./DOCKER_FULL_STACK.md) for complete details.

---

**Problems?** Check logs:
```bash
docker-compose -f docker-compose.full.yml logs -f
```
