import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const isDev = import.meta.env.DEV
const chain = testnetBradbury
const endpoint = isDev ? '/api/genlayer' : undefined

export const GENLAYER_CONTRACT = import.meta.env.VITE_GENLAYER_CONTRACT as `0x${string}` | undefined

export const glReadClient = createClient({ chain, endpoint })

function makeWriteClient(address: string) {
  if (!address) throw new Error('Wallet not connected')
  return createClient({
    chain,
    endpoint,
    account: address as `0x${string}`,
    provider: (window as any).ethereum,
  })
}

export async function glGetOwner(): Promise<string> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  return glReadClient.readContract({
    address: GENLAYER_CONTRACT,
    functionName: 'get_owner',
    args: [],
  }) as Promise<string>
}

export async function glGetWagerCount(): Promise<string> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  return glReadClient.readContract({
    address: GENLAYER_CONTRACT,
    functionName: 'get_wager_count',
    args: [],
  }) as Promise<string>
}

export async function glGetWager(wagerId: number): Promise<Record<string, any>> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  const raw = await glReadClient.readContract({
    address: GENLAYER_CONTRACT,
    functionName: 'get_wager',
    args: [String(wagerId)],
  })
  return JSON.parse(raw as string)
}

export async function glGetWagersByCreator(creator: string): Promise<Record<string, any>[]> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  const raw = await glReadClient.readContract({
    address: GENLAYER_CONTRACT,
    functionName: 'get_wagers_by_creator',
    args: [creator],
  })
  return JSON.parse(raw as string)
}

export async function glGetWagersByOpponent(opponent: string): Promise<Record<string, any>[]> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  const raw = await glReadClient.readContract({
    address: GENLAYER_CONTRACT,
    functionName: 'get_wagers_by_opponent',
    args: [opponent],
  })
  return JSON.parse(raw as string)
}

export async function glGetWhitelist(): Promise<Record<string, boolean>> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  const raw = await glReadClient.readContract({
    address: GENLAYER_CONTRACT,
    functionName: 'get_whitelist',
    args: [],
  })
  return JSON.parse(raw as string)
}

export async function glCreateWager(
  address: string,
  question: string,
  sourceUrl: string,
  metric: string,
  threshold: string,
  opponent: string,
): Promise<string> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  return makeWriteClient(address).writeContract({
    address: GENLAYER_CONTRACT,
    functionName: 'create_wager',
    args: [question, sourceUrl, metric, threshold, opponent],
    value: BigInt(0),
  })
}

export async function glAcceptWager(address: string, wagerId: number): Promise<string> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  return makeWriteClient(address).writeContract({
    address: GENLAYER_CONTRACT,
    functionName: 'accept_wager',
    args: [wagerId],
    value: BigInt(0),
  })
}

export async function glResolveWager(address: string, wagerId: number): Promise<string> {
  if (!GENLAYER_CONTRACT) throw new Error('VITE_GENLAYER_CONTRACT is not set')
  return makeWriteClient(address).writeContract({
    address: GENLAYER_CONTRACT,
    functionName: 'resolve_wager',
    args: [wagerId],
    value: BigInt(0),
  })
}
