'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getHealthRecords } from '@/lib/firebase/firestore';
import type { HealthRecord } from '@/lib/types';
import { HealthTimeline } from './HealthTimeline';
import { HealthRecordForm } from './HealthRecordForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function MyRecordsClient() {
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        const userRecords = await getHealthRecords(user.uid);
        setRecords(userRecords);
      } catch (error) {
        console.error("Failed to fetch health records:", error);
      } finally {
        setLoading(false);
      }
    } else {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleRecordAdded = () => {
    fetchRecords();
    setIsFormOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>My Health Records</CardTitle>
            <CardDescription>
            A chronological overview of your medical history.
            </CardDescription>
        </div>
        <HealthRecordForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            onSuccess={handleRecordAdded}
        >
            <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Record
            </Button>
        </HealthRecordForm>
        </CardHeader>
        <CardContent>
            <HealthTimeline records={records} user={user} />
        </CardContent>
    </Card>
  );
}
