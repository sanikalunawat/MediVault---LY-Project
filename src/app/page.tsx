
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Stethoscope,
  Lock,
  Bot,
  Share2,
  Upload,
  BarChart,
  ArrowRight,
  ShieldCheck,
  FileText,
  HeartPulse,
} from 'lucide-react';
import Logo from '@/components/icons/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const features = [
    {
      icon: <Upload className="h-8 w-8 text-primary" />,
      title: 'Unified Health Records',
      description:
        'Securely upload and manage all your medical records in one place.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Blockchain Security',
      description:
        'Leverage immutable, patient-owned health data with consent-based sharing.',
    },
    {
      icon: <Bot className="h-8 w-8 text-primary" />,
      title: 'AI Health Assistant',
      description:
        'Get personalized health insights and lifestyle recommendations from our AI.',
    },
    {
      icon: <Share2 className="h-8 w-8 text-primary" />,
      title: 'Seamless Sharing',
      description:
        'Grant doctors access to your medical history via secure connections.',
    },
    {
      icon: <BarChart className="h-8 w-8 text-primary" />,
      title: 'Health Analytics',
      description:
        'Visualize your health trends with our intuitive dashboard.',
    },
    {
      icon: <Stethoscope className="h-8 w-8 text-primary" />,
      title: 'Doctor Coordination',
      description:
        'Enable doctors to view your history and get AI summaries for faster diagnoses.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
       <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-7xl items-center mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-bold text-lg">MediVault</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full py-24 lg:py-32 xl:py-40">
           <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(39,39,42,0.6),rgba(255,255,255,0))]"></div>
            
            <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full animate-float-up-1 blur-md"></div>
            <div className="absolute top-1/2 right-10 w-24 h-24 bg-accent/30 rounded-full animate-float-down-1 blur-lg"></div>
            <div className="absolute bottom-10 left-1/2 w-16 h-16 bg-primary/10 rounded-full animate-float-up-2 blur-md"></div>

            <Stethoscope className="absolute top-1/4 left-1/4 h-12 w-12 text-primary/30 animate-float-up-2 opacity-50" />
            <HeartPulse className="absolute bottom-1/4 right-1/4 h-16 w-16 text-primary/40 animate-float-down-2 opacity-60" />
            <FileText className="absolute top-1/3 right-1/3 h-8 w-8 text-primary/20 animate-float-up-1 opacity-40" />

            <div className="container mx-auto px-4 md:px-6 text-center">
                <div className="flex flex-col items-center space-y-6">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none font-headline bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                            Your Health, Your Control.
                        </h1>
                        <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
                            A decentralized, AI-powered health record system that puts you
                            in charge of your medical data. Secure, smart, and simple.
                        </p>
                    </div>
                    <Button asChild size="lg">
                        <Link href="/signup">
                        Create Your Secure Vault <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>


        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50 dark:bg-background">
            <div className="container px-4 md:px-6 mx-auto">
                 <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                    <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm font-medium">
                        Key Features
                    </div>
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                        Empowering Your Health Journey
                    </h2>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        MediVault combines cutting-edge technology to provide a
                        comprehensive solution for personal health management.
                    </p>
                </div>
                <div className="mx-auto grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl">
                    {features.map((feature) => (
                        <Card key={feature.title} className="flex flex-col items-center text-center p-6 border-2 border-transparent hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                           <CardHeader className="p-0 mb-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                                    {feature.icon}
                                </div>
                                <CardTitle className="text-xl">{feature.title}</CardTitle>
                           </CardHeader>
                           <CardContent className="p-0">
                               <p className="text-muted-foreground">
                                    {feature.description}
                                </p>
                           </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0 mx-auto">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
             <Logo className="h-8 w-8" />
             <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                &copy; {new Date().getFullYear()} MediVault. All rights reserved.
            </p>
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link
              href="#"
              className="text-sm hover:underline underline-offset-4"
              prefetch={false}
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-sm hover:underline underline-offset-4"
              prefetch={false}
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
