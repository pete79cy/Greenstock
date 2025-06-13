import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, Download, Trash2, Calendar, Building, Eye, Plus, AlertTriangle, CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface DocumentWithCategory {
  id: string;
  categoryId: number;
  producerId?: string;
  title: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    code: string;
    nameEl: string;
    nameEn: string;
    description: string;
  };
  daysUntilExpiry?: number;
  isExpired?: boolean;
}

export default function DocumentCategoryPage() {
  const [match, params] = useRoute("/documents/:categoryCode");
  const categoryCode = params?.categoryCode || "";
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProducerId, setFilterProducerId] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    producerId: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/documents', categoryCode, filterProducerId],
    queryFn: () => {
      const params = new URLSearchParams();
      const convertedCategoryCode = categoryCode.toUpperCase().replace(/-/g, '_');
      params.append('category', convertedCategoryCode);
      if (filterProducerId) params.append('producerId', filterProducerId);
      return fetch(`/api/documents?${params.toString()}`).then(res => res.json()) as Promise<DocumentWithCategory[]>;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/document-categories"],
    queryFn: () => fetch("/api/document-categories").then(res => res.json())
  });

  const currentCategory = categories.find((cat: any) => cat.code === categoryCode.toUpperCase().replace(/-/g, '_'));

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: data
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Επιτυχία",
        description: "Το έγγραφο ανέβηκε επιτυχώς"
      });
      setIsUploadOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία ανεβάσματος εγγράφου",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Επιτυχία",
        description: "Το έγγραφο διαγράφηκε επιτυχώς"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία διαγραφής εγγράφου",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      producerId: "",
      issueDate: "",
      expiryDate: "",
      notes: "",
    });
    setSelectedFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Σφάλμα",
        description: "Παρακαλώ επιλέξτε ένα αρχείο",
        variant: "destructive"
      });
      return;
    }

    if (!currentCategory) {
      toast({
        title: "Σφάλμα",
        description: "Κατηγορία εγγράφου δεν βρέθηκε",
        variant: "destructive"
      });
      return;
    }

    const submitData = new FormData();
    submitData.append('categoryId', currentCategory.id.toString());
    submitData.append('title', formData.title);
    submitData.append('producerId', formData.producerId);
    submitData.append('issueDate', formData.issueDate);
    submitData.append('expiryDate', formData.expiryDate);
    submitData.append('notes', formData.notes);
    submitData.append('document', selectedFile);

    uploadMutation.mutate(submitData);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getStatusBadge = (doc: DocumentWithCategory) => {
    if (!doc.expiryDate) return null;
    
    if (doc.isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Έληξε
        </Badge>
      );
    }
    
    if (doc.daysUntilExpiry !== undefined && doc.daysUntilExpiry <= 30) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
          <Clock className="h-3 w-3" />
          Λήγει σε {doc.daysUntilExpiry} ημέρες
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-green-700 border-green-300">
        <CheckCircle className="h-3 w-3" />
        Ενεργό
      </Badge>
    );
  };

  const filteredDocuments = Array.isArray(documents) ? documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.producerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Φόρτωση εγγράφων...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/regulatory-checks">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Επιστροφή στο Κέντρο Εγγράφων
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {currentCategory?.nameEl || 'Έγγραφα'}
          </h2>
          <p className="text-gray-600 mt-1">
            {currentCategory?.description}
          </p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Ανέβασμα Εγγράφου
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Ανέβασμα Νέου Εγγράφου
              </DialogTitle>
              <DialogDescription>
                Ανεβάστε ένα νέο έγγραφο στην κατηγορία "{currentCategory?.nameEl}"
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Τίτλος Εγγράφου *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="π.χ. Καταστατικό Εταιρείας 2025"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="producerId">Κωδικός Παραγωγού (προαιρετικό)</Label>
                <Input
                  id="producerId"
                  value={formData.producerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, producerId: e.target.value }))}
                  placeholder="π.χ. CY30401/3PP1V2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">Ημερομηνία Έκδοσης</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Ημερομηνία Λήξης</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="document">Αρχείο Εγγράφου *</Label>
                <Input
                  id="document"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  required
                />
                {selectedFile && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    Επιλεγμένο: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Σημειώσεις (προαιρετικό)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Πρόσθετες πληροφορίες για το έγγραφο..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Ακύρωση
                </Button>
                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Ανεβαίνει..." : "Ανέβασμα"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Αναζήτηση εγγράφων</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Αναζήτηση στον τίτλο, κωδικό παραγωγού ή σημειώσεις..."
              />
            </div>
            <div>
              <Label htmlFor="filterProducerId">Φιλτράρισμα κατά κωδικό παραγωγού</Label>
              <Input
                id="filterProducerId"
                value={filterProducerId}
                onChange={(e) => setFilterProducerId(e.target.value)}
                placeholder="Εισάγετε κωδικό παραγωγού..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Δεν βρέθηκαν έγγραφα</h3>
            <p className="text-gray-500 mb-4">Ανεβάστε το πρώτο σας έγγραφο σε αυτή την κατηγορία.</p>
            <Button onClick={() => setIsUploadOpen(true)}>
              Ανέβασμα Εγγράφου
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {doc.title}
                    </CardTitle>
                    {getStatusBadge(doc)}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Διαγραφή Εγγράφου</AlertDialogTitle>
                        <AlertDialogDescription>
                          Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το έγγραφο; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(doc.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Διαγραφή
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {doc.producerId && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span className="font-medium">Παραγωγός:</span> {doc.producerId}
                  </div>
                )}
                
                {doc.issueDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Ημ. Έκδοσης:</span> {format(new Date(doc.issueDate), 'dd/MM/yyyy')}
                  </div>
                )}

                {doc.expiryDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Ημ. Λήξης:</span> {format(new Date(doc.expiryDate), 'dd/MM/yyyy')}
                  </div>
                )}

                {doc.notes && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Σημειώσεις:</span>
                    <p className="mt-1 text-gray-500 line-clamp-2">{doc.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.filePath, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Προβολή
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = doc.filePath;
                      link.download = doc.fileName;
                      link.click();
                    }}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Λήψη
                  </Button>
                </div>

                <div className="text-xs text-gray-400 pt-2 border-t">
                  Ανέβηκε: {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}