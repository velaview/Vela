import Link from 'next/link';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

      {/* Hero Content */}
      <div className="relative z-10 container px-4 md:px-6 flex flex-col items-center text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            VELA
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl leading-relaxed">
            Your personal entertainment universe. <br className="hidden md:inline" />
            Everything you want to watch, organized perfectly for you.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" className="h-12 px-8 text-lg gap-2" asChild>
            <Link href="/login">
              Sign In <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-lg gap-2" asChild>
            <Link href="/register">
              Create Account
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 w-full text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vela. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
