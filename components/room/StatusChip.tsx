import { Chip } from '@heroui/react';
import type { SyncStatus } from '@/hooks/use-network-poll';

const LABEL: Record<SyncStatus, string> = {
  syncing: 'Sincronizando',
  live: 'En vivo',
  reconnecting: 'Reconectando',
  preview: 'Vista previa',
};

const PIP: Record<SyncStatus, string> = {
  syncing: 'quiet',
  live: '',
  reconnecting: 'error',
  preview: 'preview',
};

export function StatusChip({ status }: { status: SyncStatus }) {
  return (
    <Chip variant="tertiary" className="chip status">
      <span className={`pip ${PIP[status]}`} aria-hidden="true" />
      <Chip.Label>{LABEL[status]}</Chip.Label>
    </Chip>
  );
}
