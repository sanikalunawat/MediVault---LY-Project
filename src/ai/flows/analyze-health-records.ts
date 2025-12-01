'use server';

/**
 * @fileOverview A health record analysis AI agent.
 *
 * - analyzeHealthRecords - A function that handles the health record analysis process.
 * - AnalyzeHealthRecordsInput - The input type for the analyzeHealthRecords function.
 * - AnalyzeHealthRecordsOutput - The return type for the analyzeHealthRecords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeHealthRecordsInputSchema = z.object({
  description: z.string().describe('The main description/content of the health record.'),
  recordType: z.string().describe('Type of health record (prescription, lab_report, allergy, note).'),
  weight: z.number().optional().describe("Patient's current weight in kg."),
  height: z.number().optional().describe("Patient's current height in cm."),
  bmi: z.number().optional().describe("Patient's current Body Mass Index."),
});

const AnalyzeAttachmentInputSchema = z.object({
  attachmentText: z.string().describe('Text content extracted from PDF attachment.'),
  recordType: z.string().describe('Type of health record (prescription, lab_report, allergy, note).'),
  weight: z.number().optional().describe("Patient's current weight in kg."),
  height: z.number().optional().describe("Patient's current height in cm."),
  bmi: z.number().optional().describe("Patient's current Body Mass Index."),
});
export type AnalyzeHealthRecordsInput = z.infer<typeof AnalyzeHealthRecordsInputSchema>;
export type AnalyzeAttachmentInput = z.infer<typeof AnalyzeAttachmentInputSchema>;

const AnalysisOutputSchema = z.object({
  summary: z.string().describe("Health analysis summary."),
  recommendations: z.array(z.string()).describe("Actionable health recommendations."),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

export async function analyzeHealthRecords(input: AnalyzeHealthRecordsInput): Promise<AnalysisOutput> {
  try {
    const result = await analyzeHealthRecordsFlow(input);
    if (!result || !result.summary) {
      throw new Error('AI analysis returned empty result');
    }
    return result;
  } catch (error) {
    console.error('Error in analyzeHealthRecords:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's an API key issue
    if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
      throw new Error('Gemini API key is missing or invalid. Please check your GEMINI_API_KEY environment variable.');
    }
    
    // Check if it's a network/connection issue
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
      throw new Error('Failed to connect to AI service. Please check your internet connection and try again.');
    }
    
    // Generic error
    throw new Error(`Failed to generate health analysis: ${errorMessage}`);
  }
}

export async function analyzeAttachment(input: AnalyzeAttachmentInput): Promise<AnalysisOutput> {
  try {
    const result = await analyzeAttachmentFlow(input);
    if (!result || !result.summary) {
      throw new Error('AI analysis returned empty result');
    }
    return result;
  } catch (error) {
    console.error('Error in analyzeAttachment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's an API key issue
    if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
      throw new Error('Gemini API key is missing or invalid. Please check your GEMINI_API_KEY environment variable.');
    }
    
    // Check if it's a network/connection issue
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
      throw new Error('Failed to connect to AI service. Please check your internet connection and try again.');
    }
    
    // Generic error
    throw new Error(`Failed to generate attachment analysis: ${errorMessage}`);
  }
}

const descriptionPrompt = ai.definePrompt({
  name: 'analyzeDescriptionPrompt',
  input: {schema: AnalyzeHealthRecordsInputSchema},
  output: {schema: AnalysisOutputSchema},
  prompt: `You are an AI health assistant. Analyze the provided health record description.

  Patient Stats:
  - Weight: {{{weight}}} kg
  - Height: {{{height}}} cm
  - BMI: {{{bmi}}}

  Record Type: {{{recordType}}}

  Description:
  {{{description}}}

  Provide:
  1. A detailed health analysis based on the description provided
  2. 3-4 actionable health recommendations
  3. Keep language clear, encouraging, and medically appropriate
  `,
});

const attachmentPrompt = ai.definePrompt({
  name: 'analyzeAttachmentPrompt',
  input: {schema: AnalyzeAttachmentInputSchema},
  output: {schema: AnalysisOutputSchema},
  prompt: `You are an AI health assistant. Analyze the provided health record attachment content.

  Patient Stats:
  - Weight: {{{weight}}} kg
  - Height: {{{height}}} cm
  - BMI: {{{bmi}}}

  Record Type: {{{recordType}}}

  Attachment Content:
  {{{attachmentText}}}

  IMPORTANT: Only analyze the actual content provided in the attachment. Do not generate generic responses or assume content that is not present in the attachment text.

  Provide:
  1. A detailed health analysis based ONLY on the specific medical information found in the attachment content
  2. 3-4 actionable health recommendations that are directly relevant to the attachment content
  3. Keep language clear, encouraging, and medically appropriate
  4. If the attachment contains lab results, prescriptions, or specific medical data, focus your analysis on those specific findings
  5. Do not mention that "the PDF could not be extracted" or provide generic placeholder text - only analyze what is actually provided
  `,
});

const analyzeHealthRecordsFlow = ai.defineFlow(
  {
    name: 'analyzeHealthRecordsFlow',
    inputSchema: AnalyzeHealthRecordsInputSchema,
    outputSchema: AnalysisOutputSchema,
  },
  async input => {
    try {
      const result = await descriptionPrompt(input);
      if (!result || !result.output) {
        throw new Error('Prompt returned no output');
      }
      
      // Validate output structure
      if (!result.output.summary || !Array.isArray(result.output.recommendations)) {
        throw new Error('Invalid output format from AI');
      }
      
      return result.output;
    } catch (error) {
      console.error('Error in analyzeHealthRecordsFlow:', error);
      throw error;
    }
  }
);

const analyzeAttachmentFlow = ai.defineFlow(
  {
    name: 'analyzeAttachmentFlow',
    inputSchema: AnalyzeAttachmentInputSchema,
    outputSchema: AnalysisOutputSchema,
  },
  async input => {
    try {
      const result = await attachmentPrompt(input);
      if (!result || !result.output) {
        throw new Error('Prompt returned no output');
      }
      
      // Validate output structure
      if (!result.output.summary || !Array.isArray(result.output.recommendations)) {
        throw new Error('Invalid output format from AI');
      }
      
      return result.output;
    } catch (error) {
      console.error('Error in analyzeAttachmentFlow:', error);
      throw error;
    }
  }
);
