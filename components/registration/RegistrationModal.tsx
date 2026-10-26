'use client';

import { Alert, Button, Form, Input, Label, Modal, Spinner, TextField, ToggleButton } from '@heroui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_EVENT_SLUG,
  DISCIPLINES,
  INTERESTS,
  MAX_INTERESTS,
  MAX_SKILLS,
  SKILLS,
} from '@/lib/events/constants';
import type { PublicConnection, PublicParticipant } from '@/lib/events/types';
import { getVisitorId } from '@/lib/identity';
import { initialsOf } from '@/lib/network/people';

interface RegistrationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (participant: PublicParticipant, matches: PublicConnection[]) => void;
}

const CLOSE_AFTER_MS = 1200;

function toggle(list: string[], item: string, max: number): string[] {
  if (list.includes(item)) return list.filter((x) => x !== item);
  return list.length >= max ? list : [...list, item];
}

export function RegistrationModal({ isOpen, onOpenChange, onJoined }: RegistrationModalProps) {
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<PublicParticipant | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setName('');
    setDiscipline(null);
    setSkills([]);
    setInterests([]);
    setPending(false);
    setError(null);
    setJoined(null);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) reset();
  };

  const valid = name.trim().length >= 2 && discipline !== null && skills.length > 0 && interests.length > 0;

  const submit = async () => {
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: DEFAULT_EVENT_SLUG,
          displayName: name.trim(),
          discipline,
          skills,
          interests,
          consent: true,
          visitorId: getVisitorId(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        participant?: PublicParticipant;
        matches?: PublicConnection[];
        error?: string;
      };
      if (!res.ok || !data.participant) {
        setError(data.error ?? 'No pudimos registrarte. Intenta de nuevo.');
        setPending(false);
        return;
      }
      onJoined(data.participant, data.matches ?? []);
      setJoined(data.participant);
      setPending(false);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const { default: confetti } = await import('canvas-confetti');
        confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 }, colors: ['#f7f4ee', '#cfc3a2', '#ffffff'] });
      }
      closeTimer.current = setTimeout(() => handleOpenChange(false), CLOSE_AFTER_MS);
    } catch {
      setError('No pudimos conectar. Revisa tu señal e intenta de nuevo.');
      setPending(false);
    }
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange} variant="opaque" isDismissable>
      <Modal.Container placement="auto">
        <Modal.Dialog className="bt-sheet" aria-label="Únete a la red">
          <div className="grabber" aria-hidden="true" />
          <Modal.CloseTrigger aria-label="Cerrar" />
          {joined ? (
            <div className="sheet-success" role="status">
              <div className="arrival-orb" aria-hidden="true">
                {initialsOf(joined.displayName)}
              </div>
              <h2>Ya estás en el salón</h2>
              <p>Tu luz aparece en el proyector y busca coincidencias.</p>
            </div>
          ) : (
            <>
              <div className="sheet-head">
                <Modal.Heading className="sheet-heading">Únete a la red</Modal.Heading>
                <p>Nombre, carrera, lo que sabes y lo que te gusta. Sin correo.</p>
              </div>
              <Form
                className="sheet-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <TextField
                  name="displayName"
                  value={name}
                  onChange={setName}
                  maxLength={40}
                  autoComplete="given-name"
                >
                  <Label className="sheet-label">¿Cómo te llamas?</Label>
                  <Input className="input" placeholder="Tu nombre" variant="secondary" autoFocus />
                </TextField>

                <section aria-labelledby="bt-carrera">
                  <h3 className="sheet-label" id="bt-carrera">
                    Carrera
                  </h3>
                  <div className="choice-grid two" role="group" aria-labelledby="bt-carrera">
                    {DISCIPLINES.map((d) => (
                      <ToggleButton
                        key={d}
                        className="choice-toggle"
                        isSelected={discipline === d}
                        onChange={() => setDiscipline(d)}
                      >
                        {d}
                      </ToggleButton>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="bt-habilidades">
                  <h3 className="sheet-label" id="bt-habilidades">
                    Habilidades
                    <small>
                      {skills.length}/{MAX_SKILLS}
                    </small>
                  </h3>
                  <div className="choice-grid" role="group" aria-labelledby="bt-habilidades">
                    {SKILLS.map((s) => (
                      <ToggleButton
                        key={s}
                        className="choice-toggle"
                        isSelected={skills.includes(s)}
                        onChange={() => setSkills((cur) => toggle(cur, s, MAX_SKILLS))}
                      >
                        {s}
                      </ToggleButton>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="bt-intereses">
                  <h3 className="sheet-label" id="bt-intereses">
                    Intereses
                    <small>
                      {interests.length}/{MAX_INTERESTS}
                    </small>
                  </h3>
                  <div className="choice-grid" role="group" aria-labelledby="bt-intereses">
                    {INTERESTS.map((i) => (
                      <ToggleButton
                        key={i}
                        className="choice-toggle"
                        isSelected={interests.includes(i)}
                        onChange={() => setInterests((cur) => toggle(cur, i, MAX_INTERESTS))}
                      >
                        {i}
                      </ToggleButton>
                    ))}
                  </div>
                </section>

                {error ? (
                  <Alert status="danger" className="sheet-error">
                    <Alert.Content>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <Button type="submit" variant="primary" className="sheet-submit" isDisabled={!valid} isPending={pending}>
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? 'Entrando' : 'Entrar a la red'}
                    </>
                  )}
                </Button>
              </Form>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
