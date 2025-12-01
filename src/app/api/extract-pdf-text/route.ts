import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    // Extract the file path from the URL
    const urlPath = fileUrl.replace('/uploads/', '');
    const filePath = path.join(process.cwd(), 'public', 'uploads', urlPath);
    
    console.log('File URL:', fileUrl);
    console.log('URL Path:', urlPath);
    console.log('Full file path:', filePath);
    console.log('File exists:', fs.existsSync(filePath));

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found', path: filePath }, { status: 404 });
    }

    // Check file type
    const ext = path.extname(filePath).toLowerCase();
    const supportedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    
    if (!supportedTypes.includes(ext)) {
      return NextResponse.json({ 
        error: 'File type not supported for text extraction',
        supportedTypes: supportedTypes 
      }, { status: 400 });
    }

    // Handle different file types
    if (ext === '.pdf') {
      // Read and parse the PDF
      const dataBuffer = fs.readFileSync(filePath);
      
      try {
        // Dynamic import of pdf-parse-fixed to avoid issues in Next.js
        const pdfParse = (await import('pdf-parse-fixed')).default;
        
        // Use pdf-parse to extract text from the PDF
        const pdfData = await pdfParse(dataBuffer);
        
        // Clean up the extracted text
        const extractedText = pdfData.text.trim();
        
        if (!extractedText || extractedText.length === 0) {
          return NextResponse.json({ 
            text: '',
            message: 'No text content found in the PDF. The PDF might be image-based or contain only images.',
            fileType: 'pdf',
            pages: pdfData.numpages
          });
        }
        
        return NextResponse.json({ 
          text: extractedText,
          pages: pdfData.numpages,
          fileType: 'pdf',
          message: 'PDF content extracted successfully'
        });
      } catch (parseError) {
        console.error('PDF parsing error:', parseError);
        return NextResponse.json({ 
          text: '',
          message: `PDF parsing failed: ${parseError.message}. The PDF might be corrupted or in an unsupported format.`,
          fileType: 'pdf',
          error: parseError.message
        });
      }

    } else {
      // For images, we'll return a message indicating OCR is not implemented yet
      return NextResponse.json({ 
        text: '',
        message: `Image file detected (${ext}). OCR text extraction is not implemented yet. Only PDF text extraction is currently supported.`,
        fileType: 'image'
      });
    }

  } catch (error) {
    console.error('PDF text extraction error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract text from PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
