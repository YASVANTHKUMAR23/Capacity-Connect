import React, { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: (errorCode?: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onVerify, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);

  // Always keep latest callback reference without triggering re-renders
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const siteKey =
    import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '0x4AAAAAAGLUcJ5xOb1lSMoJ';

  useEffect(() => {
    let isCancelled = false;

    // Helper to safely render the widget exactly once
    const mountWidget = () => {
      if (isCancelled || !containerRef.current || !window.turnstile) return;

      // Avoid duplicate renders if widgetId already exists
      if (widgetIdRef.current) return;

      try {
        // Clear any stale markup in the container
        containerRef.current.innerHTML = '';

        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (!isCancelled) {
              onVerifyRef.current(token);
            }
          },
          'expired-callback': () => {
            if (!isCancelled) {
              onVerifyRef.current('');
            }
          },
          'error-callback': () => {
            // If offline or blocked in dev testing, fallback to testing token
            if (!isCancelled && siteKey.startsWith('1x')) {
              onVerifyRef.current('1x00000000000000000000AA');
            }
          },
          theme: 'light',
          size: 'normal',
        });

        widgetIdRef.current = id;
      } catch (err) {
        // Silently handle re-render collisions
      }
    };

    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!window.turnstile) {
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          mountWidget();
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', mountWidget);
      }
    } else {
      mountWidget();
    }

    return () => {
      isCancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]); // Strictly dependent on siteKey ONLY; never on onVerify

  return (
    <div className={`flex flex-col items-center justify-center my-3 min-h-[65px] ${className || ''}`}>
      <div ref={containerRef} className="cf-turnstile" />
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 select-none">
        <span>Protected by Cloudflare Turnstile</span>
      </div>
    </div>
  );
};
