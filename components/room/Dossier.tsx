import { Button, CloseButton, ScrollShadow, Separator, Surface } from '@heroui/react';
import { FILAMENT_SCORE } from '@/lib/events/constants';
import type { PublicParticipant } from '@/lib/events/types';
import type { MatchEntry } from './room-model';
import { plural } from './room-model';

interface DossierProps {
  person: PublicParticipant;
  matches: MatchEntry[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onHoverLink: (id: string | null) => void;
}

export function Dossier({ person, matches, onClose, onSelect, onHoverLink }: DossierProps) {
  return (
    <Surface className="dossier" variant="default" role="region" aria-label={`Ficha de ${person.displayName}`}>
      <CloseButton className="dossier-close" aria-label="Cerrar ficha" onPress={onClose} />
      <ScrollShadow className="dossier-scroll" hideScrollBar>
        <h2>{person.displayName}</h2>
        <p className="career">{person.discipline}</p>
        <p className="detail">{person.interests.join(' · ')}</p>
        <p className="skills">{person.skills.join(' · ')}</p>
        <p className="count">
          {matches.length > 0 ? plural(matches.length, 'coincidencia', 'coincidencias') : 'Todavía sin coincidencias'}
        </p>
        {matches.length > 0 ? (
          <ul className="match-list">
            {matches.map(({ link, other }, i) => (
              <li key={link.id}>
                {i > 0 ? <Separator className="match-rule" /> : null}
                <Button
                  variant="ghost"
                  fullWidth
                  className="match-row"
                  onPress={() => onSelect(other.id)}
                  onHoverStart={() => onHoverLink(link.id)}
                  onHoverEnd={() => onHoverLink(null)}
                  onFocus={() => onHoverLink(link.id)}
                  onBlur={() => onHoverLink(null)}
                >
                  <span className="match-line">
                    <span>{other.displayName}</span>
                    <span className={`score${link.score >= FILAMENT_SCORE ? ' hot' : ''}`}>{link.score}</span>
                  </span>
                  <span className="match-reason">{link.reason}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </ScrollShadow>
    </Surface>
  );
}
