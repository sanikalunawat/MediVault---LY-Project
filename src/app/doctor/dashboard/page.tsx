'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getConnectedPatients } from '@/lib/actions';
import type { UserDocument } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Eye, Users } from 'lucide-react';
import Link from 'next/link';

export default function DoctorDashboardPage() {
    const { user } = useAuth();
    const [patients, setPatients] = useState<UserDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatients = async () => {
            if (user?.uid) {
                setLoading(true);
                const connectedPatients = await getConnectedPatients(user.uid);
                setPatients(connectedPatients);
                setLoading(false);
            }
        };
        fetchPatients();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <Card>
                <CardHeader className='flex-row items-center justify-between'>
                    <div>
                        <CardTitle>My Patients</CardTitle>
                        <CardDescription>A list of patients you are connected with.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/doctor/patients">
                            <UserPlus className="mr-2" /> Find Patients
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {patients.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patients.map((patient) => (
                                    <TableRow key={patient.uid}>
                                        <TableCell className="font-medium">{patient.email}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/doctor/view-records/${patient.uid}`}>
                                                    <Eye className="mr-2 h-4 w-4" /> View Records
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                         <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">No Patients Yet</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Click &quot;Find Patients&quot; to search for and connect with your patients.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
