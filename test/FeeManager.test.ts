import { expect } from "chai"
import { ZeroAddress } from "ethers"
import { ethers } from "hardhat"
import type { FeeManager } from "../typechain-types/contracts/FeeManager"
import type { FeeManager__factory } from "../typechain-types/factories/contracts/FeeManager__factory"

describe("FeeManager", function () {
  async function deployFeeManager() {
    const [owner, collector, user] = await ethers.getSigners()
    const initialFee = 100

    const FeeManager = (await ethers.getContractFactory("FeeManager")) as unknown as FeeManager__factory
    const feeManager = (await FeeManager.deploy(collector.address, initialFee)) as unknown as FeeManager
    await feeManager.waitForDeployment()

    return { feeManager, owner, collector, user, initialFee }
  }

  describe("Constructor", function () {
    it("Should set the correct initial values", async function () {
      const { feeManager, owner, collector, initialFee } = await deployFeeManager()
      
      expect(await feeManager.feeCollector()).to.equal(collector.address)
      expect(await feeManager.feePercentage()).to.equal(initialFee)
      expect(await feeManager.owner()).to.equal(owner.address)
    })

    it("Should revert if initial fee is too high", async function () {
      const [, collector] = await ethers.getSigners()
      const FeeManager = (await ethers.getContractFactory("FeeManager")) as unknown as FeeManager__factory
      
      await expect(
        FeeManager.deploy(collector.address, 501)
      ).to.be.revertedWith("Fee too high")
    })
  })

  describe("setFeeCollector", function () {
    it("Should update fee collector", async function () {
      const { feeManager, user } = await deployFeeManager()
      
      await feeManager.setFeeCollector(user.address)
      expect(await feeManager.feeCollector()).to.equal(user.address)
    })

    it("Should emit FeeCollectorUpdated event", async function () {
      const { feeManager, collector, user } = await deployFeeManager()
      
      await expect(feeManager.setFeeCollector(user.address))
        .to.emit(feeManager, "FeeCollectorUpdated")
        .withArgs(collector.address, user.address)
    })

    it("Should revert if called by non-owner", async function () {
      const { feeManager, user } = await deployFeeManager()
      
      await expect(
        feeManager.connect(user).setFeeCollector(user.address)
      ).to.be.revertedWithCustomError(feeManager, "OwnableUnauthorizedAccount")
        .withArgs(user.address)
    })

    it("Should revert if new collector is zero address", async function () {
      const { feeManager } = await deployFeeManager()
      
      await expect(
        feeManager.setFeeCollector(ZeroAddress)
      ).to.be.revertedWith("Invalid address")
    })
  })

  describe("setFeePercentage", function () {
    it("Should update fee percentage", async function () {
      const { feeManager } = await deployFeeManager()
      
      await feeManager.setFeePercentage(200)
      expect(await feeManager.feePercentage()).to.equal(200)
    })

    it("Should emit FeePercentageUpdated event", async function () {
      const { feeManager, initialFee } = await deployFeeManager()
      
      await expect(feeManager.setFeePercentage(200))
        .to.emit(feeManager, "FeePercentageUpdated")
        .withArgs(initialFee, 200)
    })

    it("Should revert if fee is too high", async function () {
      const { feeManager } = await deployFeeManager()
      
      await expect(
        feeManager.setFeePercentage(501)
      ).to.be.revertedWith("Fee too high")
    })

    it("Should revert if called by non-owner", async function () {
      const { feeManager, user } = await deployFeeManager()
      
      await expect(
        feeManager.connect(user).setFeePercentage(200)
      ).to.be.revertedWithCustomError(feeManager, "OwnableUnauthorizedAccount")
        .withArgs(user.address)
    })
  })

  describe("calculateFee", function () {
    it("Should calculate fee correctly", async function () {
      const { feeManager } = await deployFeeManager()
      const amount = ethers.parseEther("100")
      const expectedFee = ethers.parseEther("1")
      expect(await feeManager.calculateFee(amount)).to.equal(expectedFee)
    })

    it("Should handle zero amount", async function () {
      const { feeManager } = await deployFeeManager()
      expect(await feeManager.calculateFee(0)).to.equal(0)
    })

    it("Should handle small amounts", async function () {
      const { feeManager } = await deployFeeManager()
      const amount = ethers.parseEther("0.0001")
      const fee = await feeManager.calculateFee(amount)
      expect(fee).to.be.gt(0)
    })
  })
}) 