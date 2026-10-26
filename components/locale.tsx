'use client';

import { I18nProvider } from '@heroui/react';
import type { ReactNode } from 'react';

/** Spanish labels for built-in accessibility strings (dismiss buttons, listbox announcements). Not a theme provider. */
export function Locale({ children }: { children: ReactNode }) {
  return <I18nProvider locale="es-MX">{children}</I18nProvider>;
}
