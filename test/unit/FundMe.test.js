const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")

describe("FundMe", function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })

    describe("constructor", function () {
        it("sets the aggregator addresses correctly", async function () {
            const response = await fundMe.getPricefeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", function () {
        it("fails if you don't send enough ether", async function () {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            )
        })
    })

    it("updates the getAddressToAmountFunded", async function () {
        await fundMe.fund({ value: sendValue })
        const response = await fundMe.getAddressToAmountFunded(deployer)
        assert.equal(response.toString(), sendValue.toString())
    })

    it("adds funder to array of s_funders", async function () {
        await fundMe.fund({ value: sendValue })
        const funder = await fundMe.s_funders(0)
        assert.equal(funder, deployer)
    })

    describe("withdraw", function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })
        it("withdraws money from the contract and assigns it to the right person", async function () {
            const initialFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const initialDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)

            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const totalGasPrice = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                initialDeployerBalance.add(initialFundMeBalance).toString(),
                endingDeployerBalance
                    .add(endingFundMeBalance)
                    .add(totalGasPrice)
                    .toString()
            )
        })

        it("withdraws money from the contract in case of multiple s_funders", async function () {
            const accounts = await ethers.getSigners()

            for (i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const initialFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const initialDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)

            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const totalGasPrice = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                initialDeployerBalance.add(initialFundMeBalance).toString(),
                endingDeployerBalance
                    .add(endingFundMeBalance)
                    .add(totalGasPrice)
                    .toString()
            )
            assert.equal(fundMe.s_funders.length, 0)

            for (i = 1; i > 6; i++) {
                assert.equals(
                    fundMe.getAddressToAmountFunded(accounts[i].address, 0)
                )
            }
        })

        it("CHEAPER withdraws money from the contract in case of multiple s_funders", async function () {
            const accounts = await ethers.getSigners()

            for (i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i]
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const initialFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const initialDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait(1)

            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const totalGasPrice = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            )

            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                initialDeployerBalance.add(initialFundMeBalance).toString(),
                endingDeployerBalance
                    .add(endingFundMeBalance)
                    .add(totalGasPrice)
                    .toString()
            )
            assert.equal(fundMe.s_funders.length, 0)

            for (i = 1; i > 6; i++) {
                assert.equals(
                    fundMe.getAddressToAmountFunded(accounts[i].address, 0)
                )
            }
        })

        it("only allows deployers to withdraw", async function () {
            const accounts = await ethers.getSigners()
            const maliciousWithdrawer = await fundMe.connect(accounts[1])
            await expect(maliciousWithdrawer.withdraw()).to.be.revertedWith(
                "FundMe__NotOwner"
            )
        })
    })
})
