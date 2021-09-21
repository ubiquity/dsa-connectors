# DSA connectors

Connectors are standard proxy logics contract that let DeFi Smart Account (DSA) interact with various smart contracts, and make the important actions accessible like cross protocol interoperability.

DSAs are powerful because they can easily be extended with connectors. Every new connector that is added is immediately usable by any developer building on top of DSAs. Connectors can either be base connectors to protocols, auth connectors, higher level connectors with more specific use cases like optimized lending, or connectors to native liquidity pools.

You can create a PR to request a support for specific protocol or external contracts. The process to add a new connector is explained below.

List of all the mainnet connector for referrence is [here](https://github.com/Instadapp/dsa-connectors/tree/main/contracts/mainnet/connectors)

## How to add a new connector

You can create a new PR to add a new connector. To get the PR merged, certain requirements needs to be met which will be explained here.

### New connector should follow the current directory structure

Common files for all connectors are in `contracts/common` directory.

* `math.sol` has methods for mathematical operations (`DSMath`)
* `interfaces.sol` contains the common interfaces
  * `TokenInterface` for ERC-20 interface including WETH
* `stores.sol` contains the global constants as well as methods `getId` & `setId` (`Stores`)
* `basic.sol` inherits `DSMath` & `Stores` contracts. This contains few details explained below
  * Wrapping & unwrapping ETH (`convertEthToWeth` & `convertWethToEth`)
  * Getting token & ETH balance of DSA

Connectors are under `contracts/connectors` directory, and should be formatted as follows:

* Connector events should be in a separate contract: `events.sol`
* Interfaces should be defined in a seperate file: `interface.sol`
* If the connector has helper methods & constants (including interface instances), this should be defined in a separate file: `helpers.sol`
  * `Helpers` contract should inherit `Basic` contract from common directory
  * If the connector doesn't have any helper methods, the main contract should inherit `Basic` contract
* The main logic of the contract should be under `main.sol`, and the contract should inherit `Helpers` (if exists, otherwise `Basic`) & `Events`

Few things to consider while writing the connector:

* Connector should have a public constant string declared `name`, which will be the name of the connector. This will be versioned. Ex: `Compound-v1`
* Contract name should start with `ConnectV2` appended with protocol name. Eg: `ConnectV2Compound`
* User interacting methods (`external` methods) will not be emitting events, rather the methods will be returning 2 variables:
  * `_eventName` of `string` type: This will be the event signture defined in the `Events` contract. Ex: `LogDeposit(address,address,uint256,uint256,uint256)`
  * `_eventParam` of `bytes` type: This will be the abi encoded event parameters
* The contracts should not have `selfdestruct()`
* The contracts should not have `delegatecall()`
* Use `uint(-1)` of `type(uint256).max` for maximum amount everywhere
* Use `ethAddr` (declared in `Stores`) to denote Ethereum (non-ERC20)
* Use `address(this)` instead of `msg.sender` for fetching balance on-chain, etc
* Only `approve()` (declared in `Basic`) limited amount while giving ERC20 allowance, which strictly needs to be 0 by the end of the spell.
* User interacting functions should have natspec comments(@dev, @notice, @param). 
* Use `getUint()` (declared in `Stores`) for getting value that saved from previous spell
* Use `setUint()` (declared in `Stores`) for setting value to save for the future spell

### Support

If you can't find something you're looking for or have any questions, ask them at our developers community on [Discord](https://discord.gg/83vvrnY) or simply send an [Email](mailto:info@instadapp.io).
