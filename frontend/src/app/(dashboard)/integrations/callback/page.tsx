'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function IntegrationCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    const integrationParam = searchParams.get('integration');
    const statusParam = searchParams.get('status');
    const messageParam = searchParams.get('message');

    if (integrationParam) {
      setPlatform(integrationParam);
    }

    if (statusParam === 'success') {
      setStatus('success');
      setMessage(`${integrationParam || 'Integration'} connected successfully!`);
      setTimeout(() => {
        router.push(`/settings?integration=${integrationParam}&status=success`);
      }, 1500);
    } else if (statusParam === 'error') {
      setStatus('error');
      setMessage(messageParam || 'An error occurred during connection.');
    } else {
      setMessage('Connecting...');
      setTimeout(() => {
        router.push('/settings');
      }, 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <div>
                  <p className="text-lg font-medium">Connecting...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please wait while we complete the connection.
                  </p>
                </div>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <div>
                  <p className="text-lg font-medium text-green-800">{message}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Redirecting to settings...
                  </p>
                </div>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="h-12 w-12 text-red-600" />
                <div>
                  <p className="text-lg font-medium text-red-800">Connection Failed</p>
                  <p className="text-sm text-muted-foreground mt-1">{message}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => router.push('/settings')}>
                    Back to Settings
                  </Button>
                  <Button
                    onClick={() => {
                      setStatus('loading');
                      setMessage('Connecting...');
                      window.location.href = `/settings`;
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
