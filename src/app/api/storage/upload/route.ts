import { NextRequest, NextResponse } from 'next/server'
import { uploadEncryptedFile } from '@/lib/pinata'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const fileName = (form.get('fileName') as string) || 'encrypted.bin'
    const mimeType = (form.get('mimeType') as string) || 'application/octet-stream'
    const sha256 = (form.get('sha256') as string) || ''

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file field (must be Blob/File) named "file"' }, { status: 400 })
    }

    // Do not accept plaintext uploads; this endpoint assumes the client has already encrypted the bytes.
    // We still allow the mimeType to be passed for metadata purposes.
    const result = await uploadEncryptedFile(file, {
      fileName,
      mimeType,
      sha256,
    })

    return NextResponse.json({
      cid: result.cid,
      size: result.size,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Upload failed', details: message }, { status: 500 })
  }
}


