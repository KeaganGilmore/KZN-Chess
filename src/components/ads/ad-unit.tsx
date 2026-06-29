'use client';

import { useEffect, useRef } from 'react';

export type AdPlacement = 'HOME_BANNER' | 'TOURNAMENT_LIST' | 'TOURNAMENT_DETAIL';

// Each logical placement maps to a real numeric AdSense slot id, configured per
// environment. Referenced statically so Next.js can inline NEXT_PUBLIC_* values
// at build time (dynamic process.env[...] access would not be replaced).
const SLOT_IDS: Record<AdPlacement, string | undefined> = {
  HOME_BANNER: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BANNER,
  TOURNAMENT_LIST: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOURNAMENT_LIST,
  TOURNAMENT_DETAIL: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOURNAMENT_DETAIL,
};

interface AdUnitProps {
  slot: AdPlacement;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({
  slot,
  format = 'auto',
  responsive = true,
  className,
}: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID;
  const slotId = SLOT_IDS[slot];

  useEffect(() => {
    if (pushed.current || !pubId || !slotId) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet or blocked by adblocker — fail silently
    }
  }, [pubId, slotId]);

  // Render nothing until both the publisher id and this placement's real slot
  // id are configured — never emit a broken or placeholder ad unit.
  if (!pubId || !slotId) return null;

  return (
    <div className={className} aria-hidden="true">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={pubId}
        data-ad-slot={slotId}
        data-ad-format={format}
        {...(responsive && { 'data-full-width-responsive': 'true' })}
      />
    </div>
  );
}
