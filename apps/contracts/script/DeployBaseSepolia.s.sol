// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {JunkyardFactory} from "../src/core/JunkyardFactory.sol";
import {JunkyardGlobalConfig} from "../src/core/JunkyardGlobalConfig.sol";
import {JunkyardNFT} from "../src/core/JunkyardNFT.sol";
import {JunkyardPrizePool} from "../src/core/JunkyardPrizePool.sol";
import {JunkyardSeries} from "../src/core/JunkyardSeries.sol";
import {OpenBuyGuard} from "../src/guards/buy/OpenBuyGuard.sol";
import {OwnerConfigGuard} from "../src/guards/config/OwnerConfigGuard.sol";
import {ChainlinkVRFProvider} from "../src/oracles/ChainlinkVRFProvider.sol";

contract DeployBaseSepolia is Script {
    using stdJson for string;

    uint256 internal constant DEFAULT_PROTOCOL_FEE_BPS = 250;
    uint32 internal constant DEFAULT_CALLBACK_GAS_LIMIT = 200_000;
    uint16 internal constant DEFAULT_REQUEST_CONFIRMATIONS = 3;
    address internal constant DEFAULT_BASE_SEPOLIA_VRF_WRAPPER = 0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed;

    struct Deployment {
        address deployer;
        address owner;
        address feeRecipient;
        address vrfWrapper;
        address ownerConfigGuard;
        address openBuyGuard;
        address oracle;
        address seriesImplementation;
        address nftImplementation;
        address prizePoolImplementation;
        address globalConfig;
        address factory;
        uint256 chainId;
        uint256 blockNumber;
        uint256 protocolFeeBps;
        uint256 callbackGasLimit;
        uint256 requestConfirmations;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address owner = vm.envOr("DEPLOY_OWNER", deployer);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
        uint256 protocolFeeBps = vm.envOr("PROTOCOL_FEE_BPS", DEFAULT_PROTOCOL_FEE_BPS);
        uint32 callbackGasLimit = uint32(vm.envOr("VRF_CALLBACK_GAS_LIMIT", uint256(DEFAULT_CALLBACK_GAS_LIMIT)));
        uint16 requestConfirmations =
            uint16(vm.envOr("VRF_REQUEST_CONFIRMATIONS", uint256(DEFAULT_REQUEST_CONFIRMATIONS)));
        address vrfWrapper = vm.envOr("BASE_SEPOLIA_VRF_WRAPPER", DEFAULT_BASE_SEPOLIA_VRF_WRAPPER);

        vm.startBroadcast(deployerPrivateKey);

        OwnerConfigGuard ownerConfigGuard = new OwnerConfigGuard();
        OpenBuyGuard openBuyGuard = new OpenBuyGuard();
        ChainlinkVRFProvider oracle = new ChainlinkVRFProvider(vrfWrapper, callbackGasLimit, requestConfirmations);

        JunkyardSeries seriesImplementation = new JunkyardSeries();
        JunkyardNFT nftImplementation = new JunkyardNFT();
        JunkyardPrizePool prizePoolImplementation = new JunkyardPrizePool();

        JunkyardGlobalConfig globalConfig = new JunkyardGlobalConfig(
            owner,
            protocolFeeBps,
            feeRecipient,
            address(seriesImplementation),
            address(nftImplementation),
            address(prizePoolImplementation)
        );
        JunkyardFactory factory = new JunkyardFactory(address(globalConfig), owner);

        globalConfig.setOracleWhitelist(address(oracle), true);
        globalConfig.setGuardWhitelist(address(ownerConfigGuard), true);
        globalConfig.setGuardWhitelist(address(openBuyGuard), true);

        vm.stopBroadcast();

        deployment = Deployment({
            deployer: deployer,
            owner: owner,
            feeRecipient: feeRecipient,
            vrfWrapper: vrfWrapper,
            ownerConfigGuard: address(ownerConfigGuard),
            openBuyGuard: address(openBuyGuard),
            oracle: address(oracle),
            seriesImplementation: address(seriesImplementation),
            nftImplementation: address(nftImplementation),
            prizePoolImplementation: address(prizePoolImplementation),
            globalConfig: address(globalConfig),
            factory: address(factory),
            chainId: block.chainid,
            blockNumber: block.number,
            protocolFeeBps: protocolFeeBps,
            callbackGasLimit: callbackGasLimit,
            requestConfirmations: requestConfirmations
        });

        _writeDeployment(deployment);
        _logDeployment(deployment);
    }

    function _writeDeployment(Deployment memory deployment) internal {
        string memory root = "deployment";
        vm.serializeAddress(root, "deployer", deployment.deployer);
        vm.serializeAddress(root, "owner", deployment.owner);
        vm.serializeAddress(root, "feeRecipient", deployment.feeRecipient);
        vm.serializeAddress(root, "vrfWrapper", deployment.vrfWrapper);
        vm.serializeAddress(root, "ownerConfigGuard", deployment.ownerConfigGuard);
        vm.serializeAddress(root, "openBuyGuard", deployment.openBuyGuard);
        vm.serializeAddress(root, "oracle", deployment.oracle);
        vm.serializeAddress(root, "seriesImplementation", deployment.seriesImplementation);
        vm.serializeAddress(root, "nftImplementation", deployment.nftImplementation);
        vm.serializeAddress(root, "prizePoolImplementation", deployment.prizePoolImplementation);
        vm.serializeAddress(root, "globalConfig", deployment.globalConfig);
        string memory finalJson = vm.serializeAddress(root, "factory", deployment.factory);
        finalJson = vm.serializeUint(root, "chainId", deployment.chainId);
        finalJson = vm.serializeUint(root, "blockNumber", deployment.blockNumber);
        finalJson = vm.serializeUint(root, "protocolFeeBps", deployment.protocolFeeBps);
        finalJson = vm.serializeUint(root, "callbackGasLimit", deployment.callbackGasLimit);
        finalJson = vm.serializeUint(root, "requestConfirmations", deployment.requestConfirmations);

        vm.writeJson(finalJson, "deployments/base-sepolia.json");
    }

    function _logDeployment(Deployment memory deployment) internal pure {
        console2.log("deployer", deployment.deployer);
        console2.log("owner", deployment.owner);
        console2.log("feeRecipient", deployment.feeRecipient);
        console2.log("vrfWrapper", deployment.vrfWrapper);
        console2.log("ownerConfigGuard", deployment.ownerConfigGuard);
        console2.log("openBuyGuard", deployment.openBuyGuard);
        console2.log("oracle", deployment.oracle);
        console2.log("seriesImplementation", deployment.seriesImplementation);
        console2.log("nftImplementation", deployment.nftImplementation);
        console2.log("prizePoolImplementation", deployment.prizePoolImplementation);
        console2.log("globalConfig", deployment.globalConfig);
        console2.log("factory", deployment.factory);
        console2.log("chainId", deployment.chainId);
        console2.log("blockNumber", deployment.blockNumber);
    }
}
