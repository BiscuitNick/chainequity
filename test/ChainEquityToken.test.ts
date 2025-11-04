import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { formatEther, parseEther } from "viem";

describe("ChainEquityToken", function () {
  async function deployTokenFixture() {
    const [owner, addr1, addr2, addr3] = await hre.viem.getWalletClients();

    const token = await hre.viem.deployContract("ChainEquityToken", [
      "ChainEquity",
      "CEQ",
      owner.account.address,
    ]);

    return { token, owner, addr1, addr2, addr3 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);

      expect(await token.read.name()).to.equal("ChainEquity");
      expect(await token.read.symbol()).to.equal("CEQ");
      expect(await token.read.decimals()).to.equal(18);
    });

    it("Should set the right owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.read.owner()).to.equal(owner.account.address);
    });

    it("Should automatically approve the owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.read.isApproved([owner.account.address])).to.be.true;
    });
  });

  describe("Allowlist Management", function () {
    it("Should allow owner to approve wallets", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);

      await token.write.approveWallet([addr1.account.address]);
      expect(await token.read.isApproved([addr1.account.address])).to.be.true;
    });

    it("Should allow owner to revoke wallets", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);

      await token.write.approveWallet([addr1.account.address]);
      await token.write.revokeWallet([addr1.account.address]);
      expect(await token.read.isApproved([addr1.account.address])).to.be.false;
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to approved address", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);

      await token.write.approveWallet([addr1.account.address]);
      await token.write.mint([addr1.account.address, parseEther("1000")]);

      const balance = await token.read.balanceOf([addr1.account.address]);
      expect(formatEther(balance)).to.equal("1000");
    });

    it("Should update total supply after minting", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);

      await token.write.approveWallet([addr1.account.address]);
      await token.write.mint([addr1.account.address, parseEther("1000")]);

      const totalSupply = await token.read.totalSupply();
      expect(formatEther(totalSupply)).to.equal("1000");
    });
  });

  describe("Transfers", function () {
    it("Should allow transfers between approved addresses", async function () {
      const { token, addr1, addr2 } = await loadFixture(deployTokenFixture);

      await token.write.approveWallet([addr1.account.address]);
      await token.write.approveWallet([addr2.account.address]);
      await token.write.mint([addr1.account.address, parseEther("1000")]);

      const tokenAsAddr1 = await hre.viem.getContractAt(
        "ChainEquityToken",
        token.address,
        { client: { wallet: addr1 } }
      );

      await tokenAsAddr1.write.transfer([addr2.account.address, parseEther("100")]);

      const balance1 = await token.read.balanceOf([addr1.account.address]);
      const balance2 = await token.read.balanceOf([addr2.account.address]);

      expect(formatEther(balance1)).to.equal("900");
      expect(formatEther(balance2)).to.equal("100");
    });

    it("Should block transfers to non-approved addresses", async function () {
      const { token, addr1, addr3 } = await loadFixture(deployTokenFixture);

      await token.write.approveWallet([addr1.account.address]);
      await token.write.mint([addr1.account.address, parseEther("1000")]);

      const tokenAsAddr1 = await hre.viem.getContractAt(
        "ChainEquityToken",
        token.address,
        { client: { wallet: addr1 } }
      );

      await expect(
        tokenAsAddr1.write.transfer([addr3.account.address, parseEther("10")])
      ).to.be.rejected;
    });
  });

  describe("Stock Splits", function () {
    it("Should execute stock split correctly", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);

      await token.write.approveWallet([addr1.account.address]);
      await token.write.mint([addr1.account.address, parseEther("1000")]);

      await token.write.executeSplit([7n]);

      const balance = await token.read.balanceOf([addr1.account.address]);
      const totalSupply = await token.read.totalSupply();
      const multiplier = await token.read.splitMultiplier();

      expect(formatEther(balance)).to.equal("7000");
      expect(formatEther(totalSupply)).to.equal("7000");
      expect(multiplier).to.equal(7n);
    });
  });

  describe("Symbol and Name Changes", function () {
    it("Should allow owner to change symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);

      await token.write.updateSymbol(["CEQX"]);
      expect(await token.read.symbol()).to.equal("CEQX");
    });

    it("Should allow owner to change name", async function () {
      const { token } = await loadFixture(deployTokenFixture);

      await token.write.updateName(["ChainEquity Pro"]);
      expect(await token.read.name()).to.equal("ChainEquity Pro");
    });
  });
});
