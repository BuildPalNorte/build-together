import type { PublicConnection, PublicParticipant } from '@/lib/events/types';
import type { GraphLink, GraphNode } from './NetworkGraph';

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  linkById: Map<string, GraphLink>;
}

/**
 * Keeps node objects stable between polls so the simulation keeps their positions.
 * `sync` returns the same GraphData object while the set of ids is unchanged,
 * so react-force-graph never reheats the simulation for a poll that changed nothing.
 */
export class GraphModel {
  private nodes = new Map<string, GraphNode>();
  private signature = '';
  private data: GraphData = { nodes: [], links: [], linkById: new Map() };

  sync(people: readonly PublicParticipant[], edges: readonly PublicConnection[]): GraphData {
    const signature = `${people.map((p) => p.id).join(',')}|${edges.map((c) => c.id).join(',')}`;
    if (signature === this.signature) return this.data;
    this.signature = signature;

    const ids = new Set(people.map((p) => p.id));
    for (const id of [...this.nodes.keys()]) if (!ids.has(id)) this.nodes.delete(id);

    const fresh: GraphNode[] = [];
    for (const person of people) {
      const existing = this.nodes.get(person.id);
      if (existing) {
        existing.person = person;
      } else {
        const node: GraphNode = { id: person.id, person };
        this.nodes.set(person.id, node);
        fresh.push(node);
      }
    }

    // Spawn newcomers next to someone they connect to, so they do not fly in from the origin.
    for (const node of fresh) {
      const edge = edges.find((c) => c.sourceId === node.id || c.targetId === node.id);
      const other = edge
        ? this.nodes.get(edge.sourceId === node.id ? edge.targetId : edge.sourceId)
        : undefined;
      if (other && other !== node && Number.isFinite(other.x) && Number.isFinite(other.y)) {
        node.x = (other.x as number) + (Math.random() - 0.5) * 40;
        node.y = (other.y as number) + (Math.random() - 0.5) * 40;
      }
    }

    const links: GraphLink[] = [];
    for (const c of edges) {
      const source = this.nodes.get(c.sourceId);
      const target = this.nodes.get(c.targetId);
      if (source && target) links.push({ id: c.id, source, target, score: c.score, reason: c.reason });
    }
    this.data = { nodes: [...this.nodes.values()], links, linkById: new Map(links.map((l) => [l.id, l])) };
    return this.data;
  }

  node(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  all(): GraphNode[] {
    return [...this.nodes.values()];
  }
}
