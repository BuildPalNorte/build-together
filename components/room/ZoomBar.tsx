import { Button } from '@heroui/react';
import { Minus, Plus, Scan } from 'lucide-react';
import type { RefObject } from 'react';
import type { GraphHandle } from '../network/NetworkGraph';

export function ZoomBar({ graph }: { graph: RefObject<GraphHandle | null> }) {
  return (
    <div className="zoom-bar" role="group" aria-label="Zoom">
      <Button isIconOnly variant="ghost" aria-label="Acercar" onPress={() => graph.current?.zoomIn()}>
        <Plus aria-hidden="true" />
      </Button>
      <Button isIconOnly variant="ghost" aria-label="Alejar" onPress={() => graph.current?.zoomOut()}>
        <Minus aria-hidden="true" />
      </Button>
      <Button isIconOnly variant="ghost" aria-label="Ver todo el salón" onPress={() => graph.current?.fit()}>
        <Scan aria-hidden="true" />
      </Button>
    </div>
  );
}
