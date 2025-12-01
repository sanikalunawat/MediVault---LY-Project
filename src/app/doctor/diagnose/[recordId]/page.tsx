'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPatientRecordForDoctor, addDiagnosisToRecord } from '@/lib/actions';
import type { HealthRecord } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, Heart, Activity, Link as LinkIcon, FileText, Stethoscope, TestTube2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { PinataFileViewer } from '@/components/dashboard/PinataFileViewer';


const recordIcons: Record<HealthRecord['type'], React.ReactElement> = {
  prescription: <Stethoscope className="h-6 w-6 text-blue-500" />,
  lab_report: <TestTube2 className="h-6 w-6 text-green-500" />,
  allergy: <AlertTriangle className="h-6 w-6 text-red-500" />,
  note: <FileText className="h-6 w-6 text-gray-500" />,
};

const recordLabels: Record<HealthRecord['type'], string> = {
  prescription: 'Prescription',
  lab_report: 'Lab Report',
  allergy: 'Allergy',
  note: 'Note',
};

const diagnosisSchema = z.object({
  diagnosisText: z.string().min(10, 'Please provide a detailed diagnosis.'),
  treatmentPlan: z.string().min(10, 'Please provide a detailed treatment plan.'),
  recommendations: z.string().min(10, 'Please provide detailed recommendations.'),
});

export default function DiagnoseRecordPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const recordId = params.recordId as string;
  
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof diagnosisSchema>>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      diagnosisText: '',
      treatmentPlan: '',
      recommendations: '',
    },
  });

  useEffect(() => {
    const fetchRecord = async () => {
      if (!recordId || !user?.uid) return;
      try {
        setLoading(true);
        setError(null);
        const fetchedRecord = await getPatientRecordForDoctor(user.uid, recordId);
        setRecord(fetchedRecord);
        if (fetchedRecord.diagnosis) {
            form.reset(fetchedRecord.diagnosis);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch record.');
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) {
      fetchRecord();
    }
  }, [recordId, user, authLoading, form]);
  
  async function onSubmit(values: z.infer<typeof diagnosisSchema>) {
    if (!user?.uid || !recordId) return;
    setIsSubmitting(true);
    const result = await addDiagnosisToRecord(user.uid, recordId, values);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Diagnosis Saved',
        description: 'Your diagnosis has been successfully saved.',
      });
      router.push(`/doctor/view-records/${record?.userId}`);
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  }

  if (loading || authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle className="text-2xl text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
             <Button asChild variant="link" className="mt-4">
                <Link href="/doctor/dashboard">Go to Dashboard</Link>
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!record) {
    return <div>Record not found.</div>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Patient Record Details */}
        <div>
            <Button variant="outline" size="sm" onClick={() => router.back()} className='mb-4'>
                <ArrowLeft className="mr-2"/> Back to Patient Records
            </Button>
            <Card className="sticky top-20">
                <CardHeader className="flex flex-row items-start gap-4">
                    <div className="p-2 bg-background rounded-full mt-1">{recordIcons[record.type]}</div>
                    <div className='flex-1'>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{record.title}</CardTitle>
                            <Badge variant="outline">{recordLabels[record.type]}</Badge>
                        </div>
                        <CardDescription>
                            {format(new Date(record.date), 'MMMM d, yyyy')}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {(record.bloodPressure || record.pulseRate) && (
                        <div className="mb-4 grid grid-cols-2 gap-4">
                            {record.bloodPressure && (
                                <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                                    <Heart className="h-5 w-5 text-red-500" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Blood Pressure</p>
                                        <p className="font-semibold text-sm">{record.bloodPressure}</p>
                                    </div>
                                </div>
                            )}
                            {record.pulseRate && (
                                <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                                    <Activity className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Pulse Rate</p>
                                        <p className="font-semibold text-sm">{record.pulseRate} <span className='text-xs'>BPM</span></p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.content}</p>
                    {record.attachmentCid ? (
                        <PinataFileViewer 
                            cid={record.attachmentCid}
                            fileName={record.attachmentUrl ? record.attachmentUrl.split('/').pop() : undefined}
                            mimeType="application/pdf"
                            encryptionKey={record.attachmentEncryptionKey}
                            iv={record.attachmentEncryptionIv}
                        />
                    ) : record.attachmentUrl ? (
                        // Fallback to local storage if no CID (for old records)
                        <div className="mt-4">
                            <Button asChild variant="outline" size="sm">
                                <a href={record.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    View Attachment (Local)
                                </a>
                            </Button>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>

        {/* Diagnosis Form */}
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Add/Edit Diagnosis</CardTitle>
                    <CardDescription>Provide your professional assessment for this record.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="diagnosisText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Diagnosis</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Patient diagnosed with seasonal allergies..." {...field} rows={4} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="treatmentPlan"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Treatment Plan</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Prescribe Antihistamine, 10mg once daily..." {...field} rows={4} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="recommendations"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Follow-up Recommendations</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Recommend follow-up in 2 weeks..." {...field} rows={4} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                                Save Diagnosis
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
