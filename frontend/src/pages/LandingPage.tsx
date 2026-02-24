import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background image */}
      <img
        src="/assets/generated/landing-bg.dim_1440x900.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />

      {/* Soft overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-blush-white/60 via-blush-white/40 to-blush-white/80" />

      {/* Content */}
      <main className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        {/* Logo mark */}
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/80 shadow-romantic border border-rose-pink/30">
          <Heart className="w-10 h-10 text-warm-accent" fill="currentColor" />
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-serif text-6xl font-bold text-warm-accent tracking-tight drop-shadow-sm">
            OnlyUs
          </h1>
          <p className="text-rose-dark text-lg font-medium max-w-xs leading-relaxed">
            Your private space, just for the two of you 💕
          </p>
        </div>

        {/* Login button */}
        <Button
          onClick={login}
          disabled={isLoggingIn}
          className="bg-warm-accent hover:bg-warm-accent-dark text-white font-semibold px-10 py-3 rounded-full text-base shadow-romantic transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          size="lg"
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in to begin'
          )}
        </Button>

        <p className="text-rose-dark/60 text-sm max-w-xs">
          Secure, private, and just for two. Powered by the Internet Computer.
        </p>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-rose-dark/50 z-10">
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
