'use client';

import { useState } from 'react';
import { analyzeHealthRecords, analyzeAttachment, type AnalysisOutput } from '@/ai/flows/analyze-health-records';
import type { HealthRecord, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, Sparkles, AlertTriangle, Lightbulb, FileText, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface RecordAiAnalysisProps {
  record: HealthRecord;
  user: User | null;
}

export function RecordAiAnalysis({ record, user }: RecordAiAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [descriptionAnalysis, setDescriptionAnalysis] = useState<AnalysisOutput | null>(null);
  const [attachmentAnalysis, setAttachmentAnalysis] = useState<AnalysisOutput | null>(null);
  const { toast } = useToast();

  const handleAnalysis = async () => {
    setIsLoading(true);
    setDescriptionAnalysis(null);
    setAttachmentAnalysis(null);

    try {
      // Make separate API calls
      const analysisPromises = [];

      // 1. Analyze description
      const descriptionPromise = analyzeHealthRecords({ 
        description: record.content,
        recordType: record.type,
        weight: user?.weight,
        height: user?.height,
        bmi: user?.bmi
      });
      analysisPromises.push(descriptionPromise);

      // 2. Analyze attachment if present
      if (record.attachmentUrl) {
        try {
          const response = await fetch('/api/extract-pdf-text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileUrl: record.attachmentUrl }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const attachmentText = data.text || '';
            
            if (attachmentText && attachmentText.trim().length > 0) {
              const attachmentPromise = analyzeAttachment({ 
                attachmentText: attachmentText,
                recordType: record.type,
                weight: user?.weight,
                height: user?.height,
                bmi: user?.bmi
              });
              analysisPromises.push(attachmentPromise);
            } else {
              // If no text extracted, create a placeholder analysis
              const placeholderPromise = Promise.resolve({
                summary: 'PDF attachment detected but no text content could be extracted. This may be because the PDF contains only images, is password-protected, or uses an unsupported format.',
                recommendations: [
                  'Consult with your healthcare provider to review the attachment manually.',
                  'If the PDF contains text, try converting it to a different format or ensure it\'s not password-protected.',
                  'Consider uploading a text-based document instead of an image-based PDF.'
                ]
              });
              analysisPromises.push(placeholderPromise);
            }
          }
        } catch (pdfError) {
          console.warn('Attachment extraction failed:', pdfError);
          const errorPromise = Promise.resolve({
            summary: 'Attachment analysis failed due to technical issues with the PDF extraction service.',
            recommendations: [
              'Please consult with your healthcare provider to review the attachment manually.',
              'Try uploading a different file format if possible.',
              'Ensure the PDF file is not corrupted and is accessible.'
            ]
          });
          analysisPromises.push(errorPromise);
        }
      }

      // Wait for all analyses to complete
      const results = await Promise.all(analysisPromises);
      
      // Set the results
      setDescriptionAnalysis(results[0]);
      if (results.length > 1) {
        setAttachmentAnalysis(results[1]);
      }

    } catch (error) {
      console.error('AI analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not generate health insights for this record.';
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('API key')) {
        userFriendlyMessage = 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in your environment variables.';
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        userFriendlyMessage = 'Unable to connect to AI service. Please check your internet connection and try again.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'The AI service is taking too long to respond. Please try again.';
      }
      
      toast({
        title: 'Analysis Failed',
        description: userFriendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full space-y-4'>
        {!descriptionAnalysis && !attachmentAnalysis && (
            <Button onClick={handleAnalysis} disabled={isLoading} className="w-full" variant="ghost">
            {isLoading ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
                </>
            ) : (
                <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze with AI
                </>
            )}
            </Button>
        )}

        {(descriptionAnalysis || attachmentAnalysis) && (
            <div className="space-y-4 pt-4 border-t">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Disclaimer</AlertTitle>
                  <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                        AI-generated suggestions are not medical advice. Consult a doctor for accurate guidance.
                    </AlertDescription>
                </Alert>

                {/* Analysis from Description */}
                {descriptionAnalysis && (
                    <div className="p-4 bg-secondary rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                            <File className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-secondary-foreground">Analysis from Description</h4>
                        </div>
                        <p className="text-sm text-secondary-foreground">{descriptionAnalysis.summary}</p>
                        {descriptionAnalysis.recommendations.length > 0 && (
                            <>
                                <h5 className="font-medium text-secondary-foreground">Recommendations:</h5>
                                <ul className="space-y-1 text-sm text-secondary-foreground list-disc list-inside">
                                    {descriptionAnalysis.recommendations.map((rec, index) => (
                                        <li key={index}>{rec}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}

                {/* Analysis from Attachment */}
                {attachmentAnalysis && (
                    <div className="p-4 bg-secondary rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-secondary-foreground">Analysis from Attachment</h4>
                        </div>
                        <p className="text-sm text-secondary-foreground">{attachmentAnalysis.summary}</p>
                        {attachmentAnalysis.recommendations.length > 0 && (
                            <>
                                <h5 className="font-medium text-secondary-foreground">Attachment Recommendations:</h5>
                                <ul className="space-y-1 text-sm text-secondary-foreground list-disc list-inside">
                                    {attachmentAnalysis.recommendations.map((rec, index) => (
                                        <li key={index}>{rec}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}

                <Button onClick={() => {
                    setDescriptionAnalysis(null);
                    setAttachmentAnalysis(null);
                }} variant="ghost" size="sm" className="w-full">
                    Clear Analysis
                </Button>
            </div>
        )}
    </div>
  );
}
