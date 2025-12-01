// src/lib/pinata.ts
//
// Pinata wrapper for encrypted file storage.
// Upload only ciphertext; never send plaintext or PHI.
//
// Env required:
// - PINATA_JWT: Pinata secret access token (JWT)
// Optional:
// - PINATA_GATEWAY_SUBDOMAIN: e.g., myproject (to form https://myproject.mypinata.cloud/ipfs/<cid>)
//
// This module centralizes Pinata usage so the rest of the app stays provider-agnostic.

type UploadMetadata = {
  fileName?: string
  mimeType?: string
  sha256?: string
}

type UploadResult = {
  cid: string
  size: number
}

const PIN_FILE_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud/ipfs'

function getAuthHeaders(): Record<string, string> {
  const jwt = process.env.PINATA_JWT
  const apiKey = process.env.PINATA_API_KEY
  const apiSecret = process.env.PINATA_API_SECRET
  if (jwt && jwt.trim().length > 0) {
    return { Authorization: `Bearer ${jwt}` }
  }
  if (apiKey && apiSecret) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    }
  }
  throw new Error('Pinata credentials missing. Set PINATA_JWT or PINATA_API_KEY and PINATA_API_SECRET.')
}

function getGatewayBase(): string {
  const subdomain = process.env.PINATA_GATEWAY_SUBDOMAIN?.trim()
  if (subdomain) {
    return `https://${subdomain}.mypinata.cloud/ipfs`
  }
  return DEFAULT_GATEWAY
}

export async function uploadEncryptedFile(
  ciphertext: Blob | Uint8Array,
  metadata: UploadMetadata = {}
): Promise<UploadResult> {
  const authHeaders = getAuthHeaders()

  // Build multipart form data
  const formData = new FormData()

  const filePart =
    ciphertext instanceof Blob
      ? ciphertext
      : new Blob([ciphertext], { type: metadata.mimeType || 'application/octet-stream' })

  const filename = metadata.fileName || 'encrypted.bin'
  formData.append('file', filePart, filename)

  // Optional Pinata metadata (stored off-chain at Pinata)
  const pinataMetadata = {
    name: filename,
    keyvalues: {
      mimeType: metadata.mimeType || 'application/octet-stream',
      sha256: metadata.sha256 || '',
      encrypted: 'true',
      app: 'LY-Project',
    },
  }
  formData.append('pinataMetadata', JSON.stringify(pinataMetadata))

  // Optional pinning options (leave defaults sane)
  const pinataOptions = {
    cidVersion: 1,
  }
  formData.append('pinataOptions', JSON.stringify(pinataOptions))

  const response = await fetch(PIN_FILE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const hint = text?.toLowerCase().includes('scope')
      ? ' Hint: Ensure your Pinata JWT has the pinFileToIPFS scope, or use API key/secret.'
      : ''
    throw new Error(`Pinata upload failed (${response.status}): ${text || response.statusText}.${hint}`)
  }

  const json = await response.json()
  // Response shape: { IpfsHash: string, PinSize: number, Timestamp: string }
  const cid: string = json.IpfsHash
  const size: number = json.PinSize ?? 0

  return { cid, size }
}

export async function getEncryptedFile(cid: string): Promise<ArrayBuffer> {
  if (!cid || typeof cid !== 'string') {
    throw new Error('Invalid CID')
  }

  // List of IPFS gateways to try (fallback if primary fails)
  const gateways = [
    getGatewayBase(), // Primary: Pinata gateway
    'https://ipfs.io/ipfs', // Public IPFS gateway
    'https://gateway.ipfs.io/ipfs', // Alternative public gateway
    'https://dweb.link/ipfs', // Protocol Labs gateway
  ]

  let lastError: Error | null = null

  // Try each gateway until one works
  for (const gatewayBase of gateways) {
    try {
      const url = `${gatewayBase}/${cid}`
      
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Gateway ${gatewayBase} returned ${res.status}: ${text || res.statusText}`)
      }

      const arrayBuffer = await res.arrayBuffer()
      
      // Verify we got actual data
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Gateway returned empty response')
      }

      return arrayBuffer
    } catch (err: any) {
      lastError = err
      console.warn(`Failed to fetch from ${gatewayBase}:`, err.message)
      // Continue to next gateway
      continue
    }
  }

  // All gateways failed
  throw new Error(
    `Failed to fetch file from all IPFS gateways. Last error: ${lastError?.message || 'Unknown error'}. ` +
    `CID: ${cid}. Please verify the file is pinned in Pinata.`
  )
}

export function gatewayUrlForCid(cid: string): string {
  const base = getGatewayBase()
  return `${base}/${cid}`
}


