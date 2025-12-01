'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { AuthContext } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { getUserDocument } from '@/lib/firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getUserDocument(firebaseUser.uid);
        if (userDoc) {
            const userData: User = {
                ...firebaseUser,
                role: userDoc.role,
                weight: userDoc.weight,
                height: userDoc.height,
                bloodGroup: userDoc.bloodGroup,
                bmi: userDoc.bmi,
            };
            setUser(userData);
        } else {
             setUser({ ...firebaseUser, role: 'patient' });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && user) {
        const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
        if (isAuthPage) {
            if (user.role === 'doctor') {
                router.replace('/doctor/dashboard');
            } else {
                router.replace('/dashboard');
            }
        }
    }
  }, [user, loading, router, pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
