import { z } from 'zod';
import {
  DEFAULT_EVENT_SLUG,
  DISCIPLINES,
  INTERESTS,
  MAX_INTERESTS,
  MAX_SKILLS,
  SKILLS,
} from '../events/constants';

export const registerSchema = z.object({
  eventSlug: z.string().default(DEFAULT_EVENT_SLUG),
  displayName: z
    .string({ error: 'Escribe tu nombre.' })
    .trim()
    .min(2, 'Tu nombre necesita al menos 2 letras.')
    .max(40, 'Tu nombre admite hasta 40 caracteres.')
    .regex(/^[^<>]*$/, 'Ese nombre tiene caracteres que no se admiten.'),
  discipline: z.enum(DISCIPLINES, { error: 'Elige tu carrera.' }),
  skills: z
    .array(z.enum(SKILLS, { error: 'Habilidad no válida.' }))
    .min(1, 'Elige al menos una habilidad.')
    .max(MAX_SKILLS, `Elige hasta ${MAX_SKILLS} habilidades.`),
  interests: z
    .array(z.enum(INTERESTS, { error: 'Interés no válido.' }))
    .min(1, 'Elige al menos un interés.')
    .max(MAX_INTERESTS, `Elige hasta ${MAX_INTERESTS} intereses.`),
  consent: z.literal(true, { error: 'Falta el consentimiento.' }),
  visitorId: z.uuid({ error: 'Identificador no válido.' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
