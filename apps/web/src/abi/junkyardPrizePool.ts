export const junkyardPrizePoolAbi = [
  {
    type: 'function',
    name: 'whitelistAsset',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetContract', type: 'address' },
      { name: 'whitelisted', type: 'bool' },
      { name: 'maxShareBps', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'depositERC20',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenContract', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'depositERC721',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'depositERC1155',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenContract', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isAssetWhitelisted',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: 'whitelisted', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getAssetConfig',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'configured', type: 'bool' },
      { name: 'maxShareBps', type: 'uint16' },
    ],
  },
] as const;
