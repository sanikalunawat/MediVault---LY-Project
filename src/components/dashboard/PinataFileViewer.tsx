'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileIcon, Download, Eye, AlertCircle } from 'lucide-react';
import { getEncryptedFile, gatewayUrlForCid } from '@/lib/pinata';

interface PinataFileViewerProps {
  cid: string;
  fileName?: string;
  mimeType?: string;
  // TODO: These should come from Firestore (encrypted keys stored per record)
  // For now, we'll show the encrypted file and note that decryption keys need to be stored
  encryptionKey?: string; // base64 encoded key
  iv?: string; // base64 encoded IV
}

export function PinataFileViewer({ 
  cid, 
  fileName = 'Attachment', 
  mimeType = 'application/pdf',
  encryptionKey,
  iv 
}: PinataFileViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleView = async () => {
    if (!cid) {
      setError('No CID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch encrypted file from Pinata (only when user clicks)
      const encryptedData = await getEncryptedFile(cid);
      
      let decryptedData: ArrayBuffer;
      
      if (encryptionKey && iv) {
        // Decrypt the file using Web Crypto API
        try {
          decryptedData = await decryptFile(encryptedData, encryptionKey, iv);
        } catch (decryptErr: any) {
          setError(`Decryption failed: ${decryptErr.message}`);
          setLoading(false);
          return;
        }
      } else {
        // No keys provided - show encrypted file (won't be readable)
        setError('Encryption keys not available. Cannot decrypt file.');
        setLoading(false);
        return;
      }

      // Create blob URL for viewing decrypted file
      const blob = new Blob([decryptedData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
      
      // Open in new tab
      window.open(url, '_blank');
    } catch (err: any) {
      console.error('File fetch/decrypt error:', err);
      const errorMessage = err.message || 'Failed to fetch file from Pinata';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Failed to fetch')) {
        setError(
          `Network error: Could not fetch file from IPFS. ` +
          `This might be due to:\n` +
          `1. File not pinned in Pinata\n` +
          `2. Network connectivity issues\n` +
          `3. CORS restrictions\n\n` +
          `CID: ${cid.slice(0, 20)}...\n` +
          `Try checking Pinata dashboard to verify the file is pinned.`
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to decrypt file using Web Crypto API
  async function decryptFile(
    encryptedData: ArrayBuffer,
    keyBase64: string,
    ivBase64: string
  ): Promise<ArrayBuffer> {
    // Get Web Crypto API
    const subtle = window.crypto?.subtle;
    if (!subtle) {
      throw new Error('Web Crypto API not available. Please use HTTPS or localhost.');
    }

    // Convert base64 strings to ArrayBuffers
    const keyBytes = base64ToArrayBuffer(keyBase64);
    const ivBytes = base64ToArrayBuffer(ivBase64);

    // Import the key
    const key = await subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
      },
      key,
      encryptedData
    );

    return decrypted;
  }

  // Helper to convert base64 to ArrayBuffer
  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const handleDownload = async () => {
    if (!cid) {
      setError('No CID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch encrypted file from Pinata (only when user clicks)
      const encryptedData = await getEncryptedFile(cid);
      
      let decryptedData: ArrayBuffer;
      
      if (encryptionKey && iv) {
        // Decrypt before downloading
        try {
          decryptedData = await decryptFile(encryptedData, encryptionKey, iv);
        } catch (decryptErr: any) {
          setError(`Decryption failed: ${decryptErr.message}`);
          setLoading(false);
          return;
        }
      } else {
        setError('Encryption keys not available. Cannot decrypt file.');
        setLoading(false);
        return;
      }

      // Create blob and download decrypted file
      const blob = new Blob([decryptedData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('File download error:', err);
      const errorMessage = err.message || 'Failed to download file';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Failed to fetch')) {
        setError(
          `Network error: Could not fetch file from IPFS. ` +
          `This might be due to:\n` +
          `1. File not pinned in Pinata\n` +
          `2. Network connectivity issues\n` +
          `3. CORS restrictions\n\n` +
          `CID: ${cid.slice(0, 20)}...\n` +
          `Try checking Pinata dashboard to verify the file is pinned.`
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Error loading file</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <p className="text-xs text-muted-foreground mt-1">
          CID: {cid.slice(0, 20)}...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 bg-background rounded-lg border">
      <div className="flex items-center gap-3 mb-2">
        <FileIcon className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <span className="text-sm font-medium">Attached File (IPFS)</span>
          <p className="text-xs text-muted-foreground">{fileName}</p>
          <p className="text-xs text-muted-foreground">CID: {cid.slice(0, 20)}...</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleView}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              View from IPFS
            </>
          )}
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleDownload}
          disabled={loading}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <a 
            href={gatewayUrlForCid(cid)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs"
          >
            Open Gateway
          </a>
        </Button>
      </div>
    </div>
  );
}

