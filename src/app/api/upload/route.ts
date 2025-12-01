import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import { File } from 'formidable';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

async function ensureDir(dir: string) {
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

async function safeUnlink(filePath?: string) {
  if (!filePath) return;
  try { await unlink(filePath); } catch { /* ignore */ }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const userId = formData.get('userId') as string;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Create user-specific upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);
    await ensureDir(uploadDir);

    if (!fileEntry || typeof fileEntry === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const file = fileEntry;

    const size = file.size;
    const mime = file.type;

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    if (ALLOWED_MIME.length && mime && !ALLOWED_MIME.includes(mime)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name || 'file';
    
    // Create a safe filename by replacing special characters
    const safeFilename = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    const ext = path.extname(safeFilename) || '';
    const nameWithoutExt = path.basename(safeFilename, ext);
    
    // If file already exists, add a number suffix
    let finalFilename = safeFilename;
    let counter = 1;
    while (fs.existsSync(path.join(uploadDir, finalFilename))) {
      finalFilename = `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }
    
    const newPath = path.join(uploadDir, finalFilename);

    try {
      await fs.promises.writeFile(newPath, buffer);
    } catch (writeErr) {
      console.error('Write error:', writeErr);
      return NextResponse.json({ error: 'Could not save file' }, { status: 500 });
    }

    // Return the public URL (served from /public)
    const publicUrl = `/uploads/${userId}/${finalFilename}`;
    return NextResponse.json({ url: publicUrl, filename: finalFilename, originalName: originalName });
  } catch (e) {
    console.error('Upload handler error', e);
    return NextResponse.json({ error: 'Upload error' }, { status: 500 });
  }
}
