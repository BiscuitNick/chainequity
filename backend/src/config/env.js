/**
 * Environment configuration
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });
export const config = {
    // Server
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    // Network
    useLocalNetwork: process.env.USE_LOCAL_NETWORK === 'true' || false,
    localRpcUrl: process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545',
    // Alchemy
    alchemyApiKey: process.env.ALCHEMY_API_KEY || '',
    alchemyNetwork: process.env.ALCHEMY_NETWORK || 'polygon-amoy',
    // Contract
    tokenContractAddress: process.env.TOKEN_CONTRACT_ADDRESS || '',
    // Database
    databasePath: process.env.DATABASE_PATH || './data/chainequity.db',
};
// Validate required environment variables
export function validateConfig() {
    const required = ['ALCHEMY_API_KEY', 'TOKEN_CONTRACT_ADDRESS'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0 && config.nodeEnv !== 'development') {
        console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    }
}
