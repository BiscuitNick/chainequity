# ChainEquity - Docker Deployment Guide

This guide explains how to deploy ChainEquity backend services using Docker and Docker Compose.

## Architecture

The Docker deployment consists of two main services:

1. **API Server** (`chainequity-api`): Express REST API for token operations
2. **Event Indexer** (`chainequity-indexer`): Blockchain event monitoring service

Both services share a persistent SQLite database via a named Docker volume.

## Prerequisites

- Docker 20.10+ installed
- Docker Compose V2 installed
- Deployed ChainEquityToken contract on Polygon Amoy (or other network)
- Alchemy API key
- Wallet with private key for issuer operations

## Quick Start

### 1. Environment Configuration

Copy the environment template:

```bash
cp .env.docker .env
```

Edit `.env` with your actual values:

```bash
# Required values
ALCHEMY_API_KEY=your_actual_alchemy_key_here
TOKEN_CONTRACT_ADDRESS=0x... # Your deployed contract address
ISSUER_PRIVATE_KEY=0x... # Private key for signing transactions
```

### 2. Build and Start Services

```bash
# Build and start all services in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f indexer
```

### 3. Verify Services

Check API health:
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T...",
  "uptime": 123.45
}
```

Check API endpoints:
```bash
curl http://localhost:4000/
```

### 4. Test Token Operations

```bash
# Get cap table
curl http://localhost:4000/api/captable

# Get token analytics
curl http://localhost:4000/api/analytics

# Get event history
curl http://localhost:4000/api/events
```

## Service Management

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

### Restart Services

```bash
docker-compose restart
```

### View Service Status

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f indexer

# Last 100 lines
docker-compose logs --tail=100
```

### Execute Commands in Container

```bash
# Access API container shell
docker-compose exec api sh

# Access indexer container shell
docker-compose exec indexer sh
```

## Database Management

### Backup Database

```bash
# Copy database from volume to local filesystem
docker run --rm -v chainequity-db-data:/data -v $(pwd):/backup \
  alpine cp /data/chainequity.db /backup/chainequity-backup.db
```

### Restore Database

```bash
# Copy backup database to volume
docker run --rm -v chainequity-db-data:/data -v $(pwd):/backup \
  alpine cp /backup/chainequity-backup.db /data/chainequity.db
```

### Inspect Database

```bash
# Access database with sqlite3
docker-compose exec api sh
# Inside container:
cd /app/data
sqlite3 chainequity.db
```

### View Database Location

```bash
docker volume inspect chainequity-db-data
```

## Troubleshooting

### Port Already in Use

If port 4000 is already in use, edit `docker-compose.yml`:

```yaml
services:
  api:
    ports:
      - "4001:4000"  # Change 4001 to any available port
```

### Container Won't Start

Check logs:
```bash
docker-compose logs api
docker-compose logs indexer
```

Common issues:
- Missing environment variables
- Invalid contract address
- Invalid private key format
- Insufficient funds in issuer wallet

### Database Permission Issues

Reset volume permissions:
```bash
docker-compose down
docker volume rm chainequity-db-data
docker-compose up -d
```

### Health Check Failing

```bash
# Check if API is responding
docker-compose exec api wget -O- http://localhost:4000/health

# Check process inside container
docker-compose exec api ps aux
```

## Production Deployment

### Environment Variables

For production, set these additional variables in `.env`:

```bash
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

### Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Logging Configuration

Use a logging driver for production:

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Auto-restart on Failure

Services are already configured with `restart: unless-stopped`, which ensures:
- Containers restart automatically on failure
- Containers don't restart if manually stopped
- Containers start automatically after system reboot

## Cloud Deployment Options

### AWS ECS

1. Push image to ECR:
```bash
docker-compose build
docker tag chainequity-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/chainequity-api
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/chainequity-api
```

2. Create ECS task definition with environment variables
3. Create ECS service with persistent volume for database

### Google Cloud Run

```bash
# Build and push to GCR
docker-compose build
docker tag chainequity-api gcr.io/<project>/chainequity-api
docker push gcr.io/<project>/chainequity-api

# Deploy
gcloud run deploy chainequity-api \
  --image gcr.io/<project>/chainequity-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars ALCHEMY_API_KEY=xxx,TOKEN_CONTRACT_ADDRESS=0x...
```

### Digital Ocean App Platform

Create `app.yaml`:

```yaml
name: chainequity
services:
  - name: api
    github:
      repo: your-org/chainequity
      branch: main
    dockerfile_path: backend/Dockerfile
    envs:
      - key: ALCHEMY_API_KEY
        scope: RUN_TIME
        value: ${ALCHEMY_API_KEY}
```

## Monitoring

### Health Checks

The API service includes a built-in health check endpoint:
- Endpoint: `GET /health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

### Prometheus Metrics (Future Enhancement)

To add Prometheus metrics, install `prom-client`:

```bash
npm install prom-client
```

Add metrics endpoint to `server.ts` and configure Prometheus scraping.

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive keys
2. **Use secrets management** in production (AWS Secrets Manager, etc.)
3. **Rotate private keys** regularly
4. **Use least-privilege keys** - Issuer key should only have necessary permissions
5. **Enable firewall** - Only expose port 4000 to trusted sources
6. **Use HTTPS** - Put services behind reverse proxy with SSL
7. **Regular updates** - Keep Docker images and dependencies updated

## Network Configuration

Services communicate via a dedicated bridge network `chainequity-network`. This provides:
- Service isolation
- DNS-based service discovery
- Automatic load balancing (if scaled)

## Scaling

To scale the API service:

```bash
docker-compose up -d --scale api=3
```

Note: Indexer should NOT be scaled (only run 1 instance to avoid duplicate event processing).

For load balancing multiple API instances, use nginx or a cloud load balancer.

## Cleanup

Remove all containers and volumes:

```bash
# Stop and remove containers, networks
docker-compose down

# Also remove volumes (WARNING: deletes database)
docker-compose down -v

# Remove Docker images
docker-compose down --rmi all
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ChainEquity Backend README](./backend/README.md)
- [ChainEquity Architecture](./ARCHITECTURE.md)

## Support

For issues or questions:
- Create an issue on GitHub
- Check existing documentation
- Review Docker logs for error details
