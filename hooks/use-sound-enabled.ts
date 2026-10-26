'use client';

import { useSyncExternalStore } from 'react';
import { isSoundOn, setSoundOn, subscribeSound } from '@/lib/audio/sound-effects';

export function useSoundEnabled() {
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => false);
  return [on, setSoundOn] as const;
}
