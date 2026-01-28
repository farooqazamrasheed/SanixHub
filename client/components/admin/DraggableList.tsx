import { useState } from 'react';

interface DraggableListProps {
  items: any[];
  onReorder: (items: any[]) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
  keyField?: string;
}

export default function DraggableList({
  items,
  onReorder,
  renderItem,
  keyField = '_id',
}: DraggableListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    // Remove from old position
    newItems.splice(draggedIndex, 1);
    
    // Insert at new position
    newItems.splice(dropIndex, 0, draggedItem);
    
    // Update display order
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      displayOrder: index,
    }));

    onReorder(updatedItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item[keyField]}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`
            cursor-move transition-all
            ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
            ${dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-primary-500' : ''}
          `}
        >
          <div className="flex items-center gap-3 bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
            <div className="flex-1">
              {renderItem(item, index)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
