import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetMyProfile, usePairWithCode } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Copy, Check, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

export default function PairingPage() {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const { data: myProfile, isLoading: profileLoading } = useGetMyProfile();
  const { mutate: pairWithCode, isPending: isPairing } = usePairWithCode();

  const hasCode = myProfile?.coupleCode && myProfile.coupleCode.length > 0;

  const handleCopy = async () => {
    if (!myProfile?.coupleCode) return;
    try {
      await navigator.clipboard.writeText(myProfile.coupleCode);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Please copy manually.');
    }
  };

  const handlePair = () => {
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    pairWithCode(code, {
      onSuccess: () => {
        toast.success("You're paired! 💕");
        queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('No matching code')) {
          toast.error('Invalid code. Please check with your partner.');
        } else if (msg.includes('yourself')) {
          toast.error("You can't pair with yourself!");
        } else {
          toast.error('Pairing failed. Please try again.');
        }
        setCode('');
      },
    });
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-blush-white flex items-center justify-center">
        <Heart className="w-10 h-10 text-warm-accent animate-pulse" fill="currentColor" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blush-white flex flex-col items-center justify-center px-4">
      {/* Decorative background hearts */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <Heart
            key={i}
            className="absolute text-rose-pink/10"
            fill="currentColor"
            style={{
              width: `${20 + (i * 13) % 40}px`,
              height: `${20 + (i * 13) % 40}px`,
              top: `${(i * 17 + 5) % 90}%`,
              left: `${(i * 23 + 3) % 90}%`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-romantic border border-rose-pink/30">
            <Heart className="w-8 h-8 text-warm-accent" fill="currentColor" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-warm-accent">OnlyUs</h1>
          <p className="text-rose-dark/60 text-sm">
            Hello, <span className="font-semibold text-warm-accent">{myProfile?.username}</span> 💕
          </p>
        </div>

        {hasCode ? (
          /* User 1: Show their couple code */
          <Card className="border-rose-pink/20 shadow-romantic bg-white/90 backdrop-blur-sm rounded-3xl">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-blush-white flex items-center justify-center border border-rose-pink/30">
                  <Link2 className="w-6 h-6 text-warm-accent" />
                </div>
              </div>
              <CardTitle className="font-serif text-2xl text-rose-dark">Your couple code</CardTitle>
              <CardDescription className="text-rose-dark/60">
                Share this code with your partner so they can join
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 flex flex-col items-center gap-6">
              {/* Code display */}
              <div className="flex items-center gap-2">
                {myProfile?.coupleCode.split('').map((digit, i) => (
                  <div
                    key={i}
                    className="w-11 h-14 flex items-center justify-center bg-blush-white border-2 border-rose-pink/40 rounded-xl text-2xl font-bold text-warm-accent font-mono shadow-sm"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCopy}
                variant="outline"
                className="border-rose-pink/40 text-warm-accent hover:bg-blush-white hover:border-warm-accent rounded-full px-8 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy code
                  </>
                )}
              </Button>

              <p className="text-rose-dark/50 text-xs text-center max-w-xs">
                Waiting for your partner to enter this code… Once they pair, you'll both be connected 💕
              </p>
            </CardContent>
          </Card>
        ) : (
          /* User 2: Enter partner's code */
          <Card className="border-rose-pink/20 shadow-romantic bg-white/90 backdrop-blur-sm rounded-3xl">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-blush-white flex items-center justify-center border border-rose-pink/30">
                  <Heart className="w-6 h-6 text-warm-accent" fill="currentColor" />
                </div>
              </div>
              <CardTitle className="font-serif text-2xl text-rose-dark">Enter couple code</CardTitle>
              <CardDescription className="text-rose-dark/60">
                Ask your partner for their 6-digit code
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 flex flex-col items-center gap-6">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={isPairing}
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="w-11 h-14 text-xl font-bold text-warm-accent border-rose-pink/40 rounded-xl bg-blush-white/50 focus:border-warm-accent"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <Button
                onClick={handlePair}
                disabled={isPairing || code.length !== 6}
                className="w-full bg-warm-accent hover:bg-warm-accent-dark text-white font-semibold rounded-full py-3 shadow-romantic transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              >
                {isPairing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pairing…
                  </>
                ) : (
                  'Pair Up 💕'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

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
