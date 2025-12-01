'use client';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createShareLink } from '@/lib/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ShareRecordDialogProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareRecordDialog({ children, open, onOpenChange }: ShareRecordDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setShareUrl(null);
    const result = await createShareLink(user.uid);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setShareUrl(result.url);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset state when dialog is closed
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setShareUrl(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Your Health Records</DialogTitle>
          <DialogDescription>
            Generate a secure, temporary link to share your medical history
            with a doctor or specialist. This link is read-only.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {!shareUrl && !loading && !error && (
            <Button className="w-full" onClick={handleGenerateLink}>
              Generate Secure Link
            </Button>
          )}

          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Generating link...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {shareUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Your secure link is ready:</p>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view your health records. Share with caution.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
