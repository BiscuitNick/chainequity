# ChainEquity - Complete Docker Stack

Run the entire ChainEquity platform with a single command!

## 🚀 Quick Start

### **One Command to Rule Them All:**

```bash
docker-compose -f docker-compose.full.yml up
```

That's it! This will start:
- ✅ **Hardhat Local Blockchain** on port 8545
- ✅ **Smart Contracts** automatically deployed
- ✅ **Backend API** on port 4000
- ✅ **Event Indexer** watching blockchain
- ✅ **Frontend UI** on port 3000

### **Access the Application:**

```bash
# Frontend (React/Next.js)
http://localhost:3000

# Backend API
http://localhost:4000

# Hardhat RPC
http://localhost:8545
```

## 📋 What Happens on Startup

1. **Hardhat Node** starts and creates a local blockchain
2. **Contracts** are compiled and deployed automatically
3. **Contract address** is saved and shared with other services
4. **Backend API** connects to Hardhat and starts serving
5. **Indexer** begins watching for blockchain events
6. **Frontend** loads and connects to API and blockchain

**Total startup time:** ~60-90 seconds

## 🛠️ Management Commands

### Start Everything
```bash
docker-compose -f docker-compose.full.yml up
```

### Start in Background (Detached)
```bash
docker-compose -f docker-compose.full.yml up -d
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.full.yml logs -f

# Specific service
docker-compose -f docker-compose.full.yml logs -f hardhat
docker-compose -f docker-compose.full.yml logs -f api
docker-compose -f docker-compose.full.yml logs -f indexer
docker-compose -f docker-compose.full.yml logs -f frontend
```

### Check Status
```bash
docker-compose -f docker-compose.full.yml ps
```

### Stop Everything
```bash
docker-compose -f docker-compose.full.yml down
```

### Stop and Remove All Data
```bash
# WARNING: This deletes blockchain data and database!
docker-compose -f docker-compose.full.yml down -v
```

### Restart a Single Service
```bash
docker-compose -f docker-compose.full.yml restart api
docker-compose -f docker-compose.full.yml restart frontend
```

### Rebuild After Code Changes
```bash
docker-compose -f docker-compose.full.yml down
docker-compose -f docker-compose.full.yml build --no-cache
docker-compose -f docker-compose.full.yml up
```

## 🔍 Service Details

### Hardhat (Blockchain)
- **Port:** 8545
- **Container:** chainequity-hardhat
- **Purpose:** Local Ethereum blockchain
- **Features:**
  - Pre-funded test accounts
  - Instant mining
  - Deterministic addresses
  - Auto-deploys ChainEquityToken contract

### Backend API
- **Port:** 4000
- **Container:** chainequity-api
- **Endpoints:**
  - `/health` - Health check
  - `/api/issuer` - Token operations
  - `/api/corporate` - Corporate actions
  - `/api/captable` - Cap table
  - `/api/analytics` - Analytics
  - `/api/events` - Event history

### Indexer
- **Container:** chainequity-indexer
- **Purpose:** Watches blockchain for events
- **Features:**
  - Real-time event processing
  - Database synchronization
  - Historical event indexing

### Frontend
- **Port:** 3000
- **Container:** chainequity-frontend
- **Features:**
  - Token management UI
  - Wallet connection
  - Transaction history
  - Cap table visualization

## 🔧 Configuration

### Environment Variables

Create `.env` in project root (or use `.env.docker.full` as template):

```bash
# Hardhat Test Account (safe for local development)
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ISSUER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Optional: for production features
ALCHEMY_API_KEY=your_key_here
WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Hardhat Test Accounts

The local Hardhat node comes with 20 pre-funded test accounts:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

... (18 more accounts)
```

Use these in MetaMask or your wallet to interact with the local blockchain.

## 🌐 Network Configuration

### Docker Internal Network

Services communicate using service names:
- `http://hardhat:8545` - Blockchain RPC
- `http://api:4000` - Backend API
- `http://frontend:3000` - Frontend

### From Host Machine

Access services via localhost:
- `http://localhost:8545` - Blockchain RPC
- `http://localhost:4000` - Backend API
- `http://localhost:3000` - Frontend

### MetaMask Configuration

Add local network to MetaMask:
- **Network Name:** ChainEquity Local
- **RPC URL:** http://localhost:8545
- **Chain ID:** 31337
- **Currency Symbol:** ETH

## 📊 Monitoring

### Check if Everything is Running

```bash
# All services should show "Up" status
docker-compose -f docker-compose.full.yml ps

# Health checks
curl http://localhost:4000/health        # API health
curl http://localhost:8545                # Hardhat RPC
curl http://localhost:3000                # Frontend
```

### View Real-Time Logs

```bash
# Watch all services
docker-compose -f docker-compose.full.yml logs -f

# Watch blockchain transactions
docker-compose -f docker-compose.full.yml logs -f hardhat

# Watch API requests
docker-compose -f docker-compose.full.yml logs -f api
```

## 🧪 Testing the Stack

### 1. Check Contract Deployment

```bash
# View deployment logs
docker-compose -f docker-compose.full.yml logs hardhat | grep "Contract deployed"

# Get contract address
docker-compose -f docker-compose.full.yml exec api \
  cat /app/.env | grep TOKEN_CONTRACT_ADDRESS
```

### 2. Test Backend API

```bash
# Health check
curl http://localhost:4000/health

# Get cap table
curl http://localhost:4000/api/captable

# Get analytics
curl http://localhost:4000/api/analytics
```

### 3. Test Frontend

Open browser to http://localhost:3000 and:
- Connect your wallet (MetaMask)
- View token information
- Check cap table
- Try minting (if you're the owner)

## 🐛 Troubleshooting

### Ports Already in Use

If you get port binding errors:

```bash
# Check what's using the ports
lsof -i :3000
lsof -i :4000
lsof -i :8545

# Kill processes
kill -9 <PID>
```

Or change ports in `docker-compose.full.yml`:

```yaml
ports:
  - "3001:3000"  # Change 3000 to 3001
  - "4001:4000"  # Change 4000 to 4001
  - "8546:8545"  # Change 8545 to 8546
```

### Services Won't Start

```bash
# View detailed logs
docker-compose -f docker-compose.full.yml logs

# Rebuild everything from scratch
docker-compose -f docker-compose.full.yml down -v
docker-compose -f docker-compose.full.yml build --no-cache
docker-compose -f docker-compose.full.yml up
```

### Contract Not Deploying

```bash
# Check Hardhat logs
docker-compose -f docker-compose.full.yml logs hardhat

# Manually trigger deployment
docker-compose -f docker-compose.full.yml exec hardhat \
  npx hardhat run scripts/deploy-production.ts --network localhost
```

### Database Issues

```bash
# Reset database
docker-compose -f docker-compose.full.yml down
docker volume rm chainequity-db-data
docker-compose -f docker-compose.full.yml up
```

### Frontend Can't Connect

Check environment variables:

```bash
docker-compose -f docker-compose.full.yml exec frontend env | grep NEXT_PUBLIC
```

Should show:
- `NEXT_PUBLIC_API_URL=http://api:4000`
- `NEXT_PUBLIC_CONTRACT_ADDRESS=0x...`

## 🔄 Development Workflow

### Making Code Changes

1. **Stop the stack:**
   ```bash
   docker-compose -f docker-compose.full.yml down
   ```

2. **Make your changes** to code

3. **Rebuild affected services:**
   ```bash
   # Rebuild everything
   docker-compose -f docker-compose.full.yml build

   # Or rebuild specific service
   docker-compose -f docker-compose.full.yml build api
   docker-compose -f docker-compose.full.yml build frontend
   ```

4. **Restart:**
   ```bash
   docker-compose -f docker-compose.full.yml up
   ```

### Hot Reload (Development Mode)

For faster development, you can mount source code:

```yaml
# Add to service in docker-compose.full.yml
volumes:
  - ./backend/src:/app/src  # Backend hot reload
  - ./frontend/app:/app/app # Frontend hot reload
```

## 📦 Data Persistence

### Volumes

Data is persisted in Docker volumes:

- `chainequity-db-data` - SQLite database
- `chainequity-hardhat-data` - Blockchain state
- `chainequity-contract-addresses` - Deployed addresses

### Backup Data

```bash
# Backup database
docker run --rm -v chainequity-db-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/database-backup.tar.gz -C /data .

# Restore database
docker run --rm -v chainequity-db-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/database-backup.tar.gz -C /data
```

## 🚀 Production Deployment

This setup is for **local development only**. For production:

1. Use testnet/mainnet instead of Hardhat
2. Use production environment variables
3. Enable SSL/TLS
4. Use proper secret management
5. Set up monitoring and logging
6. Configure backups

See `DOCKER_DEPLOYMENT.md` for production setup.

## 💡 Tips

- **First startup takes longer** - Containers need to build and download dependencies
- **Subsequent starts are faster** - Docker caches layers
- **Clean slate:** Use `docker-compose down -v` to start fresh
- **Save resources:** Stop services when not in use
- **Monitor logs:** Keep logs open to see what's happening

## 🆘 Support

Having issues? Check:
1. Docker daemon is running
2. Ports 3000, 4000, 8545 are available
3. You have sufficient disk space
4. Docker has enough memory allocated (4GB+ recommended)

Still stuck? Check logs:
```bash
docker-compose -f docker-compose.full.yml logs
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [ChainEquity Architecture](./ARCHITECTURE.md)



  Commands for fresh starts:

  1. Quick restart (keeps volumes):
  docker-compose -f docker-compose.full.yml down
  docker-compose -f docker-compose.full.yml up
  2. Fresh start (clears all data):
  docker-compose -f docker-compose.full.yml down -v
  docker-compose -f docker-compose.full.yml up

  You're now ready for a completely fresh Docker start!