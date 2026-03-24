import { useMemo, useState } from 'react'
import { Implementation, toMetaMaskSmartAccount } from '@metamask/delegation-toolkit'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import type {
  DevDelegationConfig,
  DevDelegationStatus,
  SignedDelegationPayload,
} from './types'
import { useDelegation } from '../../context/DelegationContext'

import { API_BASE_URL } from '../../config'

type EthereumWindow = Window & {
  ethereum?: {
    request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  }
}

const MAX_AUTHORITY =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as const
const DEPLOY_SALT =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const
const BASE_SEPOLIA_HEX_CHAIN_ID = '0x14a34'
const BASE_SEPOLIA_CHAIN_ID = 84532
const BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org'
const BASE_SEPOLIA_EXPLORER_URL = 'https://sepolia.basescan.org'

type AgentInfoResponse = {
  success: boolean
  agentAddress: string
  chain: string
  error?: string
}

export function useDelegationSignature(config: DevDelegationConfig) {
  const { smartAccountAddress, setDelegationPayload, delegationPayload } = useDelegation()
  const [status, setStatus] = useState<DevDelegationStatus>('idle')
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')

  const buttonLabel = useMemo(() => {
    switch (status) {
      case 'signing':
        return 'Delegating Authority...'
      case 'success':
        return 'Authority Delegated'
      case 'error':
        return 'Retry Delegation'
      default:
        return 'Sign Delegation Transaction'
    }
  }, [status])

  async function switchToBaseSepolia(provider: NonNullable<EthereumWindow['ethereum']>) {
    if (!provider.request) {
      return
    }

    const currentChainId = await provider.request({ method: 'eth_chainId' })
    if (currentChainId === BASE_SEPOLIA_HEX_CHAIN_ID) {
      return
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_HEX_CHAIN_ID }],
      })
    } catch (switchError) {
      const errorCode =
        typeof switchError === 'object' && switchError !== null && 'code' in switchError
          ? (switchError as { code?: number }).code
          : undefined

      if (errorCode !== 4902) {
        throw switchError
      }

      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: BASE_SEPOLIA_HEX_CHAIN_ID,
            chainName: 'Base Sepolia',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [BASE_SEPOLIA_RPC_URL],
            blockExplorerUrls: [BASE_SEPOLIA_EXPLORER_URL],
          },
        ],
      })
    }
  }

  async function getAgentAddress() {
    const response = await fetch(`${API_BASE_URL}/api/agent`)

    if (!response.ok) {
      throw new Error(`Agent endpoint failed with status ${response.status}`)
    }

    const data = (await response.json()) as AgentInfoResponse
    if (!data.success || !data.agentAddress) {
      throw new Error(data.error || 'Agent address unavailable')
    }

    return data.agentAddress
  }

  function formatErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
      return error.message
    }

    if (typeof error === 'string') {
      return error
    }

    if (typeof error === 'object' && error !== null) {
      if ('shortMessage' in error && typeof error.shortMessage === 'string') {
        return error.shortMessage
      }

      if ('details' in error && typeof error.details === 'string') {
        return error.details
      }

      if ('message' in error && typeof error.message === 'string') {
        return error.message
      }
    }

    return 'Failed to delegate authority'
  }

  async function signDelegation() {
    const browserWindow = window as EthereumWindow

    if (!browserWindow.ethereum) {
      setStatus('error')
      setError('MetaMask not installed')
      setSignature('')
      setDelegationPayload(null)
      return
    }

    setStatus('signing')
    setError('')

    try {
      await switchToBaseSepolia(browserWindow.ethereum)

      const accountsResponse = await browserWindow.ethereum.request?.({
        method: 'eth_requestAccounts',
      })

      if (!Array.isArray(accountsResponse) || typeof accountsResponse[0] !== 'string') {
        throw new Error('No wallet account available')
      }

      const eoaAddress = accountsResponse[0]
      const agentAddress = await getAgentAddress()

      const walletClient = createWalletClient({
        account: eoaAddress as `0x${string}`,
        chain: baseSepolia,
        transport: custom(browserWindow.ethereum),
      })

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      })

      const userSmartAccount = await toMetaMaskSmartAccount({
        client: publicClient as any,
        implementation: Implementation.Hybrid,
        signer: { walletClient: walletClient as any },
        deployParams: [eoaAddress as `0x${string}`, [], [], []],
        deploySalt: DEPLOY_SALT,
      })
      
      console.log("✍️ [useDelegationSignature] Initiating delegation signing...");
      console.log("📍 Agent Address:", agentAddress);
      console.log("👤 Smart Account:", userSmartAccount.address);

      const delegation = {
        delegate: agentAddress as `0x${string}`,
        delegator: userSmartAccount.address,
        authority: MAX_AUTHORITY,
        salt: BigInt(Math.floor(Date.now() / 1000)),
        caveats: [],
      }

      const nextSignature = await userSmartAccount.signDelegation({
        delegation: delegation as any,
        chainId: BASE_SEPOLIA_CHAIN_ID,
      })

      console.log("✅ [useDelegationSignature] Delegation signed successfully!");

      const nextPayload: SignedDelegationPayload = {
        ...delegation,
        salt: delegation.salt.toString(),
        signature: nextSignature,
      }

      setDelegationPayload(nextPayload)
      setSignature(nextSignature)
      setStatus('success')
    } catch (signError) {
      const message = formatErrorMessage(signError)

      const normalizedMessage =
        message.includes('User rejected') || message.includes('denied')
          ? 'Signature request was cancelled'
          : message.includes('fetch')
            ? 'Backend not reachable. Start the backend server on port 3000.'
            : message

      setStatus('error')
      setError(normalizedMessage)
      setSignature('')
      setDelegationPayload(null)
    }
  }

  return {
    status,
    error,
    signature,
    buttonLabel,
    signDelegation,
    isBusy: status === 'signing',
    smartAccountAddress,
    delegationPayload,
    permissionSummary: {
      spendingLimit: config.spendingLimit,
      allowStaking: config.allowStaking,
      allowSwaps: config.allowSwaps,
      allowGasSponsorship: config.allowGasSponsorship,
    },
  }
}
