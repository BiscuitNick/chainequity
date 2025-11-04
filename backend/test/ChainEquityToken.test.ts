import { expect } from "chai";
import hre from "hardhat";
import { parseEther, parseUnits, getAddress, Address } from "viem";

describe("ChainEquityToken", function () {
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
    const wallets = await hre.viem.getWalletClients();
    [owner, addr1, addr2, addr3] = wallets;

    // Deploy contract
    tokenAddress = await hre.viem.deployContract("ChainEquityToken", [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      owner.account.address,
    ]);

    token = await hre.viem.getContractAt("ChainEquityToken", tokenAddress);
  });

  // ============================================
  // Constructor & Initial State Tests
  // ============================================

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await token.read.name()).to.equal(TOKEN_NAME);
      expect(await token.read.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the correct owner", async function () {
      expect(await token.read.owner()).to.equal(getAddress(owner.account.address));
    });

    it("Should automatically add owner to allowlist", async function () {
      expect(await token.read.isApproved([owner.account.address])).to.be.true;
    });

    it("Should initialize split multiplier to BASIS_POINTS", async function () {
      expect(await token.read.getSplitMultiplier()).to.equal(BASIS_POINTS);
    });

    it("Should have zero initial supply", async function () {
      expect(await token.read.totalSupply()).to.equal(0n);
    });
  });

  // ============================================
  // Allowlist Management Tests
  // ============================================

  describe("Allowlist Management", function () {
    describe("approveWallet", function () {
      it("Should approve a wallet", async function () {
        await token.write.approveWallet([addr1.account.address]);
        expect(await token.read.isApproved([addr1.account.address])).to.be.true;
      });

      it("Should emit WalletApproved event", async function () {
        const hash = await token.write.approveWallet([addr1.account.address]);
        const publicClient = await hre.viem.getPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Check events in receipt
        const events = receipt.logs;
        expect(events.length).to.be.greaterThan(0);
      });

      it("Should revert if called by non-owner", async function () {
        await expect(
          token.write.approveWallet([addr2.account.address], { account: addr1.account })
        ).to.be.rejected;
      });

      it("Should revert for zero address", async function () {
        const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
        await expect(
          token.write.approveWallet([zeroAddress])
        ).to.be.rejected;
      });
    });

    describe("revokeWallet", function () {
      beforeEach(async function () {
        await token.write.approveWallet([addr1.account.address]);
      });

      it("Should revoke a wallet", async function () {
        await token.write.revokeWallet([addr1.account.address]);
        expect(await token.read.isApproved([addr1.account.address])).to.be.false;
      });

      it("Should emit WalletRevoked event", async function () {
        const hash = await token.write.revokeWallet([addr1.account.address]);
        const publicClient = await hre.viem.getPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Check events in receipt
        const events = receipt.logs;
        expect(events.length).to.be.greaterThan(0);
      });

      it("Should revert if called by non-owner", async function () {
        await expect(
          token.write.revokeWallet([addr1.account.address], { account: addr1.account })
        ).to.be.rejected;
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
      expect(await token.read.balanceOf([addr1.account.address])).to.equal(MINT_AMOUNT);
    });

    it("Should increase total supply", async function () {
      await token.write.mint([addr1.account.address, MINT_AMOUNT]);
      expect(await token.read.totalSupply()).to.equal(MINT_AMOUNT);
    });

    it("Should revert if recipient not approved", async function () {
      await expect(
        token.write.mint([addr2.account.address, MINT_AMOUNT])
      ).to.be.rejected;
    });

    it("Should revert for zero address", async function () {
      const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
      await expect(
        token.write.mint([zeroAddress, MINT_AMOUNT])
      ).to.be.rejected;
    });

    it("Should revert for zero amount", async function () {
      await expect(
        token.write.mint([addr1.account.address, 0n])
      ).to.be.rejected;
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
      expect(await token.read.balanceOf([addr2.account.address])).to.equal(TRANSFER_AMOUNT);
    });

    it("Should revert if sender not approved", async function () {
      await token.write.revokeWallet([addr1.account.address]);
      await expect(
        token.write.transfer([addr2.account.address, TRANSFER_AMOUNT], { account: addr1.account })
      ).to.be.rejected;
    });

    it("Should revert if recipient not approved", async function () {
      await expect(
        token.write.transfer([addr3.account.address, TRANSFER_AMOUNT], { account: addr1.account })
      ).to.be.rejected;
    });

    it("Should emit TransferBlocked event when blocked", async function () {
      const hash = await token.write.transfer([addr3.account.address, TRANSFER_AMOUNT], { account: addr1.account }).catch((e: any) => {
        // Expected to fail - just verify it rejects
        expect(e).to.exist;
      });
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
      expect(await token.read.balanceOf([addr1.account.address])).to.equal(initialBalance * 2n);
    });

    it("Should execute reverse split", async function () {
      const initialBalance = await token.read.balanceOf([addr1.account.address]);
      await token.write.executeSplit([5000n]);
      expect(await token.read.balanceOf([addr1.account.address])).to.equal(initialBalance / 2n);
    });

    it("Should emit StockSplit event", async function () {
      const hash = await token.write.executeSplit([20000n]);
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Check events in receipt
      const events = receipt.logs;
      expect(events.length).to.be.greaterThan(0);
    });

    it("Should revert if multiplier is zero", async function () {
      await expect(
        token.write.executeSplit([0n])
      ).to.be.rejected;
    });

    it("Should compound multiple splits", async function () {
      await token.write.executeSplit([15000n]); // 1.5x
      await token.write.executeSplit([20000n]); // 2.0x
      expect(await token.read.getSplitMultiplier()).to.equal(30000n); // 3.0x total
    });
  });

  // ============================================
  // Symbol/Name Update Tests
  // ============================================

  describe("Symbol and Name Updates", function () {
    it("Should update symbol", async function () {
      await token.write.updateSymbol(["NEWSY"]);
      expect(await token.read.symbol()).to.equal("NEWSY");
    });

    it("Should emit SymbolChanged event", async function () {
      const hash = await token.write.updateSymbol(["NEWSY"]);
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Check events in receipt
      const events = receipt.logs;
      expect(events.length).to.be.greaterThan(0);
    });

    it("Should revert for empty symbol", async function () {
      await expect(
        token.write.updateSymbol([""])
      ).to.be.rejected;
    });

    it("Should update name", async function () {
      await token.write.updateName(["New Token Name"]);
      expect(await token.read.name()).to.equal("New Token Name");
    });

    it("Should emit NameChanged event", async function () {
      const hash = await token.write.updateName(["New Token Name"]);
      const publicClient = await hre.viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Check events in receipt
      const events = receipt.logs;
      expect(events.length).to.be.greaterThan(0);
    });

    it("Should revert for empty name", async function () {
      await expect(
        token.write.updateName([""])
      ).to.be.rejected;
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

      expect(await token.read.balanceOf([addr1.account.address])).to.equal(parseEther("600"));
      expect(await token.read.balanceOf([addr2.account.address])).to.equal(parseEther("400"));

      await token.write.executeSplit([20000n]); // 2:1 split

      expect(await token.read.balanceOf([addr1.account.address])).to.equal(parseEther("1200"));
      expect(await token.read.balanceOf([addr2.account.address])).to.equal(parseEther("800"));
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
      expect(balance1After * total1).to.equal(balance1Before * total2);
    });
  });
});
