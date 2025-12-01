'use client';
import { useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  LogOut,
  HeartPulse,
  Loader2,
  User as UserIcon,
  Bot,
} from 'lucide-react';
import Logo from '@/components/icons/Logo';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WalletStatus } from '@/components/dashboard/WalletStatus';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
      router.push('/login');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to sign out.', variant: 'destructive' });
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If the user has a role and it's not 'patient', redirect them.
  if (user.role && user.role !== 'patient') {
    router.replace('/doctor/dashboard');
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If the user's role is not yet defined, show a loader.
  // This prevents the patient dashboard from flashing for a doctor.
  if (!user.role) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (email: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/my-records') return 'My Records';
    if (pathname === '/dashboard/profile') return 'My Profile';
    if (pathname === '/dashboard/chat') return 'Health Assistant';
    return 'Dashboard';
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-xl group-data-[collapsible=icon]:hidden">
              MediVault
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === '/dashboard'}>
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="My Records" isActive={pathname === '/dashboard/my-records'}>
                <Link href="/dashboard/my-records">
                  <HeartPulse />
                  <span>My Records</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Health Assistant" isActive={pathname === '/dashboard/chat'}>
                <Link href="/dashboard/chat">
                  <Bot />
                  <span>Health Assistant</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="My Profile" isActive={pathname === '/dashboard/profile'}>
                <Link href="/dashboard/profile">
                  <UserIcon />
                  <span>My Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-center mb-2">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL ?? ''} />
              <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium truncate">
                {user.email}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            <span className="group-data-[collapsible=icon]:hidden">
              Sign Out
            </span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl font-semibold font-headline flex-1">{getPageTitle()}</h1>
          <WalletStatus />
        </header>
        <main className="p-4 sm:px-6 sm:py-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
