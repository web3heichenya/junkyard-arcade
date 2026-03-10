export type NetworkKey = 'sepolia' | 'mainnet';

export type AddressPreset = {
  factory: string;
  oracle: string;
  configGuard: string;
  buyGuard: string;
  paymentToken: string;
};

const ZERO = '0x0000000000000000000000000000000000000000';

const FACTORY_SEPOLIA = process.env.NEXT_PUBLIC_FACTORY_SEPOLIA ?? '';
const DEFAULT_ORACLE_SEPOLIA = process.env.NEXT_PUBLIC_DEFAULT_ORACLE_SEPOLIA ?? '';
const DEFAULT_CONFIG_GUARD_SEPOLIA = process.env.NEXT_PUBLIC_DEFAULT_CONFIG_GUARD_SEPOLIA ?? ZERO;
const DEFAULT_BUY_GUARD_SEPOLIA = process.env.NEXT_PUBLIC_DEFAULT_BUY_GUARD_SEPOLIA ?? ZERO;
const DEFAULT_PAYMENT_TOKEN_SEPOLIA = process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN_SEPOLIA ?? ZERO;

const FACTORY_MAINNET = process.env.NEXT_PUBLIC_FACTORY_MAINNET ?? '';
const DEFAULT_ORACLE_MAINNET = process.env.NEXT_PUBLIC_DEFAULT_ORACLE_MAINNET ?? '';
const DEFAULT_CONFIG_GUARD_MAINNET = process.env.NEXT_PUBLIC_DEFAULT_CONFIG_GUARD_MAINNET ?? ZERO;
const DEFAULT_BUY_GUARD_MAINNET = process.env.NEXT_PUBLIC_DEFAULT_BUY_GUARD_MAINNET ?? ZERO;
const DEFAULT_PAYMENT_TOKEN_MAINNET = process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_TOKEN_MAINNET ?? ZERO;

export const ADDRESS_BOOK: Record<NetworkKey, AddressPreset> = {
  sepolia: {
    factory: FACTORY_SEPOLIA,
    oracle: DEFAULT_ORACLE_SEPOLIA,
    configGuard: DEFAULT_CONFIG_GUARD_SEPOLIA,
    buyGuard: DEFAULT_BUY_GUARD_SEPOLIA,
    paymentToken: DEFAULT_PAYMENT_TOKEN_SEPOLIA,
  },
  mainnet: {
    factory: FACTORY_MAINNET,
    oracle: DEFAULT_ORACLE_MAINNET,
    configGuard: DEFAULT_CONFIG_GUARD_MAINNET,
    buyGuard: DEFAULT_BUY_GUARD_MAINNET,
    paymentToken: DEFAULT_PAYMENT_TOKEN_MAINNET,
  },
};

export const NETWORK_LABELS: Record<NetworkKey, string> = {
  sepolia: 'Base Sepolia',
  mainnet: 'Ethereum Mainnet',
};
