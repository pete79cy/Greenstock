import { Link, useLocation, Switch, Route } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Calendar, AlertTriangle, Building2, Scale, Shield, FileCheck, DollarSign, Users, FileInput } from "lucide-react";
import BackToMenuButton from "@/components/BackToMenuButton";
import DocumentCategoryPage from "./DocumentCategoryPage";

interface DocumentCategory {
  id: number;
  code: string;
  nameEl: string;
  nameEn: string;
  description: string;
}

const categoryIcons = {
  FOUNDATION: Building2,
  OPERATING_LICENSE: Scale,
  NURSERY_LICENSE: FileCheck,
  REGULATORY_COMPLIANCE: Shield,
  FINANCIAL: DollarSign,
  INSURANCE: Users,
  CONTRACTS: FileInput,
};

export default function DocumentCenter() {
  const [location] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("ALL");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/document-categories"],
    queryFn: () => fetch("/api/document-categories").then(res => res.json()) as Promise<DocumentCategory[]>
  });

  const { data: expiringDocs = [] } = useQuery({
    queryKey: ["/api/documents/expiring"],
    queryFn: () => fetch("/api/documents/expiring?days=30").then(res => res.json())
  });

  const currentPath = location.split('/').pop() || 'foundation';
  const currentCategory = categories.find(cat => cat.code.toLowerCase().replace('_', '-') === currentPath);

  const filteredCategories = categories.filter(category =>
    category.nameEl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (categoriesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading Document Center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToMenuButton />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Κέντρο Εγγράφων</h1>
          <p className="text-gray-600">Διαχείριση και παρακολούθηση όλων των εταιρικών εγγράφων</p>
        </div>
        
        {expiringDocs.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{expiringDocs.length} έγγραφα λήγουν σύντομα</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar - Categories */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Αναζήτηση
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Αναζήτηση κατηγοριών..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Έτος</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Όλα τα έτη</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Categories Navigation */}
          <Card>
            <CardHeader>
              <CardTitle>Κατηγορίες Εγγράφων</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredCategories.map((category) => {
                const IconComponent = categoryIcons[category.code as keyof typeof categoryIcons] || FileText;
                const routePath = category.code.toLowerCase().replace('_', '-');
                const isActive = currentPath === routePath;
                
                return (
                  <Link key={category.id} href={`/documents/${routePath}`}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start text-left h-auto p-3 mb-1 overflow-hidden ${
                        isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 w-full max-w-full">
                        <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0 max-w-full">
                          <div className="font-medium text-sm leading-tight mb-1 break-words">
                            {category.nameEl}
                          </div>
                          <div className="text-xs opacity-75 leading-tight break-words whitespace-normal">
                            {category.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Γρήγορες Στατιστικές
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Συνολικά έγγραφα</span>
                <Badge variant="secondary">-</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Λήγουν σύντομα</span>
                <Badge variant="destructive">{expiringDocs.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ενεργές κατηγορίες</span>
                <Badge variant="outline">{categories.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Επιλέξτε μια κατηγορία
              </h3>
              <p className="text-gray-500">
                Επιλέξτε μια κατηγορία από την αριστερή πλευρά για να δείτε και να διαχειριστείτε τα έγγραφα.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}