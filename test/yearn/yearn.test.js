const { expect } = require("chai");
const hre = require("hardhat");
const { waffle, ethers } = hre;
const { provider } = waffle

const deployAndEnableConnector = require("../../scripts/deployAndEnableConnector.js")
const buildDSAv2 = require("../../scripts/buildDSAv2")
const encodeSpells = require("../../scripts/encodeSpells.js")
const getMasterSigner = require("../../scripts/getMasterSigner")

const tokens = require("../../scripts/constant/tokens");
const addresses = require("../../scripts/constant/addresses");
const abis = require("../../scripts/constant/abis");
const connectV2YearnArtifacts = require("../../artifacts/contracts/mainnet/connectors/yearn_v2/main.sol/ConnectV2YearnV2.json")

const toBytes32 = (bn) => {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};
const setStorageAt = async (address, index, value) => {
    await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
    await ethers.provider.send("evm_mine", []); // Just mines to the next block
};

describe("Yearn", function () {
    const connectorName = "YEARN-TEST-A"
    
    let dsaWallet0
    let masterSigner;
    let instaConnectorsV2;
    let connector;
    
    const wallets = provider.getWallets()
    const [wallet0, wallet1, wallet2, wallet3] = wallets
    before(async () => {
        masterSigner = await getMasterSigner(wallet3)
        instaConnectorsV2 = await ethers.getContractAt(abis.core.connectorsV2, addresses.core.connectorsV2);
        connector = await deployAndEnableConnector({
            connectorName,
            contractArtifact: connectV2YearnArtifacts,
            signer: masterSigner,
            connectors: instaConnectorsV2
        })
        console.log("Connector address", connector.address)
  })

  it("Should have contracts deployed.", async function () {
    expect(!!instaConnectorsV2.address).to.be.true;
    expect(!!connector.address).to.be.true;
    expect(!!masterSigner.address).to.be.true;
  });

  describe("DSA wallet setup", function () {
    it("Should build DSA v2", async function () {
        dsaWallet0 = await buildDSAv2(wallet0.address)
        expect(!!dsaWallet0.address).to.be.true;
    });

    it("Deposit ETH into DSA wallet", async function () {
        await wallet0.sendTransaction({
            to: dsaWallet0.address,
            value: ethers.utils.parseEther("10")
        });
        expect(await ethers.provider.getBalance(dsaWallet0.address)).to.be.gte(ethers.utils.parseEther("10"));
    });
  });

  describe("Main", function () {

    it("Should increase the DAI balance to 100 DAI", async function () {
        const DAI = new ethers.Contract(tokens.dai.address, abis.basic.erc20, ethers.provider);
        const DAI_SLOT = 2;
        const locallyManipulatedBalance = ethers.utils.parseEther("100");
        
        // Get storage slot index
        const index = ethers.utils.solidityKeccak256(
            ["uint256", "uint256"],
            [dsaWallet0.address, DAI_SLOT]
        );
        // Manipulate local balance (needs to be bytes32 string)
        await setStorageAt(
            tokens.dai.address,
            index.toString(),
            toBytes32(locallyManipulatedBalance).toString()
        );

        // Get DAI balance
        const balance = await DAI.balanceOf(dsaWallet0.address);
        expect(await ethers.BigNumber.from(balance).eq(ethers.utils.parseEther("100")));
    });

    it("Should deposit and withdraw 50 DAI in/out the Yearn Vault", async function () {
        const DAI = new ethers.Contract(tokens.dai.address, abis.basic.erc20, ethers.provider);
        const DAI_VAULT = '0xdA816459F1AB5631232FE5e97a05BBBb94970c95';
        const amount = ethers.utils.parseEther("50") // 50 DAI
        const setId = "132456";
        const spells = [
            {
                connector: connectorName,
                method: "deposit",
                args: [DAI_VAULT, amount, 0, setId]
            },
            {
                connector: connectorName,
                method: "withdraw",
                args: [DAI_VAULT, amount, setId, 0]
            }
        ]

        const tx = await dsaWallet0.connect(wallet0).cast(...encodeSpells(spells), wallet0.address);
        await tx.wait();

        // Get DAI balance
        const balance = await DAI.balanceOf(dsaWallet0.address);
        expect(await ethers.BigNumber.from(balance).eq(ethers.utils.parseEther("100")));
    });

    it("Should deposit 70 DAI in the Yearn Vault", async function () {
        const DAI_VAULT = '0xdA816459F1AB5631232FE5e97a05BBBb94970c95';
        const DAI = new ethers.Contract(tokens.dai.address, abis.basic.erc20, ethers.provider);
        const YVDAI = new ethers.Contract(DAI_VAULT, abis.basic.erc20, ethers.provider);
        const amount = ethers.utils.parseEther("70") // 70 DAI
        const setId = "568445";
        const spells = [
            {
                connector: connectorName,
                method: "deposit",
                args: [DAI_VAULT, amount, 0, setId]
            }
        ]

        const tx = await dsaWallet0.connect(wallet0).cast(...encodeSpells(spells), wallet0.address);
        await tx.wait();

        // Get DAI balance
        const yvDAIBalance = await YVDAI.balanceOf(dsaWallet0.address);
        const daiBalance = await DAI.balanceOf(dsaWallet0.address);
        const correctDaiBalance = await ethers.BigNumber.from(daiBalance).eq(ethers.utils.parseEther("30"));
        const correctYVDaiBalance = await ethers.BigNumber.from(yvDAIBalance).lte(ethers.utils.parseEther("70"));
        expect(correctDaiBalance && correctYVDaiBalance);
    });
  })
})
