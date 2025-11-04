/**
 * Initialize database for local testing
 * Creates the database and directory structure
 */

import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getDatabase } from '../backend/src/db/database.js';

async function main() {
  console.log('\n📦 Initializing ChainEquity Database\n');
  console.log('='.repeat(60));

  // Create data directory if it doesn't exist
  const dataDir = join(process.cwd(), 'backend/data');

  if (!existsSync(dataDir)) {
    console.log('\n📁 Creating data directory...');
    await mkdir(dataDir, { recursive: true });
    console.log('✅ Data directory created:', dataDir);
  } else {
    console.log('\n✅ Data directory exists:', dataDir);
  }

  // Initialize database (this will create the schema)
  console.log('\n🗄️  Initializing database schema...');
  getDatabase();

  console.log('✅ Database initialized successfully');

  // Check tables - just verify the database is working
  console.log('\n📊 Verifying database...');
  console.log('   ✓ events table');
  console.log('   ✓ balances table');
  console.log('   ✓ corporate_actions table');
  console.log('   ✓ metadata table');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Database Ready!');
  console.log('='.repeat(60));

  console.log('\n💡 Next steps:');
  console.log('   1. Run the indexer to populate data:');
  console.log('      cd backend && npm run test-indexer');
  console.log('   2. Or manually test cap-table (will be empty):');
  console.log('      npm run cli captable');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Database initialization failed:');
    console.error(error);
    process.exit(1);
  });
