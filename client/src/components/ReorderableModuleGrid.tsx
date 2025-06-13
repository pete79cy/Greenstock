import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Package, 
  BarChart3, 
  ShoppingCart, 
  PackageX, 
  TrendingUp, 
  Users, 
  FileText, 
  Shield, 
  Database,
} from "lucide-react";

interface ModuleItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const defaultModules: ModuleItem[] = [
  {
    id: "inventory",
    title: "Plant Inventory",
    description: "Manage your plant collection and stock levels",
    icon: <Package className="h-8 w-8" />,
    href: "/inventory",
    color: "bg-emerald-500 hover:bg-emerald-600"
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    description: "View detailed reports and business insights",
    icon: <BarChart3 className="h-8 w-8" />,
    href: "/reports",
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    id: "py8-purchases",
    title: "PY8 Purchases",
    description: "Track and manage purchase orders",
    icon: <ShoppingCart className="h-8 w-8" />,
    href: "/py8-purchases",
    color: "bg-orange-500 hover:bg-orange-600"
  },
  {
    id: "batch-purchases",
    title: "Batch Purchases",
    description: "Process multiple purchase orders at once",
    icon: <PackageX className="h-8 w-8" />,
    href: "/py8-batch-purchases",
    color: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "py9-sales",
    title: "PY9 Sales",
    description: "Monitor sales performance and transactions",
    icon: <TrendingUp className="h-8 w-8" />,
    href: "/py9-sales",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    id: "employees",
    title: "Employee Management",
    description: "Manage staff information and records",
    icon: <Users className="h-8 w-8" />,
    href: "/employees",
    color: "bg-indigo-500 hover:bg-indigo-600"
  },
  {
    id: "payslips",
    title: "Payroll & Payslips",
    description: "Handle payroll processing and payslips",
    icon: <FileText className="h-8 w-8" />,
    href: "/payslips",
    color: "bg-teal-500 hover:bg-teal-600"
  },
  {
    id: "regulatory",
    title: "Regulatory Compliance",
    description: "Ensure compliance with regulations",
    icon: <Shield className="h-8 w-8" />,
    href: "/regulatory-checks",
    color: "bg-red-500 hover:bg-red-600"
  },
  {
    id: "backup",
    title: "Backup & Restore",
    description: "Manage data backups and system recovery",
    icon: <Database className="h-8 w-8" />,
    href: "/backup-restore",
    color: "bg-gray-500 hover:bg-gray-600"
  },
];

interface SortableItemProps {
  module: ModuleItem;
  isDragging?: boolean;
}

function SortableItem({ module, isDragging }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableIsDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link href={module.href}>
        <Card className={`
          ${module.color} text-white rounded-xl shadow-lg 
          transform transition-all duration-200 hover:scale-105 hover:shadow-xl
          cursor-pointer group h-48 flex flex-col justify-center
          ${sortableIsDragging ? 'cursor-grabbing' : 'cursor-grab'}
        `}>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                {module.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">{module.title}</h3>
                <p className="text-sm opacity-90 leading-relaxed">
                  {module.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export function ReorderableModuleGrid() {
  const [modules, setModules] = useState<ModuleItem[]>(defaultModules);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('dashboard-module-order');
    if (savedOrder) {
      try {
        const moduleOrder = JSON.parse(savedOrder);
        const reorderedModules = moduleOrder
          .map((id: string) => defaultModules.find(m => m.id === id))
          .filter(Boolean);
        
        // Add any new modules that weren't in the saved order
        const existingIds = new Set(moduleOrder);
        const newModules = defaultModules.filter(m => !existingIds.has(m.id));
        
        setModules([...reorderedModules, ...newModules]);
      } catch (error) {
        console.error('Error loading saved module order:', error);
      }
    }
  }, []);

  // Save order to localStorage whenever modules change
  useEffect(() => {
    const moduleOrder = modules.map(m => m.id);
    localStorage.setItem('dashboard-module-order', JSON.stringify(moduleOrder));
  }, [modules]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setModules((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={modules.map(m => m.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <SortableItem key={module.id} module={module} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <div className="text-center mt-8 text-gray-500">
        <p className="text-sm">
          Drag and drop modules to reorder them. Your layout will be saved automatically.
        </p>
      </div>
    </div>
  );
}