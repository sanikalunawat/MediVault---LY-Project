'use client'

import React, { useState, useRef } from 'react'

type UploadResult = {
  cid: string
  size: number
  sha256: string
  keyBase64: string
  ivBase64: string
  fileName: string
  mimeType: string
}

type Props = {
  onUploaded?: (result: UploadResult) => void
  accept?: string
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
}

async function sha256ArrayBuffer(data: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuf))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function generateAesGcmKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return arrayBufferToBase64(raw)
}

async function encryptAesGcm(plaintext: ArrayBuffer, key: CryptoKey): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  )
  return { iv, ciphertext }
}

export default function FileUploader({ onUploaded, accept }: Props) {
  const [status, setStatus] = useState<string>('')
  const [result, setResult] = useState<UploadResult | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File) {
    try {
      setStatus('Encrypting...')
      setResult(null)
      const fileBuf = await file.arrayBuffer()

      const key = await generateAesGcmKey()
      const { iv, ciphertext } = await encryptAesGcm(fileBuf, key)
      const sha256 = await sha256ArrayBuffer(ciphertext)

      setStatus('Uploading...')
      const form = new FormData()
      const cipherBlob = new Blob([ciphertext], { type: 'application/octet-stream' })
      form.append('file', cipherBlob, `${file.name}.enc`)
      form.append('fileName', file.name)
      form.append('mimeType', file.type || 'application/pdf')
      form.append('sha256', sha256)

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Upload failed with ${res.status}`)
      }
      const json = await res.json()

      const keyBase64 = await exportKeyBase64(key)
      const ivBase64 = arrayBufferToBase64(iv.buffer)

      const uploadResult: UploadResult = {
        cid: json.cid,
        size: json.size,
        sha256,
        keyBase64,
        ivBase64,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
      }
      setResult(uploadResult)
      setStatus('Uploaded')
      onUploaded?.(uploadResult)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setStatus(`Error: ${msg}`)
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      void handleFile(f)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept || 'application/pdf'}
          onChange={onChange}
        />
      </div>
      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
      {result ? (
        <div className="text-sm break-words">
          <div><strong>CID:</strong> {result.cid}</div>
          <div><strong>SHA-256 (ciphertext):</strong> {result.sha256}</div>
          <div><strong>Key (base64):</strong> {result.keyBase64}</div>
          <div><strong>IV (base64):</strong> {result.ivBase64}</div>
          <div><strong>Size (bytes):</strong> {result.size}</div>
        </div>
      ) : null}
    </div>
  )
}


