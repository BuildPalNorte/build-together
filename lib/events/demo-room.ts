import type { EventSnapshot, PublicConnection, PublicParticipant } from './types';

const AT = '2026-01-01T00:00:00.000Z';

function person(
  n: number,
  displayName: string,
  discipline: string,
  skills: string[],
  interests: string[],
): PublicParticipant {
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    displayName,
    discipline,
    skills,
    interests,
    createdAt: AT,
  };
}

const PEOPLE: PublicParticipant[] = [
  person(1, 'Valeria Ortiz', 'Sistemas Computacionales', ['Programación', 'Inteligencia Artificial'], ['Inteligencia Artificial', 'Videojuegos']),
  person(2, 'Diego Salinas', 'Mecatrónica', ['Robótica', 'Electrónica'], ['Robótica', 'Fútbol']),
  person(3, 'Camila Reyes', 'Industrial', ['Liderazgo', 'Negocios'], ['Aplicaciones', 'Música']),
  person(4, 'Mateo Cantú', 'Electrónica', ['Electrónica', 'Diseño 3D'], ['Robótica', 'Anime']),
  person(5, 'Sofía Lozano', 'Sistemas Computacionales', ['Diseño UX/UI', 'Programación'], ['Aplicaciones', 'Arte']),
  person(6, 'Andrés Treviño', 'Ambiental', ['Análisis de Datos'], ['Medio Ambiente', 'Fotografía']),
  person(7, 'Renata Guerra', 'Administración / Negocios', ['Marketing', 'Comunicación'], ['Música', 'Cine']),
  person(8, 'Luis Barrera', 'Civil', ['Liderazgo'], ['Deportes', 'Medio Ambiente']),
];

function link(n: number, a: number, b: number, score: number, reason: string): PublicConnection {
  return {
    id: `10000000-0000-4000-8000-00000000000${n}`,
    sourceId: PEOPLE[a - 1].id,
    targetId: PEOPLE[b - 1].id,
    score,
    reason,
    createdAt: AT,
  };
}

const LINKS: PublicConnection[] = [
  link(1, 1, 5, 19, 'Interés mutuo en Aplicaciones y Videojuegos · Programación + Diseño UX/UI: habilidades complementarias'),
  link(2, 2, 4, 18, 'Interés mutuo en Robótica y Anime · Robótica + Electrónica: habilidades complementarias'),
  link(3, 1, 4, 17, 'Ambos comparten interés en Robótica · Electrónica + Programación: habilidades complementarias'),
  link(4, 3, 5, 16, 'Ambos comparten interés en Aplicaciones · Liderazgo + Programación: habilidades complementarias'),
  link(5, 3, 7, 14, 'Ambos comparten interés en Música · Liderazgo + Marketing: habilidades complementarias'),
  link(6, 6, 8, 11, 'Ambos comparten interés en Medio Ambiente · Misma disciplina en Otra'),
  link(7, 6, 1, 9, 'Inteligencia Artificial + Análisis de Datos: habilidades complementarias'),
  link(8, 7, 5, 8, 'Ambos comparten interés en Arte · Marketing + Diseño UX/UI: habilidades complementarias'),
];

export const DEMO_SNAPSHOT: EventSnapshot = {
  event: { id: 'demo', slug: 'demo', name: 'Vista previa' },
  participants: PEOPLE,
  connections: LINKS,
};
