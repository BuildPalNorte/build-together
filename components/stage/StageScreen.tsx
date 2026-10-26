'use client';

import { Button, Toolbar, ToggleButton, Surface, ScrollShadow } from '@heroui/react';
import { Activity, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Mark } from '@/components/brand/Mark';
import { NetworkGraph, type GraphHandle, type ThreadInfo } from '@/components/network/NetworkGraph';
import { Dossier } from '@/components/room/Dossier';
import { StatusChip } from '@/components/room/StatusChip';
import { ThreadNote } from '@/components/room/ThreadNote';
import { ZoomBar } from '@/components/room/ZoomBar';
import { matchesOf } from '@/components/room/room-model';
import { useNetworkPoll } from '@/hooks/use-network-poll';
import { useSoundEnabled } from '@/hooks/use-sound-enabled';
import { DEFAULT_EVENT_SLUG, DISCIPLINE_SHORT, FILAMENT_SCORE, STRONG_MATCH_SCORE } from '@/lib/events/constants';
import { firstName } from '@/lib/network/people';

const FEED_LIMIT = 12;
const subscribeNever = () => () => {};

export function StageScreen({ demo }: { demo: boolean }) {
  const { snapshot, status } = useNetworkPoll(DEFAULT_EVENT_SLUG, { demo });
  const graph = useRef<GraphHandle>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightLinkId, setHighlightLinkId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [railVisible, setRailVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => '');
  const [soundOn, setSound] = useSoundEnabled();

  const participants = useMemo(() => snapshot?.participants ?? [], [snapshot]);
  const connections = useMemo(() => snapshot?.connections ?? [], [snapshot]);
  const loaded = snapshot !== null;

  const selected = selectedId ? (participants.find((p) => p.id === selectedId) ?? null) : null;

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const strongCount = useMemo(() => connections.filter((c) => c.score >= STRONG_MATCH_SCORE).length, [connections]);
  const careerCount = useMemo(() => new Set(participants.map((p) => p.discipline)).size, [participants]);

  const feed = useMemo(() => {
    const people = new Map(participants.map((p) => [p.id, p]));
    const rows = [
      ...participants.map((p) => ({
        key: `p-${p.id}`,
        at: p.createdAt,
        hot: false,
        title: `${firstName(p.displayName)} entró`,
        detail: DISCIPLINE_SHORT[p.discipline] ?? p.discipline,
      })),
      ...connections.flatMap((c) => {
        const a = people.get(c.sourceId);
        const b = people.get(c.targetId);
        if (!a || !b) return [];
        return [
          {
            key: `c-${c.id}`,
            at: c.createdAt,
            hot: c.score >= FILAMENT_SCORE,
            title: `${firstName(a.displayName)} + ${firstName(b.displayName)}`,
            detail: `${c.score} puntos`,
          },
        ];
      }),
    ];
    return rows.sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0)).slice(0, FEED_LIMIT);
  }, [participants, connections]);

  const showRail = railVisible && selected === null;

  return (
    <main className={`app stage${selected ? ' has-dossier' : ''}`}>
      <NetworkGraph
        ref={graph}
        variant="stage"
        participants={participants}
        connections={connections}
        loaded={loaded}
        meId={null}
        selectedId={selected?.id ?? null}
        highlightLinkId={highlightLinkId}
        panelOpen={selected !== null}
        railOpen={showRail}
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
        <div className="bar-actions">
          <div className="figures" role="group" aria-label="Cifras">
            <div className="figure">
              <strong>{participants.length}</strong>
              <span>Personas</span>
            </div>
            <div className="figure">
              <strong>{strongCount}</strong>
              <span>Hilos fuertes</span>
            </div>
            <div className="figure optional">
              <strong>{careerCount}</strong>
              <span>Carreras</span>
            </div>
          </div>
          <Toolbar className="bar-toolbar" aria-label="Controles del proyector">
            <StatusChip status={status} />
            <ToggleButton variant="ghost" isSelected={soundOn} onChange={setSound}>
              {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              {soundOn ? 'Sonido' : 'Mudo'}
            </ToggleButton>
            <ToggleButton variant="ghost" isSelected={railVisible} onChange={setRailVisible}>
              <Activity aria-hidden="true" />
              Actividad
            </ToggleButton>
            <Button variant="ghost" onPress={toggleFullscreen}>
              {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
              {fullscreen ? 'Ventana' : 'Pantalla'}
            </Button>
          </Toolbar>
        </div>
      </header>

      <ZoomBar graph={graph} />
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

      {showRail ? (
        <aside className="stage-rail" aria-label="Actividad">
          <Surface className="rail-section rail-activity" variant="default">
            <h2>Ahora en el taller</h2>
            {feed.length === 0 ? (
              <p className="feed-empty">Nadie ha entrado.</p>
            ) : (
              <ScrollShadow className="feed" hideScrollBar>
                {feed.map((row) => (
                  <div key={row.key} className="feed-row">
                    <span className={`pip ${row.hot ? 'hot' : 'quiet'}`} aria-hidden="true" />
                    <div>
                      <strong>{row.title}</strong>
                      <span>{row.detail}</span>
                    </div>
                  </div>
                ))}
              </ScrollShadow>
            )}
          </Surface>
          <Surface className="stage-qr" variant="default">
            <div className="qr-tile">
              {origin ? (
                <QRCodeSVG value={origin} size={108} level="M" bgColor="#ffffff" fgColor="#16140f" marginSize={2} title="Código QR para unirte" />
              ) : (
                <div style={{ width: 108, height: 108 }} />
              )}
            </div>
            <p>Escanea y entra</p>
          </Surface>
        </aside>
      ) : null}
    </main>
  );
}
