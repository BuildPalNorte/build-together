'use client';

import { useSyncExternalStore } from 'react';

const VISITOR_KEY = 'bt:visitor';
const ME_KEY = 'bt:me';
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Anonymous id, generated once and kept in localStorage. Sent as visitorId at registration. */
export function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function setMyParticipantId(id: string) {
  try {
    window.localStorage.setItem(ME_KEY, id);
  } catch {
    /* storage unavailable: the session still works, "you" is lost on reload */
  }
  emit();
}

function readMe(): string | null {
  try {
    return window.localStorage.getItem(ME_KEY);
  } catch {
    return null;
  }
}

export function useMyParticipantId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener('storage', cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener('storage', cb);
      };
    },
    readMe,
    () => null,
  );
}
