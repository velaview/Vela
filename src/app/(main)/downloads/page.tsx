'use client';

import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DownloadsPage() {
  return (
    <div className="min-h-screen pt-20 px-4 md:px-8 lg:px-12 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Download className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Downloads</h1>
          <p className="text-muted-foreground">Offline library management coming soon.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed p-12 text-center bg-muted/30">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-muted p-4">
            <Download className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">No Active Downloads</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Downloads will allow you to save movies and shows for offline viewing. 
          This feature is currently being integrated with the browser's native download manager.
        </p>
        <Button asChild>
          <Link href="/browse">Explore Content</Link>
        </Button>
      </div>
    </div>
  );
}
