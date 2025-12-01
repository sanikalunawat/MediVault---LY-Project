'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Diagnosis } from '@/lib/types';

interface ViewDiagnosisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnosis: Diagnosis;
}

export function ViewDiagnosisDialog({ open, onOpenChange, diagnosis }: ViewDiagnosisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Doctor's Diagnosis</DialogTitle>
          <DialogDescription>
            This diagnosis was provided by {diagnosis.doctorEmail} on{' '}
            {format(new Date(diagnosis.createdAt), 'MMMM d, yyyy')}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
            <div>
                <h4 className='font-semibold mb-2'>Diagnosis</h4>
                <p className='text-sm text-muted-foreground p-3 bg-secondary rounded-md'>{diagnosis.diagnosisText}</p>
            </div>
            <div>
                <h4 className='font-semibold mb-2'>Treatment Plan</h4>
                <p className='text-sm text-muted-foreground p-3 bg-secondary rounded-md'>{diagnosis.treatmentPlan}</p>
            </div>
             <div>
                <h4 className='font-semibold mb-2'>Follow-up Recommendations</h4>
                <p className='text-sm text-muted-foreground p-3 bg-secondary rounded-md'>{diagnosis.recommendations}</p>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
