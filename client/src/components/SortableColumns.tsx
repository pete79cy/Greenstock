import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical } from "lucide-react";

interface ColumnItem {
  id: string;
  label: string;
  value: string;
  selected: boolean;
}

interface SortableItemProps {
  id: string;
  label: string;
  selected: boolean;
  onToggle: (value: string) => void;
}

function SortableItem({ id, label, selected, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center p-2 mb-1 rounded border ${selected ? 'bg-primary/10 border-primary/20' : 'bg-background border-input'} cursor-move`}
    >
      <div className="mr-2 text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </div>
      <Checkbox
        id={`col-${id}`}
        checked={selected}
        onCheckedChange={() => onToggle(id)}
        className="mr-2"
      />
      <label
        htmlFor={`col-${id}`}
        className="text-sm font-medium cursor-pointer flex-1"
        onClick={() => onToggle(id)}
      >
        {label}
      </label>
    </div>
  );
}

interface SortableColumnsProps {
  columns: { label: string; value: string }[];
  selectedColumns: string[];
  onSelectedColumnsChange: (columns: string[]) => void;
}

export default function SortableColumns({ 
  columns, 
  selectedColumns, 
  onSelectedColumnsChange 
}: SortableColumnsProps) {
  // Convert columns to format needed for the sortable list
  const items: ColumnItem[] = columns.map(col => ({
    id: col.value,
    label: col.label,
    value: col.value,
    selected: selectedColumns.includes(col.value)
  }));

  // Move selected items to the top
  const sortedItems = [
    ...items.filter(item => selectedColumns.includes(item.id)),
    ...items.filter(item => !selectedColumns.includes(item.id))
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Get current selected columns
      const currentSelected = [...selectedColumns];
      
      // Only reorder if the item is already selected
      if (currentSelected.includes(active.id as string)) {
        // Find the indices
        const oldIndex = currentSelected.indexOf(active.id as string);
        const newIndex = currentSelected.indexOf(over.id as string);
        
        // Reorder the array
        const newOrder = [...currentSelected];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, active.id as string);
        
        onSelectedColumnsChange(newOrder);
      }
    }
  };

  const handleToggle = (value: string) => {
    const newSelected = selectedColumns.includes(value)
      ? selectedColumns.filter(col => col !== value)
      : [...selectedColumns, value];
    
    onSelectedColumnsChange(newSelected);
  };

  return (
    <div className="mb-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 max-h-64 overflow-y-auto p-1">
            {sortedItems.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                label={item.label}
                selected={item.selected}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}