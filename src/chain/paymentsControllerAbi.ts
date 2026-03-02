/**
 * Payments Controller ABI for MCP on-chain tools.
 * createSchema, updateSchemaFee, and SchemaCreated are kept identical to
 * credential-dashboard/src/contract/paymentsController.ts so encoding matches.
 */
export const PAYMENTS_CONTROLLER_ABI = [
  {
    type: 'function',
    name: 'createSchema',
    inputs: [{ name: 'fee', type: 'uint128', internalType: 'uint128' }],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateSchemaFee',
    inputs: [
      { name: 'schemaId', type: 'bytes32', internalType: 'bytes32' },
      { name: 'newFee', type: 'uint128', internalType: 'uint128' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'verifier', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint128', internalType: 'uint128' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'verifier', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint128', internalType: 'uint128' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimFees',
    inputs: [{ name: 'issuer', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getVerifier',
    inputs: [{ name: 'verifier', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct DataTypes.Verifier',
        components: [
          { name: 'assetManagerAddress', type: 'address', internalType: 'address' },
          { name: 'currentBalance', type: 'uint128', internalType: 'uint128' },
          { name: 'totalNetFeesAccrued', type: 'uint128', internalType: 'uint128' },
          { name: 'totalClaimed', type: 'uint128', internalType: 'uint128' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getIssuer',
    inputs: [{ name: 'issuer', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct DataTypes.Issuer',
        components: [
          { name: 'assetManagerAddress', type: 'address', internalType: 'address' },
          { name: 'totalVerified', type: 'uint128', internalType: 'uint128' },
          { name: 'totalNetFeesAccrued', type: 'uint128', internalType: 'uint128' },
          { name: 'totalClaimed', type: 'uint128', internalType: 'uint128' },
          { name: 'totalSchemas', type: 'uint128', internalType: 'uint128' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'SchemaCreated',
    inputs: [
      { name: 'schemaId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'issuer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'fee', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const;
