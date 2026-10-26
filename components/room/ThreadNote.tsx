import { Surface } from '@heroui/react';
import { FILAMENT_SCORE } from '@/lib/events/constants';
import { firstName } from '@/lib/network/people';
import type { ThreadInfo } from '../network/NetworkGraph';

export function ThreadNote({ thread }: { thread: ThreadInfo }) {
  return (
    <Surface className="thread-note" variant="default" role="status">
      <strong>
        {firstName(thread.names[0])} + {firstName(thread.names[1])}{' '}
        <span className={`score${thread.score >= FILAMENT_SCORE ? ' hot' : ''}`}>· {thread.score} puntos</span>
      </strong>
      <p>{thread.reason}</p>
    </Surface>
  );
}
