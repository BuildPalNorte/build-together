import { Label, ListBox, Select } from '@heroui/react';
import type { PublicParticipant } from '@/lib/events/types';

export function PersonJump({
  people,
  onSelect,
}: {
  people: PublicParticipant[];
  onSelect: (id: string) => void;
}) {
  const sorted = [...people].sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
  return (
    <Select
      className="person-jump"
      variant="secondary"
      aria-label="Ir a una persona"
      placeholder="Ir a una persona"
      selectedKey={null}
      onSelectionChange={(key) => {
        if (key !== null) onSelect(String(key));
      }}
    >
      <Label className="sr-only">Ir a una persona</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label="Personas">
          {sorted.map((p) => (
            <ListBox.Item key={p.id} id={p.id} textValue={p.displayName}>
              {p.displayName}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
