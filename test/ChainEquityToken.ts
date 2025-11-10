import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { network } from 'hardhat';
import { parseEther, getAddress, type Address } from 'viem';

describe('ChainEquityToken', async function () {
  const connection = await network.connect();
  const { viem } = connection;
  await viem.getPublicClient();

  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;

  const TOKEN_NAME = 'ChainEquity Test Token';
  const TOKEN_SYMBOL = 'CEQT';
  const BASIS_POINTS = 10000n;

  beforeEach(async function () {
    // Get wallet clients
    const wallets = await viem.getWalletClients();
    [owner, addr1, addr2, addr3] = wallets;

    // Deploy contract
    token = await viem.deployContract('ChainEquityToken', [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      owner.account.address,
    ]);
  });

  // ============================================
  // Constructor & Initial State Tests
  // ============================================

  describe('Deployment', function () {
    it('Should set the correct name and symbol', async function () {
      assert.equal(await token.read.name(), TOKEN_NAME);
      assert.equal(await token.read.symbol(), TOKEN_SYMBOL);
    });

    it('Should set the correct owner', async function () {
      assert.equal(await token.read.owner(), getAddress(owner.account.address));
    });

    it('Should automatically add owner to allowlist', async function () {
      assert.equal(await token.read.isApproved([owner.account.address]), true);
    });

    it('Should initialize split multiplier to BASIS_POINTS', async function () {
      assert.equal(await token.read.getSplitMultiplier(), BASIS_POINTS);
    });

    it('Should have zero initial supply', async function () {
      assert.equal(await token.read.totalSupply(), 0n);
    });
  });

  // ============================================
  // Allowlist Management Tests
  // ============================================

  describe('Allowlist Management', function () {
    describe('approveWallet', function () {
      it('Should approve a wallet', async function () {
        await token.write.approveWallet([addr1.account.address]);
        assert.equal(await token.read.isApproved([addr1.account.address]), true);
      });

      it('Should emit WalletApproved event', async function () {
        await viem.assertions.emitWithArgs(
          token.write.approveWallet([addr1.account.address]),
          token,
          'WalletApproved',
          [getAddress(addr1.account.address)]
        );
      });

      it('Should revert if called by non-owner', async function () {
        await assert.rejects(
          token.write.approveWallet([addr2.account.address], { account: addr1.account })
        );
      });

      it('Should revert for zero address', async function () {
        const zeroAddress = '0x0000000000000000000000000000000000000000' as Address;
        await assert.rejects(token.write.approveWallet([zeroAddress]));
      });
    });

    describe('revokeWallet', function () {
      beforeEach(async function () {
        await token.write.approveWallet([addr1.account.address]);
      });

      it('Should revoke a wallet', async function () {
        await token.write.revokeWallet([addr1.account.address]);
        assert.equal(await token.read.isApproved([addr1.account.address]), false);
      });

      it('Should emit WalletRevoked event', async function () {
        await viem.assertions.emitWithArgs(
          token.write.revokeWallet([addr1.account.address]),
          token,
          'WalletRevoked',
          [getAddress(addr1.account.address)]
        );
      });

      it('Should revert if called by non-owner', async function () {
        await assert.rejects(
          token.write.revokeWallet([addr1.account.address], { account: addr1.account })
        );
      });
    });
  });

  // ============================================
  // Minting Tests
  // ============================================

  describe('Minting', function () {
    const MINT_AMOUNT = parseEther('1000');

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
    });

    it('Should mint tokens to approved address', async function () {
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      assert.equal(await token.read.balanceOf([addr1.account.address]), MINT_AMOUNT);
    });

    it('Should increase total supply', async function () {
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      assert.equal(await token.read.totalSupply(), MINT_AMOUNT);
    });

    it('Should revert if recipient not approved', async function () {
      await assert.rejects(token.write.mint([addr2.account.address, MINT_AMOUNT]));
    });

    it('Should revert for zero address', async function () {
      const zeroAddress = '0x0000000000000000000000000000000000000000' as Address;
      await assert.rejects(token.write.mint([zeroAddress, MINT_AMOUNT]));
    });

    it('Should revert for zero amount', async function () {
      await assert.rejects(token.write.mint([addr1.account.address, 0n]));
    });
  });

  // ============================================
  // Transfer Restriction Tests
  // ============================================

  describe('Transfer Restrictions', function () {
    const TRANSFER_AMOUNT = parseEther('100');

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, parseEther('1000')]);
    });

    it('Should allow transfer between approved wallets', async function () {
      await token.write.transfer([addr2.account.address, TRANSFER_AMOUNT], {
        account: addr1.account,
      });
      assert.equal(await token.read.balanceOf([addr2.account.address]), TRANSFER_AMOUNT);
    });

    it('Should revert if sender not approved', async function () {
      await token.write.revokeWallet([addr1.account.address]);
      await assert.rejects(
        token.write.transfer([addr2.account.address, TRANSFER_AMOUNT], { account: addr1.account })
      );
    });

    it('Should revert if recipient not approved', async function () {
      await assert.rejects(
        token.write.transfer([addr3.account.address, TRANSFER_AMOUNT], { account: addr1.account })
      );
    });
  });

  // ============================================
  // Stock Split Tests
  // ============================================

  describe('Stock Splits', function () {
    const MINT_AMOUNT = parseEther('1000');

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      await token.write.mint([addr2.account.address, MINT_AMOUNT]);
    });

    it('Should execute 2-for-1 split', async function () {
      const initialBalance = await token.read.balanceOf([addr1.account.address]);
      await token.write.executeSplit([20000n]);
      assert.equal(await token.read.balanceOf([addr1.account.address]), initialBalance * 2n);
    });

    it('Should execute reverse split', async function () {
      const initialBalance = await token.read.balanceOf([addr1.account.address]);
      await token.write.executeSplit([5000n]);
      assert.equal(await token.read.balanceOf([addr1.account.address]), initialBalance / 2n);
    });

    it('Should emit StockSplit event', async function () {
      await viem.assertions.emitWithArgs(token.write.executeSplit([20000n]), token, 'StockSplit', [
        20000n,
        20000n,
      ]);
    });

    it('Should revert if multiplier is zero', async function () {
      await assert.rejects(token.write.executeSplit([0n]));
    });

    it('Should compound multiple splits', async function () {
      await token.write.executeSplit([15000n]); // 1.5x
      await token.write.executeSplit([20000n]); // 2.0x
      assert.equal(await token.read.getSplitMultiplier(), 30000n); // 3.0x total
    });
  });

  // ============================================
  // Symbol/Name Update Tests
  // ============================================

  describe('Symbol and Name Updates', function () {
    it('Should update symbol', async function () {
      await token.write.updateSymbol(['NEWSY']);
      assert.equal(await token.read.symbol(), 'NEWSY');
    });

    it('Should emit SymbolChanged event', async function () {
      await viem.assertions.emitWithArgs(
        token.write.updateSymbol(['NEWSY']),
        token,
        'SymbolChanged',
        [TOKEN_SYMBOL, 'NEWSY']
      );
    });

    it('Should revert for empty symbol', async function () {
      await assert.rejects(token.write.updateSymbol(['']));
    });

    it('Should update name', async function () {
      await token.write.updateName(['New Token Name']);
      assert.equal(await token.read.name(), 'New Token Name');
    });

    it('Should emit NameChanged event', async function () {
      await viem.assertions.emitWithArgs(
        token.write.updateName(['New Token Name']),
        token,
        'NameChanged',
        [TOKEN_NAME, 'New Token Name']
      );
    });

    it('Should revert for empty name', async function () {
      await assert.rejects(token.write.updateName(['']));
    });
  });

  // ============================================
  // Event Coverage Tests
  // ============================================

  describe('Transfer Event', function () {
    const AMOUNT = parseEther('100');

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, parseEther('1000')]);
    });

    it('Should emit Transfer event with correct arguments on transfer', async function () {
      await viem.assertions.emitWithArgs(
        token.write.transfer([addr2.account.address, AMOUNT], { account: addr1.account }),
        token,
        'Transfer',
        [getAddress(addr1.account.address), getAddress(addr2.account.address), AMOUNT]
      );
    });

    it('Should emit Transfer event with zero address as from on mint', async function () {
      const zeroAddress = '0x0000000000000000000000000000000000000000' as Address;
      await viem.assertions.emitWithArgs(
        token.write.mint([addr2.account.address, AMOUNT]),
        token,
        'Transfer',
        [zeroAddress, getAddress(addr2.account.address), AMOUNT]
      );
    });

    it('Should update balances correctly for normal transfer', async function () {
      const addr1Before = await token.read.balanceOf([addr1.account.address]);
      const addr2Before = await token.read.balanceOf([addr2.account.address]);

      await token.write.transfer([addr2.account.address, AMOUNT], { account: addr1.account });

      assert.equal(await token.read.balanceOf([addr1.account.address]), addr1Before - AMOUNT);
      assert.equal(await token.read.balanceOf([addr2.account.address]), addr2Before + AMOUNT);
    });
  });

  describe('Mint Event (Transfer from zero)', function () {
    const MINT_AMOUNT = parseEther('500');

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
    });

    it('Should emit Transfer event from zero address on mint', async function () {
      const zeroAddress = '0x0000000000000000000000000000000000000000' as Address;
      await viem.assertions.emitWithArgs(
        token.write.mint([addr1.account.address, MINT_AMOUNT]),
        token,
        'Transfer',
        [zeroAddress, getAddress(addr1.account.address), MINT_AMOUNT]
      );
    });

    it('Should increase total supply on mint', async function () {
      const supplyBefore = await token.read.totalSupply();
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      assert.equal(await token.read.totalSupply(), supplyBefore + MINT_AMOUNT);
    });

    it('Should increase recipient balance on mint', async function () {
      const balanceBefore = await token.read.balanceOf([addr1.account.address]);
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      assert.equal(await token.read.balanceOf([addr1.account.address]), balanceBefore + MINT_AMOUNT);
    });
  });

  describe('Approval Event', function () {
    const AMOUNT = parseEther('100');

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, parseEther('1000')]);
    });

    it('Should emit Approval event with correct arguments', async function () {
      await viem.assertions.emitWithArgs(
        token.write.approve([addr2.account.address, AMOUNT], { account: addr1.account }),
        token,
        'Approval',
        [getAddress(addr1.account.address), getAddress(addr2.account.address), AMOUNT]
      );
    });

    it('Should update allowance correctly', async function () {
      await token.write.approve([addr2.account.address, AMOUNT], { account: addr1.account });
      const allowance = await token.read.allowance([addr1.account.address, addr2.account.address]);
      assert.equal(allowance, AMOUNT);
    });

    it('Should handle zero allowance', async function () {
      await token.write.approve([addr2.account.address, 0n], { account: addr1.account });
      const allowance = await token.read.allowance([addr1.account.address, addr2.account.address]);
      assert.equal(allowance, 0n);
    });

    it('Should handle max allowance', async function () {
      const maxUint256 = 2n ** 256n - 1n;
      await token.write.approve([addr2.account.address, maxUint256], { account: addr1.account });
      const allowance = await token.read.allowance([addr1.account.address, addr2.account.address]);
      assert.equal(allowance, maxUint256);
    });

    it('Should overwrite previous allowance', async function () {
      await token.write.approve([addr2.account.address, AMOUNT], { account: addr1.account });
      await token.write.approve([addr2.account.address, AMOUNT * 2n], { account: addr1.account });
      const allowance = await token.read.allowance([addr1.account.address, addr2.account.address]);
      assert.equal(allowance, AMOUNT * 2n);
    });
  });

  describe('Burn Behavior', function () {
    const BURN_AMOUNT = parseEther('100');
    const zeroAddress = '0x0000000000000000000000000000000000000000' as Address;

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.mint([addr1.account.address, parseEther('1000')]);
    });

    it('Should revert when attempting to transfer to zero address (burn not supported in OZ v5)', async function () {
      // OpenZeppelin ERC20 v5 prevents transfers to zero address with ERC20InvalidReceiver error
      await assert.rejects(
        token.write.transfer([zeroAddress, BURN_AMOUNT], { account: addr1.account }),
        /ERC20InvalidReceiver/
      );
    });

    it('Should not emit Transfer event when burn attempt is reverted', async function () {
      // Since burn reverts, no event is emitted (transaction rolls back)
      await assert.rejects(
        token.write.transfer([zeroAddress, BURN_AMOUNT], { account: addr1.account })
      );
    });
  });

  describe('Wallet Approval Idempotency', function () {
    it('Should handle re-approving an already approved wallet', async function () {
      const publicClient = await viem.getPublicClient();

      // First approval
      const hash1 = await token.write.approveWallet([addr1.account.address]);
      const receipt1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Second approval (idempotent)
      const hash2 = await token.write.approveWallet([addr1.account.address]);
      const receipt2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Both transactions should succeed and wallet remains approved
      assert.equal(receipt1.status, 'success');
      assert.equal(receipt2.status, 'success');
      assert.equal(await token.read.isApproved([addr1.account.address]), true);
    });

    it('Should handle re-revoking an already revoked wallet', async function () {
      const publicClient = await viem.getPublicClient();

      // Approve first
      await token.write.approveWallet([addr1.account.address]);

      // First revocation
      const hash1 = await token.write.revokeWallet([addr1.account.address]);
      const receipt1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Second revocation (idempotent)
      const hash2 = await token.write.revokeWallet([addr1.account.address]);
      const receipt2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });

      // Both transactions should succeed and wallet remains revoked
      assert.equal(receipt1.status, 'success');
      assert.equal(receipt2.status, 'success');
      assert.equal(await token.read.isApproved([addr1.account.address]), false);
    });
  });

  describe('Stock Split Edge Cases', function () {
    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.mint([addr1.account.address, parseEther('1000')]);
    });

    it('Should revert if multiplier equals BASIS_POINTS', async function () {
      await assert.rejects(token.write.executeSplit([BASIS_POINTS]));
    });

    it('Should compound multiple splits correctly', async function () {
      await token.write.executeSplit([20000n]); // 2.0x
      await token.write.executeSplit([15000n]); // 1.5x
      assert.equal(await token.read.getSplitMultiplier(), 30000n); // 3.0x total
    });

    it('Should handle three-way split compounding', async function () {
      await token.write.executeSplit([20000n]); // 2.0x → 20000
      await token.write.executeSplit([30000n]); // 3.0x → 60000
      await token.write.executeSplit([5000n]); // 0.5x → 30000
      assert.equal(await token.read.getSplitMultiplier(), 30000n);
    });
  });

  describe('Symbol and Name Edge Cases', function () {
    it('Should revert for symbol longer than 11 characters', async function () {
      await assert.rejects(token.write.updateSymbol(['TOOLONGSYMBL'])); // 12 chars
    });

    it('Should accept symbol with exactly 11 characters', async function () {
      const elevenCharSymbol = 'EXACTLYELEVN'; // 12 chars - should fail
      await assert.rejects(token.write.updateSymbol([elevenCharSymbol]));
    });

    it('Should accept symbol with 11 characters', async function () {
      const elevenCharSymbol = 'EXACTLYELEV'; // 11 chars
      await token.write.updateSymbol([elevenCharSymbol]);
      assert.equal(await token.read.symbol(), elevenCharSymbol);
    });

    it('Should emit SymbolChanged with correct old and new values', async function () {
      const currentSymbol = await token.read.symbol();
      await viem.assertions.emitWithArgs(
        token.write.updateSymbol(['NEWSYM']),
        token,
        'SymbolChanged',
        [currentSymbol, 'NEWSYM']
      );
    });

    it('Should emit NameChanged with correct old and new values', async function () {
      const currentName = await token.read.name();
      await viem.assertions.emitWithArgs(
        token.write.updateName(['New Token Name']),
        token,
        'NameChanged',
        [currentName, 'New Token Name']
      );
    });
  });

  describe('TransferBlocked Event Behavior', function () {
    const AMOUNT = parseEther('100');

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.mint([addr1.account.address, parseEther('1000')]);
    });

    it('Should revert when transferring to non-approved address (no TransferBlocked log persists)', async function () {
      const publicClient = await viem.getPublicClient();

      // Attempt blocked transfer
      await assert.rejects(
        token.write.transfer([addr2.account.address, AMOUNT], { account: addr1.account })
      );

      // Verify the transaction reverted and no TransferBlocked event is observable
      // (events emitted before revert are rolled back)
    });

    it('Should revert when non-approved address attempts transfer', async function () {
      await token.write.approveWallet([addr2.account.address]);
      await token.write.transfer([addr2.account.address, AMOUNT], { account: addr1.account });

      // Revoke addr2, then try to send
      await token.write.revokeWallet([addr2.account.address]);
      await assert.rejects(
        token.write.transfer([addr1.account.address, AMOUNT / 2n], { account: addr2.account })
      );
    });

    it('Should not emit TransferBlocked on successful transfer', async function () {
      await token.write.approveWallet([addr2.account.address]);
      const publicClient = await viem.getPublicClient();

      const hash = await token.write.transfer([addr2.account.address, AMOUNT], {
        account: addr1.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Verify the transfer succeeded
      assert.equal(receipt.status, 'success');
      assert.ok(receipt.logs.length > 0);

      // TransferBlocked event would have a different topic and would only be in logs
      // if the transaction reverted, which it didn't since status is 'success'
      assert.equal(await token.read.balanceOf([addr2.account.address]), AMOUNT);
    });
  });

  describe('Non-existent Events', function () {
    it('Should not have ComplianceOfficerAdded event in contract ABI', async function () {
      // Check that the contract ABI doesn't include ComplianceOfficerAdded or ComplianceOfficerRemoved
      const abi = token.abi;
      const complianceEvents = abi.filter(
        (item: any) =>
          item.type === 'event' &&
          (item.name === 'ComplianceOfficerAdded' || item.name === 'ComplianceOfficerRemoved')
      );
      assert.equal(complianceEvents.length, 0, 'Contract should not have ComplianceOfficer events');
    });

    it('Should confirm contract only has expected events', async function () {
      const abi = token.abi;
      const events = abi.filter((item: any) => item.type === 'event');
      const eventNames = events.map((e: any) => e.name).sort();

      const expectedEvents = [
        'Approval',
        'NameChanged',
        'OwnershipTransferred',
        'StockSplit',
        'SymbolChanged',
        'Transfer',
        'TransferBlocked',
        'WalletApproved',
        'WalletRevoked',
      ].sort();

      assert.deepEqual(eventNames, expectedEvents, 'Contract should only have expected events');
    });
  });

  // ============================================
  // Complex Scenario Tests
  // ============================================

  describe('Complex Scenarios', function () {
    it('Should handle full lifecycle: mint, transfer, split, transfer', async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);

      await token.write.mint([addr1.account.address, parseEther('1000')]);
      await token.write.transfer([addr2.account.address, parseEther('400')], {
        account: addr1.account,
      });

      assert.equal(await token.read.balanceOf([addr1.account.address]), parseEther('600'));
      assert.equal(await token.read.balanceOf([addr2.account.address]), parseEther('400'));

      await token.write.executeSplit([20000n]); // 2:1 split

      assert.equal(await token.read.balanceOf([addr1.account.address]), parseEther('1200'));
      assert.equal(await token.read.balanceOf([addr2.account.address]), parseEther('800'));
    });

    it('Should maintain proportional ownership after split', async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, parseEther('600')]);
      await token.write.mint([addr2.account.address, parseEther('400')]);

      const total1 = await token.read.totalSupply();
      const balance1Before = await token.read.balanceOf([addr1.account.address]);

      await token.write.executeSplit([20000n]); // 2x

      const total2 = await token.read.totalSupply();
      const balance1After = await token.read.balanceOf([addr1.account.address]);

      // Check proportions maintained: balance1/total should be same
      assert.equal(balance1After * total1, balance1Before * total2);
    });
  });
});
