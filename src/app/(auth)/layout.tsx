import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 md:p-8">
        <Link href="/" className="text-2xl font-bold text-primary">
          VELA
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-4">
        {children}
      </main>
    </div>
  );
}
