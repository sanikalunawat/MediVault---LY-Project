'use client';

import type { HealthRecord, User } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Stethoscope, TestTube2, AlertTriangle, HeartPulse, Heart, Activity, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { RecordAiAnalysis } from './RecordAiAnalysis';
import { Button } from '../ui/button';
import Link from 'next/link';
import { ViewDiagnosisDialog } from './ViewDiagnosisDialog';
import { useState } from 'react';
import { PinataFileViewer } from './PinataFileViewer';

interface HealthTimelineProps {
  records: HealthRecord[];
  user: User | null;
}

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

export function HealthTimeline({ records, user }: HealthTimelineProps) {
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);

  const handleOpenDiagnosis = (record: HealthRecord) => {
    setSelectedRecord(record);
    setIsDiagnosisOpen(true);
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed rounded-lg">
        <HeartPulse className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Health Records Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Click &quot;Add Record&quot; to start building your health timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
      {records.map((record) => (
        <Card key={record.id}>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="p-2 bg-secondary rounded-full mt-1">
              {recordIcons[record.type]}
            </div>
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
                      <p className="font-semibold text-sm">{record.pulseRate} <span className="text-xs">BPM</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {record.content}
            </p>
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
                  <Link href={record.attachmentUrl} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    View Attachment (Local)
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
           <CardFooter className="flex flex-col items-start gap-2">
            {record.diagnosis && (
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => handleOpenDiagnosis(record)}
              >
                <Stethoscope className="mr-2" /> View Doctor&apos;s Diagnosis
              </Button>
            )}
            <RecordAiAnalysis record={record} user={user} />
          </CardFooter>
        </Card>
      ))}
      {selectedRecord && selectedRecord.diagnosis && (
        <ViewDiagnosisDialog 
          open={isDiagnosisOpen}
          onOpenChange={setIsDiagnosisOpen}
          diagnosis={selectedRecord.diagnosis}
        />
      )}
    </div>
  );
}
