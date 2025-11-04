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
program
  .name('chainequity')
  .description('ChainEquity Token Management CLI')
  .version('1.0.0');

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
  .description('Execute stock split')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .action(async (multiplier: string, options) => {
    const mult = parseInt(multiplier);

    if (mult <= 1) {
      console.error(chalk.red('Multiplier must be greater than 1'));
      process.exit(1);
    }

    const spinner = ora(`Executing ${mult}-for-1 split...`).start();

    try {
      const issuer = createIssuerService(options.network);
      const receipt = await issuer.executeSplit(mult);

      spinner.succeed(chalk.green(`${mult}-for-1 stock split executed!`));
      console.log(chalk.gray('  TX Hash:'), receipt.hash);
      console.log(chalk.gray('  Gas Used:'), receipt.gasUsed);
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to execute split'));
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
      console.log(
        chalk.gray('HHI (Concentration):'),
        distribution.concentrationRatio.toFixed(4)
      );

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

// Parse arguments
program.parse();
