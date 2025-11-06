#!/usr/bin/env node
/**
 * ChainEquity CLI Tool
 *
 * Command-line interface for token management operations.
 *
 * Usage:
 *   chainequity <command> [options]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { IssuerService } from './backend/src/services/issuer.service.js';
import { CapTableService } from './backend/src/services/captable.service.js';
import fs from 'fs';

// Load environment
dotenv.config();

const program = new Command();

// CLI Configuration
program.name('chainequity').description('ChainEquity Token Management CLI').version('1.0.0');

// Helper: Get network configuration
function getNetworkConfig(network: string = 'localhost') {
  const configs: Record<string, { rpcUrl: string; wsUrl?: string }> = {
    localhost: {
      rpcUrl: 'http://127.0.0.1:8545',
    },
    polygonAmoy: {
      rpcUrl: process.env.ALCHEMY_API_KEY
        ? `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : '',
      wsUrl: process.env.ALCHEMY_API_KEY
        ? `wss://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : '',
    },
  };

  return configs[network];
}

// Helper: Create issuer service
function createIssuerService(network: string = 'localhost'): IssuerService {
  const networkConfig = getNetworkConfig(network);

  if (!networkConfig.rpcUrl) {
    throw new Error(`Network ${network} not configured or missing ALCHEMY_API_KEY`);
  }

  const contractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('TOKEN_CONTRACT_ADDRESS not set in .env');
  }

  const privateKey = process.env.ISSUER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ISSUER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not set in .env');
  }

  return new IssuerService({
    rpcUrl: networkConfig.rpcUrl,
    contractAddress,
    privateKey,
  });
}

// ============================================================================
// WALLET COMMANDS
// ============================================================================

const wallet = program.command('wallet').description('Wallet allowlist management');

wallet
  .command('approve <address>')
  .description('Approve a wallet to send/receive tokens')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (address: string, options) => {
    const spinner = ora('Approving wallet...').start();

    try {
      const issuer = createIssuerService(options.network);
      const receipt = await issuer.approveWallet(address);

      spinner.succeed(chalk.green('Wallet approved!'));
      console.log(chalk.gray('  Address:'), address);
      console.log(chalk.gray('  TX Hash:'), receipt.hash);
      console.log(chalk.gray('  Block:'), receipt.blockNumber);
      console.log(chalk.gray('  Gas Used:'), receipt.gasUsed);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to approve wallet'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

wallet
  .command('revoke <address>')
  .description('Revoke wallet approval')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (address: string, options) => {
    const spinner = ora('Revoking wallet...').start();

    try {
      const issuer = createIssuerService(options.network);
      const receipt = await issuer.revokeWallet(address);

      spinner.succeed(chalk.green('Wallet revoked!'));
      console.log(chalk.gray('  Address:'), address);
      console.log(chalk.gray('  TX Hash:'), receipt.hash);
      console.log(chalk.gray('  Block:'), receipt.blockNumber);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to revoke wallet'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

wallet
  .command('status <address>')
  .description('Check wallet approval status')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (address: string, options) => {
    try {
      const issuer = createIssuerService(options.network);
      const isApproved = await issuer.isWalletApproved(address);

      console.log(chalk.gray('Address:'), address);
      console.log(
        chalk.gray('Status:'),
        isApproved ? chalk.green('✓ Approved') : chalk.red('✗ Not Approved')
      );
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

wallet
  .command('list')
  .description('List all approved wallets')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (options) => {
    const spinner = ora('Fetching approved wallets...').start();

    try {
      const issuer = createIssuerService(options.network);
      const wallets = await issuer.getApprovedWallets();

      spinner.stop();

      if (wallets.length === 0) {
        console.log(chalk.yellow('No approved wallets found'));
        return;
      }

      console.log(chalk.bold(`\n${wallets.length} Approved Wallets:\n`));

      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Address')],
      });

      wallets.forEach((wallet, index) => {
        table.push([index + 1, wallet]);
      });

      console.log(table.toString());
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch wallets'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// TOKEN COMMANDS
// ============================================================================

const token = program.command('token').description('Token operations');

token
  .command('mint <to> <amount>')
  .description('Mint tokens to an address')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (to: string, amount: string, options) => {
    const spinner = ora(`Minting ${amount} tokens...`).start();

    try {
      const issuer = createIssuerService(options.network);
      const receipt = await issuer.mintTokens(to, amount);

      spinner.succeed(chalk.green('Tokens minted!'));
      console.log(chalk.gray('  To:'), to);
      console.log(chalk.gray('  Amount:'), amount);
      console.log(chalk.gray('  TX Hash:'), receipt.hash);
      console.log(chalk.gray('  Gas Used:'), receipt.gasUsed);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to mint tokens'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

token
  .command('balance <address>')
  .description('Check token balance')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (address: string, options) => {
    const spinner = ora('Fetching balance...').start();

    try {
      const issuer = createIssuerService(options.network);
      const balance = await issuer.getBalance(address);
      const tokenInfo = await issuer.getTokenInfo();

      spinner.stop();

      console.log(chalk.gray('Address:'), address);
      console.log(chalk.bold('Balance:'), chalk.green(balance), tokenInfo.symbol);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch balance'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

token
  .command('info')
  .description('Get token information')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (options) => {
    const spinner = ora('Fetching token info...').start();

    try {
      const issuer = createIssuerService(options.network);
      const info = await issuer.getTokenInfo();
      const supply = await issuer.getTotalSupply();
      const multiplier = await issuer.getSplitMultiplier();

      spinner.stop();

      console.log(chalk.bold('\nToken Information:\n'));
      console.log(chalk.gray('  Name:'), info.name);
      console.log(chalk.gray('  Symbol:'), info.symbol);
      console.log(chalk.gray('  Decimals:'), info.decimals);
      console.log(chalk.gray('  Total Supply:'), chalk.green(supply), info.symbol);
      console.log(chalk.gray('  Split Multiplier:'), multiplier + 'x');
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch token info'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// CORPORATE ACTIONS
// ============================================================================

const corporate = program.command('corporate').description('Corporate actions');

corporate
  .command('split <multiplier>')
  .description('Execute stock split (forward: >1, reverse: <1, e.g., 2, 7, 0.1, 0.5)')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (multiplier: string, options) => {
    const mult = parseFloat(multiplier);

    // Validate input
    if (isNaN(mult) || mult <= 0) {
      console.error(chalk.red('Multiplier must be a positive number'));
      console.log(chalk.gray('  Forward split examples: 2 (2-for-1), 7 (7-for-1)'));
      console.log(chalk.gray('  Reverse split examples: 0.1 (1-for-10), 0.5 (1-for-2)'));
      process.exit(1);
    }

    if (mult === 1) {
      console.error(chalk.red('Multiplier of 1 has no effect'));
      process.exit(1);
    }

    // Determine split type and description
    let splitDescription: string;
    if (mult > 1) {
      splitDescription = `${mult}-for-1 forward split`;
    } else {
      const ratio = Math.round(1 / mult);
      splitDescription = `1-for-${ratio} reverse split (${mult}x)`;
    }

    // Convert to basis points (10,000 = 1.0x)
    const basisPoints = Math.round(mult * 10000);

    console.log(chalk.gray('  Multiplier:'), mult + 'x');
    console.log(chalk.gray('  Basis Points:'), basisPoints);

    const spinner = ora(`Executing ${splitDescription}...`).start();

    try {
      const issuer = createIssuerService(options.network);
      const receipt = await issuer.executeSplit(basisPoints);

      spinner.succeed(chalk.green(`${splitDescription} executed!`));
      console.log(chalk.gray('  All balances multiplied by'), mult + 'x');
      console.log(chalk.gray('  TX Hash:'), receipt.hash);
      console.log(chalk.gray('  Gas Used:'), receipt.gasUsed);

      console.log(chalk.yellow('\n💡 Tip: Run indexer and view updated cap-table:'));
      console.log(chalk.gray('  cd backend && npm run test-indexer-local && cd ..'));
      console.log(chalk.gray('  npm run cli captable'));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to execute split'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

corporate
  .command('history')
  .description('View corporate action history (splits, symbol changes)')
  .option('-t, --type <type>', 'Filter by type (StockSplit, SymbolChange, NameChange)')
  .action(async (options) => {
    const spinner = ora('Fetching corporate action history...').start();

    try {
      const capTableService = new CapTableService();
      const db = (capTableService as any).db;

      let actions;
      if (options.type) {
        actions = db.getCorporateActionsByType(options.type);
      } else {
        actions = db.getAllCorporateActions();
      }

      spinner.stop();

      if (actions.length === 0) {
        console.log(chalk.yellow('No corporate actions found'));
        return;
      }

      console.log(chalk.bold(`\n${actions.length} Corporate Actions:\n`));

      const table = new Table({
        head: [
          chalk.cyan('Date'),
          chalk.cyan('Type'),
          chalk.cyan('Details'),
          chalk.cyan('Block'),
          chalk.cyan('TX Hash'),
        ],
      });

      for (const action of actions) {
        const date = action.timestamp ? new Date(action.timestamp * 1000).toLocaleString() : 'N/A';

        let details = '';
        if (action.action_type === 'StockSplit') {
          // Convert basis points back to multiplier
          const multiplierBP = parseInt(action.old_value || '0');
          const multiplier = multiplierBP / 10000;
          const newMultiplierBP = parseInt(action.new_value || '0');
          const newMultiplier = newMultiplierBP / 10000;

          if (multiplier > 1) {
            details = `${multiplier}x forward split`;
          } else if (multiplier < 1) {
            const ratio = Math.round(1 / multiplier);
            details = `1-for-${ratio} reverse (${multiplier}x)`;
          } else {
            details = `${multiplier}x split`;
          }
          details += `\nNew total: ${newMultiplier}x`;
        } else if (action.action_type === 'SymbolChange') {
          details = `${action.old_value} → ${action.new_value}`;
        } else if (action.action_type === 'NameChange') {
          details = `${action.old_value} → ${action.new_value}`;
        }

        table.push([
          date,
          action.action_type,
          details,
          action.block_number.toString(),
          action.transaction_hash.substring(0, 10) + '...',
        ]);
      }

      console.log(table.toString());
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch corporate action history'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

corporate
  .command('symbol <newSymbol>')
  .description('Update token symbol')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (newSymbol: string, options) => {
    const spinner = ora(`Updating symbol to ${newSymbol}...`).start();

    try {
      const issuer = createIssuerService(options.network);
      const receipt = await issuer.updateSymbol(newSymbol);

      spinner.succeed(chalk.green('Symbol updated!'));
      console.log(chalk.gray('  New Symbol:'), newSymbol);
      console.log(chalk.gray('  TX Hash:'), receipt.hash);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to update symbol'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// CAP-TABLE COMMANDS
// ============================================================================

program
  .command('captable')
  .description('Generate cap-table report')
  .option('-f, --format <format>', 'Output format (table|csv|json)', 'table')
  .option('-o, --output <file>', 'Output file (for csv/json)')
  .action(async (options) => {
    const spinner = ora('Generating cap-table...').start();

    try {
      const capTableService = new CapTableService();
      const capTable = capTableService.generateCapTable();

      spinner.stop();

      if (options.format === 'csv') {
        const csv = capTableService.exportToCSV(capTable);
        if (options.output) {
          fs.writeFileSync(options.output, csv);
          console.log(chalk.green('✓'), `Cap-table exported to ${options.output}`);
        } else {
          console.log(csv);
        }
      } else if (options.format === 'json') {
        const json = capTableService.exportToJSON(capTable);
        if (options.output) {
          fs.writeFileSync(options.output, json);
          console.log(chalk.green('✓'), `Cap-table exported to ${options.output}`);
        } else {
          console.log(json);
        }
      } else {
        // Table format
        console.log(chalk.bold('\nCap-Table Report\n'));
        console.log(chalk.gray('Total Supply:'), chalk.green(capTable.totalSupplyFormatted));
        console.log(chalk.gray('Holders:'), capTable.holderCount);
        console.log(chalk.gray('Split Multiplier:'), capTable.splitMultiplier + 'x');
        console.log('');

        const table = new Table({
          head: [
            chalk.cyan('#'),
            chalk.cyan('Address'),
            chalk.cyan('Balance'),
            chalk.cyan('Ownership %'),
          ],
        });

        capTable.entries.forEach((entry, index) => {
          table.push([
            index + 1,
            entry.address.substring(0, 42),
            entry.balanceFormatted,
            entry.ownershipPercentage.toFixed(2) + '%',
          ]);
        });

        console.log(table.toString());
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to generate cap-table'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// SNAPSHOT COMMAND
// ============================================================================

program
  .command('snapshot <block>')
  .description('Generate historical cap-table snapshot at specific block')
  .option('-f, --format <format>', 'Output format (table|csv|json)', 'table')
  .option('-o, --output <file>', 'Output file (for csv/json)')
  .action(async (block: string, options) => {
    const blockNumber = parseInt(block);

    if (isNaN(blockNumber) || blockNumber < 0) {
      console.error(chalk.red('Error: Block number must be a positive integer'));
      process.exit(1);
    }

    const spinner = ora(`Generating snapshot at block ${blockNumber}...`).start();

    try {
      const capTableService = new CapTableService();
      const snapshot = capTableService.getSnapshotAtBlock(blockNumber);

      spinner.stop();

      if (options.format === 'csv') {
        const csv = capTableService.exportToCSV(snapshot);
        if (options.output) {
          fs.writeFileSync(options.output, csv);
          console.log(chalk.green('✓'), `Snapshot exported to ${options.output}`);
        } else {
          console.log(csv);
        }
      } else if (options.format === 'json') {
        const json = capTableService.exportToJSON(snapshot);
        if (options.output) {
          fs.writeFileSync(options.output, json);
          console.log(chalk.green('✓'), `Snapshot exported to ${options.output}`);
        } else {
          console.log(json);
        }
      } else {
        // Table format
        console.log(chalk.bold(`\nHistorical Snapshot at Block ${blockNumber}\n`));
        console.log(chalk.gray('Block Number:'), chalk.cyan(blockNumber));
        console.log(chalk.gray('Total Supply:'), chalk.green(snapshot.totalSupplyFormatted));
        console.log(chalk.gray('Holders:'), snapshot.holderCount);
        console.log(chalk.gray('Split Multiplier:'), snapshot.splitMultiplier + 'x');
        console.log(
          chalk.gray('Generated At:'),
          new Date(snapshot.generatedAt).toLocaleString()
        );

        if (snapshot.entries.length === 0) {
          console.log(chalk.yellow('\n⚠️  No holders found at this block'));
          console.log(chalk.gray('   This may be before any tokens were minted'));
          return;
        }

        console.log('');

        const table = new Table({
          head: [
            chalk.cyan('#'),
            chalk.cyan('Address'),
            chalk.cyan('Balance'),
            chalk.cyan('Ownership %'),
          ],
        });

        snapshot.entries.forEach((entry, index) => {
          table.push([
            index + 1,
            entry.address.substring(0, 42),
            entry.balanceFormatted,
            entry.ownershipPercentage.toFixed(2) + '%',
          ]);
        });

        console.log(table.toString());

        console.log(chalk.gray('\n💡 Tips:'));
        console.log(chalk.gray('  Export to CSV: npm run cli snapshot', blockNumber, '--format csv'));
        console.log(
          chalk.gray('  Save to file: npm run cli snapshot', blockNumber, '--format json -o snapshot.json')
        );
        console.log(chalk.gray('  View current state: npm run cli captable'));
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to generate snapshot'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// EVENTS COMMANDS
// ============================================================================

program
  .command('events')
  .description('View blockchain events')
  .option(
    '-t, --type <type>',
    'Filter by event type (Transfer, WalletApproved, WalletRevoked, StockSplit, SymbolChanged)'
  )
  .option('-l, --limit <limit>', 'Number of events to show', '20')
  .action(async (options) => {
    const spinner = ora('Fetching events...').start();

    try {
      const capTableService = new CapTableService();
      const db = (capTableService as any).db;

      const limit = parseInt(options.limit) || 20;
      let events;

      if (options.type) {
        events = db.getEventsByType(options.type, limit);
      } else {
        // Get all recent events
        const stmt = db.db.prepare(`
          SELECT * FROM events
          ORDER BY block_number DESC, id DESC
          LIMIT ?
        `);
        events = stmt.all(limit);
      }

      spinner.stop();

      if (events.length === 0) {
        console.log(chalk.yellow('No events found'));
        if (options.type) {
          console.log(chalk.gray(`  Tip: Try without --type to see all events`));
        }
        return;
      }

      console.log(chalk.bold(`\n${events.length} Events:\n`));

      const table = new Table({
        head: [
          chalk.cyan('Block'),
          chalk.cyan('Type'),
          chalk.cyan('Details'),
          chalk.cyan('TX Hash'),
        ],
      });

      for (const event of events) {
        let details = '';

        if (event.event_type === 'Transfer') {
          const from = event.from_address?.substring(0, 10) || 'N/A';
          const to = event.to_address?.substring(0, 10) || 'N/A';
          const amount = event.amount ? ethers.formatEther(event.amount) : '0';
          details = `${from}... → ${to}...\n${amount} tokens`;
        } else if (event.event_type === 'WalletApproved') {
          details = `Approved: ${event.from_address?.substring(0, 10)}...`;
        } else if (event.event_type === 'WalletRevoked') {
          details = `Revoked: ${event.from_address?.substring(0, 10)}...`;
        } else if (event.event_type === 'StockSplit') {
          const data = JSON.parse(event.data || '{}');
          const mult = parseInt(data.multiplier || '0') / 10000;
          details = `Split: ${mult}x`;
        } else if (event.event_type === 'SymbolChanged') {
          const data = JSON.parse(event.data || '{}');
          details = `${data.oldSymbol} → ${data.newSymbol}`;
        } else {
          details = event.data || 'N/A';
        }

        table.push([
          event.block_number.toString(),
          event.event_type,
          details,
          event.transaction_hash.substring(0, 10) + '...',
        ]);
      }

      console.log(table.toString());

      console.log(chalk.gray(`\n💡 Tips:`));
      console.log(chalk.gray(`  Filter by type: npm run cli events --type Transfer`));
      console.log(chalk.gray(`  Show more: npm run cli events --limit 50`));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch events'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// ANALYTICS COMMANDS
// ============================================================================

program
  .command('analytics')
  .description('Show ownership analytics')
  .action(async () => {
    const spinner = ora('Calculating analytics...').start();

    try {
      const capTableService = new CapTableService();
      const distribution = capTableService.getOwnershipDistribution();

      spinner.stop();

      console.log(chalk.bold('\nOwnership Distribution Analytics\n'));
      console.log(chalk.gray('Total Holders:'), distribution.holderCount);
      console.log(chalk.gray('Total Supply:'), chalk.green(distribution.totalSupply));
      console.log(chalk.gray('Median Holding:'), distribution.medianHolding);
      console.log(chalk.gray('Average Holding:'), distribution.averageHolding);
      console.log(
        chalk.gray('Top 10 Concentration:'),
        distribution.topHoldersPercentage.toFixed(2) + '%'
      );
      console.log(chalk.gray('HHI (Concentration):'), distribution.concentrationRatio.toFixed(4));

      console.log(chalk.bold('\nTop 5 Holders:\n'));

      const topHolders = capTableService.getTopHolders(5);
      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Address'), chalk.cyan('Balance'), chalk.cyan('%')],
      });

      topHolders.forEach((holder, index) => {
        table.push([
          index + 1,
          holder.address.substring(0, 42),
          holder.balanceFormatted,
          holder.ownershipPercentage.toFixed(2) + '%',
        ]);
      });

      console.log(table.toString());
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to calculate analytics'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================================================
// GAS ANALYTICS COMMANDS
// ============================================================================

program
  .command('gas')
  .description('Show gas usage analytics and statistics')
  .option('-t, --top <number>', 'Show top N most expensive transactions', '10')
  .option('--by-type', 'Show gas statistics grouped by event type')
  .action(async (options) => {
    const spinner = ora('Analyzing gas usage...').start();

    try {
      const capTableService = new CapTableService();
      const db = (capTableService as any).db;

      spinner.stop();

      // Overall statistics
      const stats = db.getGasStatistics();

      console.log(chalk.bold('\n⛽ Gas Usage Analytics\n'));
      console.log(chalk.gray('Total Events:'), stats.eventCount);
      console.log(chalk.gray('Total Gas Used:'), chalk.yellow(Number(stats.totalGasUsed).toLocaleString()));
      console.log(chalk.gray('Average Gas:'), chalk.yellow(Number(stats.averageGasUsed).toLocaleString()));

      // Convert total cost from wei to ETH/MATIC
      if (stats.totalCost && BigInt(stats.totalCost) > 0n) {
        const totalCostWei = BigInt(stats.totalCost);
        const totalCostEther = Number(totalCostWei) / 1e18;
        console.log(chalk.gray('Total Cost:'), chalk.yellow(totalCostEther.toFixed(8)), 'MATIC/ETH');
      }

      // Show statistics by event type if requested
      if (options.byType) {
        console.log(chalk.bold('\n📊 Gas by Event Type:\n'));

        const statsByType = db.getGasStatisticsByType();

        const typeTable = new Table({
          head: [
            chalk.cyan('Event Type'),
            chalk.cyan('Count'),
            chalk.cyan('Min Gas'),
            chalk.cyan('Avg Gas'),
            chalk.cyan('Max Gas'),
            chalk.cyan('Total Gas'),
          ],
        });

        statsByType.forEach((stat: any) => {
          typeTable.push([
            stat.eventType,
            stat.count,
            Number(stat.minGas).toLocaleString(),
            Number(stat.avgGas).toLocaleString(),
            Number(stat.maxGas).toLocaleString(),
            Number(stat.totalGas).toLocaleString(),
          ]);
        });

        console.log(typeTable.toString());
      }

      // Show most expensive transactions
      const limit = parseInt(options.top);
      if (!isNaN(limit) && limit > 0) {
        console.log(chalk.bold(`\n💰 Top ${limit} Most Expensive Transactions:\n`));

        const expensive = db.getMostExpensiveTransactions(limit);

        if (expensive.length === 0) {
          console.log(chalk.yellow('No gas data available yet. Run the indexer to collect gas data.'));
        } else {
          const expensiveTable = new Table({
            head: [
              chalk.cyan('Event'),
              chalk.cyan('Gas Used'),
              chalk.cyan('Gas Price (Gwei)'),
              chalk.cyan('Cost (MATIC)'),
              chalk.cyan('TX Hash'),
            ],
          });

          expensive.forEach((tx: any) => {
            const costWei = BigInt(tx.cost);
            const costEther = (Number(costWei) / 1e18).toFixed(8);
            const gasPriceGwei = (Number(tx.gasPrice) / 1e9).toFixed(2);

            expensiveTable.push([
              tx.eventType,
              Number(tx.gasUsed).toLocaleString(),
              gasPriceGwei,
              costEther,
              tx.transactionHash.substring(0, 10) + '...',
            ]);
          });

          console.log(expensiveTable.toString());
        }
      }

      console.log(chalk.gray('\n💡 Tips:'));
      console.log(chalk.gray('  Group by event type: npm run cli gas --by-type'));
      console.log(chalk.gray('  Show top 20 transactions: npm run cli gas --top 20'));
      console.log(chalk.gray('  Run indexer to collect gas data: npm run indexer'));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to calculate gas analytics'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
