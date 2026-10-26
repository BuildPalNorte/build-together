'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playConnectionSound, playNodeSound } from '@/lib/audio/sound-effects';
import { POLL_INTERVAL_MS } from '@/lib/events/constants';
import { DEMO_SNAPSHOT } from '@/lib/events/demo-room';
import type { EventSnapshot, PublicConnection, PublicParticipant } from '@/lib/events/types';

export type SyncStatus = 'syncing' | 'live' | 'reconnecting' | 'preview';

/**
 * Polls GET /api/events/[slug] every POLL_INTERVAL_MS. One request in flight at a time,
 * paused while the tab is hidden, one fetch when it becomes visible again.
 */
export function useNetworkPoll(slug: string, options: { demo?: boolean } = {}) {
  const [real, setReal] = useState<EventSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const knownParticipants = useRef<Set<string> | null>(null);
  const knownConnections = useRef<Set<string> | null>(null);
  const inFlight = useRef(false);

  const announce = useCallback((snapshot: EventSnapshot) => {
    const people = knownParticipants.current;
    const links = knownConnections.current;
    if (people && links) {
      for (const p of snapshot.participants) if (!people.has(p.id)) playNodeSound(p.id);
      for (const c of snapshot.connections) if (!links.has(c.id)) playConnectionSound(c.id);
    }
    knownParticipants.current = new Set(snapshot.participants.map((p) => p.id));
    knownConnections.current = new Set(snapshot.connections.map((c) => c.id));
  }, []);

  const poll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const snapshot = (await res.json()) as EventSnapshot;
      announce(snapshot);
      setReal(snapshot);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      inFlight.current = false;
    }
  }, [slug, announce]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void poll();
        start();
      }
    };
    if (!document.hidden) {
      queueMicrotask(() => void poll());
      start();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [poll]);

  /** Folds the register response into the local snapshot so the joiner does not wait for the next poll. */
  const merge = useCallback((participant: PublicParticipant, matches: PublicConnection[]) => {
    knownParticipants.current?.add(participant.id);
    for (const m of matches) knownConnections.current?.add(m.id);
    setReal((prev) => {
      if (!prev) return prev;
      const hasPerson = prev.participants.some((p) => p.id === participant.id);
      const knownLinks = new Set(prev.connections.map((c) => c.id));
      return {
        ...prev,
        participants: hasPerson ? prev.participants : [...prev.participants, participant],
        connections: [...prev.connections, ...matches.filter((m) => !knownLinks.has(m.id))],
      };
    });
  }, []);

  const showPreview = Boolean(options.demo) && real !== null && real.participants.length === 0;
  const snapshot = showPreview ? DEMO_SNAPSHOT : real;

  const status: SyncStatus = useMemo(() => {
    if (showPreview) return 'preview';
    if (failed) return 'reconnecting';
    return real ? 'live' : 'syncing';
  }, [showPreview, failed, real]);

  return { snapshot, status, merge };
}
