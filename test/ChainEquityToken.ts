import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import { parseEther, getAddress, type Address } from "viem";

describe("ChainEquityToken", async function () {
  const connection = await network.connect();
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();

  let token: any;
  let tokenAddress: Address;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;

  const TOKEN_NAME = "ChainEquity Test Token";
  const TOKEN_SYMBOL = "CEQT";
  const BASIS_POINTS = 10000n;

  beforeEach(async function () {
    // Get wallet clients
    const wallets = await viem.getWalletClients();
    [owner, addr1, addr2, addr3] = wallets;

    // Deploy contract
    token = await viem.deployContract("ChainEquityToken", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      owner.account.address,
    ]);

    tokenAddress = token.address;
  });

  // ============================================
  // Constructor & Initial State Tests
  // ============================================

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      assert.equal(await token.read.name(), TOKEN_NAME);
      assert.equal(await token.read.symbol(), TOKEN_SYMBOL);
    });

    it("Should set the correct owner", async function () {
      assert.equal(await token.read.owner(), getAddress(owner.account.address));
    });

    it("Should automatically add owner to allowlist", async function () {
      assert.equal(await token.read.isApproved([owner.account.address]), true);
    });

    it("Should initialize split multiplier to BASIS_POINTS", async function () {
      assert.equal(await token.read.getSplitMultiplier(), BASIS_POINTS);
    });

    it("Should have zero initial supply", async function () {
      assert.equal(await token.read.totalSupply(), 0n);
    });
  });

  // ============================================
  // Allowlist Management Tests
  // ============================================

  describe("Allowlist Management", function () {
    describe("approveWallet", function () {
      it("Should approve a wallet", async function () {
        await token.write.approveWallet([addr1.account.address]);
        assert.equal(await token.read.isApproved([addr1.account.address]), true);
      });

      it("Should emit WalletApproved event", async function () {
        await viem.assertions.emitWithArgs(
          token.write.approveWallet([addr1.account.address]),
          token,
          "WalletApproved",
          [getAddress(addr1.account.address)]
        );
      });

      it("Should revert if called by non-owner", async function () {
        await assert.rejects(
          token.write.approveWallet([addr2.account.address], { account: addr1.account })
        );
      });

      it("Should revert for zero address", async function () {
        const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
        await assert.rejects(
          token.write.approveWallet([zeroAddress])
        );
      });
    });

    describe("revokeWallet", function () {
      beforeEach(async function () {
        await token.write.approveWallet([addr1.account.address]);
      });

      it("Should revoke a wallet", async function () {
        await token.write.revokeWallet([addr1.account.address]);
        assert.equal(await token.read.isApproved([addr1.account.address]), false);
      });

      it("Should emit WalletRevoked event", async function () {
        await viem.assertions.emitWithArgs(
          token.write.revokeWallet([addr1.account.address]),
          token,
          "WalletRevoked",
          [getAddress(addr1.account.address)]
        );
      });

      it("Should revert if called by non-owner", async function () {
        await assert.rejects(
          token.write.revokeWallet([addr1.account.address], { account: addr1.account })
        );
      });
    });
  });

  // ============================================
  // Minting Tests
  // ============================================

  describe("Minting", function () {
    const MINT_AMOUNT = parseEther("1000");

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
    });

    it("Should mint tokens to approved address", async function () {
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      assert.equal(await token.read.balanceOf([addr1.account.address]), MINT_AMOUNT);
    });

    it("Should increase total supply", async function () {
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      assert.equal(await token.read.totalSupply(), MINT_AMOUNT);
    });

    it("Should revert if recipient not approved", async function () {
      await assert.rejects(
        token.write.mint([addr2.account.address, MINT_AMOUNT])
      );
    });

    it("Should revert for zero address", async function () {
      const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
      await assert.rejects(
        token.write.mint([zeroAddress, MINT_AMOUNT])
      );
    });

    it("Should revert for zero amount", async function () {
      await assert.rejects(
        token.write.mint([addr1.account.address, 0n])
      );
    });
  });

  // ============================================
  // Transfer Restriction Tests
  // ============================================

  describe("Transfer Restrictions", function () {
    const TRANSFER_AMOUNT = parseEther("100");

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, parseEther("1000")]);
    });

    it("Should allow transfer between approved wallets", async function () {
      await token.write.transfer([addr2.account.address, TRANSFER_AMOUNT], { account: addr1.account });
      assert.equal(await token.read.balanceOf([addr2.account.address]), TRANSFER_AMOUNT);
    });

    it("Should revert if sender not approved", async function () {
      await token.write.revokeWallet([addr1.account.address]);
      await assert.rejects(
        token.write.transfer([addr2.account.address, TRANSFER_AMOUNT], { account: addr1.account })
      );
    });

    it("Should revert if recipient not approved", async function () {
      await assert.rejects(
        token.write.transfer([addr3.account.address, TRANSFER_AMOUNT], { account: addr1.account })
      );
    });
  });

  // ============================================
  // Stock Split Tests
  // ============================================

  describe("Stock Splits", function () {
    const MINT_AMOUNT = parseEther("1000");

    beforeEach(async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      await token.write.mint([addr2.account.address, MINT_AMOUNT]);
    });

    it("Should execute 2-for-1 split", async function () {
      const initialBalance = await token.read.balanceOf([addr1.account.address]);
      await token.write.executeSplit([20000n]);
      assert.equal(await token.read.balanceOf([addr1.account.address]), initialBalance * 2n);
    });

    it("Should execute reverse split", async function () {
      const initialBalance = await token.read.balanceOf([addr1.account.address]);
      await token.write.executeSplit([5000n]);
      assert.equal(await token.read.balanceOf([addr1.account.address]), initialBalance / 2n);
    });

    it("Should emit StockSplit event", async function () {
      await viem.assertions.emitWithArgs(
        token.write.executeSplit([20000n]),
        token,
        "StockSplit",
        [20000n, 20000n]
      );
    });

    it("Should revert if multiplier is zero", async function () {
      await assert.rejects(
        token.write.executeSplit([0n])
      );
    });

    it("Should compound multiple splits", async function () {
      await token.write.executeSplit([15000n]); // 1.5x
      await token.write.executeSplit([20000n]); // 2.0x
      assert.equal(await token.read.getSplitMultiplier(), 30000n); // 3.0x total
    });
  });

  // ============================================
  // Symbol/Name Update Tests
  // ============================================

  describe("Symbol and Name Updates", function () {
    it("Should update symbol", async function () {
      await token.write.updateSymbol(["NEWSY"]);
      assert.equal(await token.read.symbol(), "NEWSY");
    });

    it("Should emit SymbolChanged event", async function () {
      await viem.assertions.emitWithArgs(
        token.write.updateSymbol(["NEWSY"]),
        token,
        "SymbolChanged",
        [TOKEN_SYMBOL, "NEWSY"]
      );
    });

    it("Should revert for empty symbol", async function () {
      await assert.rejects(
        token.write.updateSymbol([""])
      );
    });

    it("Should update name", async function () {
      await token.write.updateName(["New Token Name"]);
      assert.equal(await token.read.name(), "New Token Name");
    });

    it("Should emit NameChanged event", async function () {
      await viem.assertions.emitWithArgs(
        token.write.updateName(["New Token Name"]),
        token,
        "NameChanged",
        [TOKEN_NAME, "New Token Name"]
      );
    });

    it("Should revert for empty name", async function () {
      await assert.rejects(
        token.write.updateName([""])
      );
    });
  });

  // ============================================
  // Complex Scenario Tests
  // ============================================

  describe("Complex Scenarios", function () {
    it("Should handle full lifecycle: mint, transfer, split, transfer", async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);

      await token.write.mint([addr1.account.address, parseEther("1000")]);
      await token.write.transfer([addr2.account.address, parseEther("400")], { account: addr1.account });

      assert.equal(await token.read.balanceOf([addr1.account.address]), parseEther("600"));
      assert.equal(await token.read.balanceOf([addr2.account.address]), parseEther("400"));

      await token.write.executeSplit([20000n]); // 2:1 split

      assert.equal(await token.read.balanceOf([addr1.account.address]), parseEther("1200"));
      assert.equal(await token.read.balanceOf([addr2.account.address]), parseEther("800"));
    });

    it("Should maintain proportional ownership after split", async function () {
      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, parseEther("600")]);
      await token.write.mint([addr2.account.address, parseEther("400")]);

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
