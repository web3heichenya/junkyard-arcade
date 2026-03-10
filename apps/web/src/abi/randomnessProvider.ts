export const randomnessProviderAbi = [
  {
    type: 'function',
    name: 'getRequestPrice',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'price', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'estimateRequestPrice',
    stateMutability: 'view',
    inputs: [{ name: 'gasPriceWei', type: 'uint256' }],
    outputs: [{ name: 'price', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isFulfilled',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    outputs: [{ name: 'fulfilled', type: 'bool' }],
  },
] as const;
