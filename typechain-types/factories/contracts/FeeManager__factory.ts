/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  BigNumberish,
  AddressLike,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";
import type { NonPayableOverrides } from "../../common";
import type {
  FeeManager,
  FeeManagerInterface,
} from "../../contracts/FeeManager";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "initialFeeCollector",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "initialFeePercentage",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "oldCollector",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newCollector",
        type: "address",
      },
    ],
    name: "FeeCollectorUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "oldPercentage",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newPercentage",
        type: "uint256",
      },
    ],
    name: "FeePercentageUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "FeesCollected",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_FEE",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "calculateFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeCollector",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feePercentage",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newCollector",
        type: "address",
      },
    ],
    name: "setFeeCollector",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newPercentage",
        type: "uint256",
      },
    ],
    name: "setFeePercentage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b506040516105a13803806105a183398101604081905261002f9161011a565b338061005657604051631e4fbdf760e01b8152600060048201526024015b60405180910390fd5b61005f816100ca565b506101f48111156100a15760405162461bcd60e51b815260206004820152600c60248201526b08ccaca40e8dede40d0d2ced60a31b604482015260640161004d565b600180546001600160a01b0319166001600160a01b039390931692909217909155600255610154565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6000806040838503121561012d57600080fd5b82516001600160a01b038116811461014457600080fd5b6020939093015192949293505050565b61043e806101636000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c8063a42dce8011610066578063a42dce80146100f6578063ae06c1b714610109578063bc063e1a1461011c578063c415b95c14610125578063f2fde38b1461013857600080fd5b8063715018a6146100985780638da5cb5b146100a257806399a5d747146100cc578063a001ecdd146100ed575b600080fd5b6100a061014b565b005b6000546001600160a01b03165b6040516001600160a01b0390911681526020015b60405180910390f35b6100df6100da366004610378565b61015f565b6040519081526020016100c3565b6100df60025481565b6100a0610104366004610391565b610182565b6100a0610117366004610378565b610233565b6100df6101f481565b6001546100af906001600160a01b031681565b6100a0610146366004610391565b6102bd565b6101536102fb565b61015d6000610328565b565b60006127106002548361017291906103c1565b61017c91906103e6565b92915050565b61018a6102fb565b6001600160a01b0381166101d75760405162461bcd60e51b815260206004820152600f60248201526e496e76616c6964206164647265737360881b60448201526064015b60405180910390fd5b6001546040516001600160a01b038084169216907f5d16ad41baeb009cd23eb8f6c7cde5c2e0cd5acf4a33926ab488875c37c37f3890600090a3600180546001600160a01b0319166001600160a01b0392909216919091179055565b61023b6102fb565b6101f481111561027c5760405162461bcd60e51b815260206004820152600c60248201526b08ccaca40e8dede40d0d2ced60a31b60448201526064016101ce565b60025460408051918252602082018390527fb27c12a91635e11c22bffa7bd8e0a8735da52b94aaefd7f249776c7590ba7894910160405180910390a1600255565b6102c56102fb565b6001600160a01b0381166102ef57604051631e4fbdf760e01b8152600060048201526024016101ce565b6102f881610328565b50565b6000546001600160a01b0316331461015d5760405163118cdaa760e01b81523360048201526024016101ce565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b60006020828403121561038a57600080fd5b5035919050565b6000602082840312156103a357600080fd5b81356001600160a01b03811681146103ba57600080fd5b9392505050565b808202811582820484141761017c57634e487b7160e01b600052601160045260246000fd5b60008261040357634e487b7160e01b600052601260045260246000fd5b50049056fea2646970667358221220e8d8e93c0c191928d246cf7751747f6cd530f59757648f3320961d05446e8c3d64736f6c63430008140033";

type FeeManagerConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: FeeManagerConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class FeeManager__factory extends ContractFactory {
  constructor(...args: FeeManagerConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    initialFeeCollector: AddressLike,
    initialFeePercentage: BigNumberish,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(
      initialFeeCollector,
      initialFeePercentage,
      overrides || {}
    );
  }
  override deploy(
    initialFeeCollector: AddressLike,
    initialFeePercentage: BigNumberish,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(
      initialFeeCollector,
      initialFeePercentage,
      overrides || {}
    ) as Promise<
      FeeManager & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): FeeManager__factory {
    return super.connect(runner) as FeeManager__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): FeeManagerInterface {
    return new Interface(_abi) as FeeManagerInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): FeeManager {
    return new Contract(address, _abi, runner) as unknown as FeeManager;
  }
}
