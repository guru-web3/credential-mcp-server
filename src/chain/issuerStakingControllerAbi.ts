/**
 * Issuer Staking Controller ABI for MOCA stake/unstake/claim.
 * Matches credential-dashboard src/contract/issuerStakingController.ts
 */
export const ISSUER_STAKING_CONTROLLER_ABI = [
  {
    type: 'function',
    name: 'stakeMoca',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'initiateUnstake',
    inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimUnstake',
    inputs: [{ name: 'timestamps', type: 'uint256[]', internalType: 'uint256[]' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'issuers',
    inputs: [{ name: 'issuer', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'mocaStaked', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalPendingUnstakedMoca',
    inputs: [{ name: 'issuer', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'totalPendingUnstake', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pendingUnstakedMoca',
    inputs: [
      { name: 'issuer', type: 'address', internalType: 'address' },
      { name: 'timestamp', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'pendingUnstake', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'UNSTAKE_DELAY',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_SINGLE_STAKE_AMOUNT',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
