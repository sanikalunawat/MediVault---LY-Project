import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import Logo from '@/components/icons/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
       <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mb-4">
            <Logo className="h-12 w-12 mx-auto" />
          </Link>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Log in as a Patient or Doctor to manage your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
