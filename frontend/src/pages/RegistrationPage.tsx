import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useRegisterUser } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface RegistrationPageProps {
  onRegistered: () => void;
}

export default function RegistrationPage({ onRegistered }: RegistrationPageProps) {
  const [username, setUsername] = useState('');
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { mutate: registerUser, isPending } = useRegisterUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      toast.error('Please enter a username');
      return;
    }
    if (trimmed.length < 2) {
      toast.error('Username must be at least 2 characters');
      return;
    }

    registerUser(trimmed, {
      onSuccess: () => {
        toast.success(`Welcome, ${trimmed}! 💕`);
        onRegistered();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Registration limit reached')) {
          toast.error('This couple is already complete. Only 2 users can register.');
        } else if (msg.includes('already registered')) {
          toast.error('You are already registered.');
          onRegistered();
        } else {
          toast.error('Registration failed. Please try again.');
        }
      },
    });
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen bg-blush-white flex flex-col items-center justify-center px-4">
      {/* Decorative hearts */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-3 opacity-20">
        {[...Array(5)].map((_, i) => (
          <Heart key={i} className="w-5 h-5 text-rose-pink" fill="currentColor" />
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-romantic border border-rose-pink/30">
            <Heart className="w-8 h-8 text-warm-accent" fill="currentColor" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-warm-accent">OnlyUs</h1>
        </div>

        <Card className="border-rose-pink/20 shadow-romantic bg-white/90 backdrop-blur-sm rounded-3xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-blush-white flex items-center justify-center border border-rose-pink/30">
                <User className="w-6 h-6 text-warm-accent" />
              </div>
            </div>
            <CardTitle className="font-serif text-2xl text-rose-dark">Create your profile</CardTitle>
            <CardDescription className="text-rose-dark/60">
              Choose a name your partner will see
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-rose-dark font-medium">
                  Your name
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g. Alex, Sweetheart…"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="border-rose-pink/40 focus:border-warm-accent focus:ring-warm-accent/20 rounded-xl bg-blush-white/50 text-rose-dark placeholder:text-rose-dark/40"
                  disabled={isPending}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isPending || !username.trim()}
                className="w-full bg-warm-accent hover:bg-warm-accent-dark text-white font-semibold rounded-full py-3 shadow-romantic transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating profile…
                  </>
                ) : (
                  'Continue →'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <button
          onClick={handleLogout}
          className="mt-6 text-sm text-rose-dark/50 hover:text-warm-accent transition-colors underline underline-offset-2 block mx-auto"
        >
          Sign out
        </button>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-rose-dark/40 z-10">
        © {new Date().getFullYear()} OnlyUs &nbsp;·&nbsp; Built with{' '}
        <Heart className="inline w-3 h-3 text-warm-accent" fill="currentColor" /> using{' '}
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'onlyus-app')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-warm-accent transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
