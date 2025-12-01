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
import { ConnectionRequests } from './ConnectionRequests';

export function DashboardClient() {
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
        // Optionally, show a toast message to the user
      } finally {
        setLoading(false);
      }
    } else {
        // If there's no user, we are not loading anything.
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
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Health Timeline</CardTitle>
              <CardDescription>
                Your chronological medical history.
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
      </div>

      <div className="space-y-6">
        <ConnectionRequests />
      </div>
    </div>
  );
}
