// src/lib/contract.ts
// Contract interaction utilities for HealthRecordRegistry

import { ethers } from 'ethers';

// Contract ABI (extract from compiled contract in Remix)
// This is a minimal ABI with the functions we need
export const HEALTH_RECORD_REGISTRY_ABI = [
  'function createFile(string memory cid, string memory hash, string memory mimeType, uint256 size) public returns (uint256)',
  'function getFileMetadata(uint256 fileId) public view returns (tuple(address owner, string cid, string hash, string mimeType, uint256 size, uint256 timestamp, bool exists))',
  'function grantAccess(uint256 fileId, address doctorAddress) public',
  'function revokeAccess(uint256 fileId, address doctorAddress) public',
  'function hasAccess(uint256 fileId, address doctorAddress) public view returns (bool)',
  'function getPatientFiles(address patientAddress) public view returns (uint256[])',
  'function getAuthorizedFiles(address doctorAddress) public view returns (uint256[])',
  'function connectPatientDoctor(address patientAddress, address doctorAddress) public',
  'function removeConnection(address otherAddress) public',
  'function getPatientConnections(address patientAddress) public view returns (address[])',
  'function getDoctorConnections(address doctorAddress) public view returns (address[])',
  'function getTotalFiles() public view returns (uint256)',
  'event FileCreated(uint256 indexed fileId, address indexed owner, string cid, string hash, uint256 timestamp)',
  'event AccessGranted(uint256 indexed fileId, address indexed owner, address indexed doctor)',
  'event AccessRevoked(uint256 indexed fileId, address indexed owner, address indexed doctor)',
  'event ConnectionEstablished(address indexed patient, address indexed doctor)',
] as const;

// Contract address - SET THIS AFTER DEPLOYING IN REMIX
// Get this from Remix after deployment to Sepolia
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// Sepolia network configuration
export const SEPOLIA_NETWORK = {
  chainId: '0xaa36a7', // 11155111 in hex
  chainName: 'Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

// Types
export interface FileMetadata {
  owner: string;
  cid: string;
  hash: string;
  mimeType: string;
  size: bigint;
  timestamp: bigint;
  exists: boolean;
}

// ============ PROVIDER & SIGNER HELPERS ============

/**
 * Get a provider for Sepolia network
 */
export function getSepoliaProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get a signer from MetaMask window.ethereum
 */
export async function getMetaMaskSigner(): Promise<ethers.BrowserProvider> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask extension.');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Request account access
  await provider.send('eth_requestAccounts', []);
  
  return provider;
}

/**
 * Get contract instance with a signer (for write operations)
 */
export async function getContractWithSigner() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
  }

  const provider = await getMetaMaskSigner();
  const signer = await provider.getSigner();
  
  return new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_REGISTRY_ABI, signer);
}

/**
 * Get contract instance without signer (for read operations)
 */
export function getContractReadOnly() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
  }

  const provider = getSepoliaProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_REGISTRY_ABI, provider);
}

// ============ CONTRACT FUNCTIONS ============

/**
 * Create a new file record on-chain
 * @param cid IPFS CID from Pinata
 * @param hash SHA-256 hash of the file
 * @param mimeType MIME type (e.g., "application/pdf")
 * @param size File size in bytes
 * @returns Transaction hash and fileId
 */
export async function createFileOnChain(
  cid: string,
  hash: string,
  mimeType: string,
  size: number
): Promise<{ txHash: string; fileId: bigint }> {
  const contract = await getContractWithSigner();
  
  const tx = await contract.createFile(cid, hash, mimeType, size);
  const receipt = await tx.wait();
  
  // Extract fileId from event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === 'FileCreated';
    } catch {
      return false;
    }
  });
  
  let fileId: bigint;
  if (event) {
    const parsed = contract.interface.parseLog(event);
    fileId = parsed?.args[0] || BigInt(0);
  } else {
    // Fallback: query the contract for the latest file
    const totalFiles = await contract.getTotalFiles();
    fileId = totalFiles;
  }
  
  return {
    txHash: receipt.hash,
    fileId,
  };
}

/**
 * Grant access to a doctor for a file
 * @param fileId The file ID
 * @param doctorAddress Doctor's wallet address
 */
export async function grantFileAccess(
  fileId: bigint,
  doctorAddress: string
): Promise<string> {
  const contract = await getContractWithSigner();
  const tx = await contract.grantAccess(fileId, doctorAddress);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Revoke access from a doctor for a file
 * @param fileId The file ID
 * @param doctorAddress Doctor's wallet address
 */
export async function revokeFileAccess(
  fileId: bigint,
  doctorAddress: string
): Promise<string> {
  const contract = await getContractWithSigner();
  const tx = await contract.revokeAccess(fileId, doctorAddress);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Get file metadata (only if caller has access)
 * @param fileId The file ID
 * @returns FileMetadata
 */
export async function getFileMetadata(fileId: bigint): Promise<FileMetadata> {
  const contract = await getContractWithSigner();
  const provider = await getMetaMaskSigner();
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  // Use a contract instance with the user's signer to check access
  const contractWithSigner = new ethers.Contract(
    CONTRACT_ADDRESS,
    HEALTH_RECORD_REGISTRY_ABI,
    signer
  );
  
  const metadata = await contractWithSigner.getFileMetadata(fileId);
  
  return {
    owner: metadata.owner,
    cid: metadata.cid,
    hash: metadata.hash,
    mimeType: metadata.mimeType,
    size: metadata.size,
    timestamp: metadata.timestamp,
    exists: metadata.exists,
  };
}

/**
 * Get all files owned by a patient
 * @param patientAddress Patient's wallet address
 * @returns Array of file IDs
 */
export async function getPatientFiles(patientAddress: string): Promise<bigint[]> {
  const contract = getContractReadOnly();
  return await contract.getPatientFiles(patientAddress);
}

/**
 * Get all files accessible to a doctor
 * @param doctorAddress Doctor's wallet address
 * @returns Array of file IDs
 */
export async function getAuthorizedFiles(doctorAddress: string): Promise<bigint[]> {
  const contract = getContractReadOnly();
  return await contract.getAuthorizedFiles(doctorAddress);
}

/**
 * Check if a doctor has access to a file
 * @param fileId The file ID
 * @param doctorAddress Doctor's address
 * @returns True if access is granted
 */
export async function checkFileAccess(
  fileId: bigint,
  doctorAddress: string
): Promise<boolean> {
  const contract = getContractReadOnly();
  return await contract.hasAccess(fileId, doctorAddress);
}

/**
 * Connect patient and doctor (mutual consent)
 * @param patientAddress Patient's address
 * @param doctorAddress Doctor's address
 */
export async function connectPatientDoctor(
  patientAddress: string,
  doctorAddress: string
): Promise<string> {
  const contract = await getContractWithSigner();
  const tx = await contract.connectPatientDoctor(patientAddress, doctorAddress);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Get connected doctors for a patient
 * @param patientAddress Patient's address
 * @returns Array of doctor addresses
 */
export async function getPatientConnections(patientAddress: string): Promise<string[]> {
  const contract = getContractReadOnly();
  return await contract.getPatientConnections(patientAddress);
}

/**
 * Get connected patients for a doctor
 * @param doctorAddress Doctor's address
 * @returns Array of patient addresses
 */
export async function getDoctorConnections(doctorAddress: string): Promise<string[]> {
  const contract = getContractReadOnly();
  return await contract.getDoctorConnections(doctorAddress);
}

