'use client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { updateUserProfile, getUserDocument } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const profileSchema = z.object({
  weight: z.coerce.number().positive('Weight must be positive.'),
  height: z.coerce.number().positive('Height must be positive.'),
  bloodGroup: z.string().min(1, 'Blood group is required.'),
});

export function ProfileClient() {
  const { user, setUser, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      weight: user?.weight || 0,
      height: user?.height || 0,
      bloodGroup: user?.bloodGroup || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) return;
    setIsLoading(true);
    const result = await updateUserProfile(user.uid, values);

    if (result.success) {
      toast({
        title: 'Profile Updated',
        description: 'Your health metrics have been updated and a new record has been created.',
      });
      // Refetch user to update context
      const updatedUserDoc = await getUserDocument(user.uid);
      if (updatedUserDoc) {
        setUser({ ...user, ...updatedUserDoc });
      }
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };
  
  if (loading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>View and manage your personal and health information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email Address</Label>
            <Input value={user?.email || ''} readOnly disabled />
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Weight (kg)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 70" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Height (cm)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 175" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="bloodGroup"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select your blood group" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
        <Card>
            <CardHeader>
                <CardTitle>Health Stats</CardTitle>
                <CardDescription>Your current calculated health metrics.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">BMI</p>
                    <p className="text-2xl font-bold">{user?.bmi || 'N/A'}</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Blood Group</p>
                    <p className="text-2xl font-bold">{user?.bloodGroup || 'N/A'}</p>
                </div>
                 <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="text-2xl font-bold">{user?.weight || 'N/A'} <span className='text-base text-muted-foreground'>kg</span></p>
                </div>
                 <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Height</p>
                    <p className="text-2xl font-bold">{user?.height || 'N/A'} <span className='text-base text-muted-foreground'>cm</span></p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
