'use client';

import { Button, Toolbar, buttonVariants } from '@heroui/react';
import { Check, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Mark } from '@/components/brand/Mark';
import { NetworkGraph, type GraphHandle, type ThreadInfo } from '@/components/network/NetworkGraph';
import { RegistrationModal } from '@/components/registration/RegistrationModal';
import { Dossier } from '@/components/room/Dossier';
import { Legend } from '@/components/room/Legend';
import { PersonJump } from '@/components/room/PersonJump';
import { StatusChip } from '@/components/room/StatusChip';
import { ThreadNote } from '@/components/room/ThreadNote';
import { ZoomBar } from '@/components/room/ZoomBar';
import { matchesOf, plural } from '@/components/room/room-model';
import { useNetworkPoll } from '@/hooks/use-network-poll';
import { DEFAULT_EVENT_SLUG, DISCIPLINES, FILAMENT_SCORE } from '@/lib/events/constants';
import { setMyParticipantId, useMyParticipantId } from '@/lib/identity';
import { firstName } from '@/lib/network/people';

export function HomeScreen({ demo }: { demo: boolean }) {
  const { snapshot, status, merge } = useNetworkPoll(DEFAULT_EVENT_SLUG, { demo });
  const storedMe = useMyParticipantId();
  const graph = useRef<GraphHandle>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightLinkId, setHighlightLinkId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [shared, setShared] = useState(false);

  const participants = useMemo(() => snapshot?.participants ?? [], [snapshot]);
  const connections = useMemo(() => snapshot?.connections ?? [], [snapshot]);
  const loaded = snapshot !== null;
  const isPreview = status === 'preview';

  const me = useMemo(
    () => (!isPreview && storedMe ? (participants.find((p) => p.id === storedMe) ?? null) : null),
    [isPreview, storedMe, participants],
  );
  const myMatches = useMemo(() => (me ? matchesOf(snapshot, me.id) : []), [me, snapshot]);
  const best = myMatches[0] ?? null;

  // A selection whose person is gone (the room was emptied) simply resolves to null.
  const selected = selectedId ? (participants.find((p) => p.id === selectedId) ?? null) : null;

  const strongCount = useMemo(() => connections.filter((c) => c.score >= FILAMENT_SCORE).length, [connections]);
  const disciplines = useMemo(() => {
    const present = new Set(participants.map((p) => p.discipline));
    return [...DISCIPLINES.filter((d) => present.has(d)), ...[...present].filter((d) => !DISCIPLINES.includes(d as never))];
  }, [participants]);

  const showAction = loaded && (me === null || best !== null);
  const actionLabel = me && best ? `Ver a ${firstName(best.other.displayName)}` : 'Unirme a la red';

  const onAction = () => {
    if (me && best) setSelectedId(best.other.id);
    else setJoinOpen(true);
  };

  const title = me ? me.displayName : 'La red del taller';
  const lede = (() => {
    if (me && best) {
      return `${firstName(best.other.displayName)} es tu hilo más fuerte, ${best.link.score} puntos. ${best.link.reason}.`;
    }
    if (me) return 'Tu gafete ya está en el salón. El primer hilo aparece cuando entra alguien compatible.';
    if (participants.length === 0) return 'El talento existe. Solo falta conectarlo.';
    const n = plural(participants.length, 'persona', 'personas');
    if (strongCount === 0) return `${n} en el salón. Todavía sin un hilo de ${FILAMENT_SCORE} puntos.`;
    return `${n} en el salón. ${plural(strongCount, 'hilo', 'hilos')} de ${FILAMENT_SCORE} puntos o más.`;
  })();

  const onJoined = useCallback(
    (participant: Parameters<typeof merge>[0], matches: Parameters<typeof merge>[1]) => {
      merge(participant, matches);
      setMyParticipantId(participant.id);
    },
    [merge],
  );

  const share = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Build Together', text: 'El talento existe. Solo falta conectarlo.', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* the share sheet was dismissed */
    }
  };

  return (
    <main className={`app home${showAction ? ' has-action' : ''}${selected ? ' has-dossier' : ''}`}>
      <NetworkGraph
        ref={graph}
        variant="home"
        participants={participants}
        connections={connections}
        loaded={loaded}
        meId={me?.id ?? null}
        selectedId={selected?.id ?? null}
        highlightLinkId={highlightLinkId}
        panelOpen={selected !== null}
        hasAction={showAction}
        onSelect={setSelectedId}
        onThread={setThread}
      />

      <header className="glass-bar">
        <div className="brand">
          <Mark />
          <div>
            <p>Build Together</p>
            <span>Tec de Matamoros</span>
          </div>
        </div>
        <Toolbar className="bar-actions bar-toolbar" aria-label="Acciones">
          <StatusChip status={status} />
          <Link href="/stage" className={buttonVariants({ variant: 'ghost' })}>
            Proyector
          </Link>
          <Button variant="ghost" onPress={share} aria-live="polite">
            {shared ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
            {shared ? 'Copiado' : 'Compartir'}
          </Button>
        </Toolbar>
      </header>

      <div className="float-copy">
        <h1>{title}</h1>
        <p>{lede}</p>
      </div>

      {selected === null && participants.length > 0 ? <PersonJump people={participants} onSelect={setSelectedId} /> : null}

      <ZoomBar graph={graph} />
      <Legend disciplines={disciplines} />
      {thread ? <ThreadNote thread={thread} /> : null}

      {selected ? (
        <Dossier
          key={selected.id}
          person={selected}
          matches={matchesOf(snapshot, selected.id)}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
          onHoverLink={setHighlightLinkId}
        />
      ) : null}

      {showAction ? (
        <div className="float-action">
          <Button variant="primary" onPress={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}

      <RegistrationModal isOpen={joinOpen} onOpenChange={setJoinOpen} onJoined={onJoined} />
    </main>
  );
}
