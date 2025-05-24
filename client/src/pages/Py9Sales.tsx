import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, FileSpreadsheet, TrendingUp, Package2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { type SalesPy9 } from "@shared/schema";

export default function Py9Sales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query for fetching sales
  const { data: sales = [], isLoading, isError } = useQuery<SalesPy9[]>({
    queryKey: ["/api/sales-py9"],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      } else {
        toast({
          title: "Μη έγκυρος τύπος αρχείου",
          description: "Παρακαλώ ανεβάστε ένα αρχείο Excel (.xlsx ή .xls)",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Κανένα αρχείο δεν επιλέχθηκε",
        description: "Παρακαλώ επιλέξτε ένα αρχείο Excel για εισαγωγή.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Πολύ μεγάλο αρχείο",
        description: "Παρακαλώ επιλέξτε αρχείο μικρότερο από 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      toast({
        title: "Μη έγκυρη μορφή αρχείου",
        description: "Παρακαλώ ανεβάστε αρχείο Excel (.xlsx ή .xls).",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/sales-py9/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/sales-py9"] });
      
      if (result.success > 0) {
        toast({
          title: "Επιτυχής εισαγωγή",
          description: result.message,
        });
        setIsImportModalOpen(false);
        setFile(null);
      } else {
        toast({
          title: "Προβλήματα κατά την εισαγωγή",
          description: result.message,
          variant: "destructive",
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log("Import errors:", result.errors);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Σφάλμα εισαγωγής",
        description: "Αποτυχία εισαγωγής αρχείου. Ελέγξτε τη μορφή του αρχείου Excel.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportPdf = () => {
    window.open("/api/reports/py9/pdf", "_blank");
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/sales-py9/template", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Template download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "py9-sales-template.xlsx";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Επιτυχής λήψη",
        description: "Το πρότυπο Excel κατεβάστηκε επιτυχώς",
      });
    } catch (error) {
      console.error("Template download error:", error);
      toast({
        title: "Σφάλμα λήψης",
        description: "Παρουσιάστηκε σφάλμα κατά τη λήψη του προτύπου",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Σφάλμα κατά τη φόρτωση των δεδομένων</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ΠΥ9 - Εισαγωγή Πωλήσεων</h1>
          <p className="text-muted-foreground">
            Εισαγωγή δεδομένων πωλήσεων από Excel και δημιουργία αναφορών
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate} variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Λήψη Προτύπου
          </Button>
          <Button onClick={handleExportPdf} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Εξαγωγή PDF
          </Button>
          <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Εισαγωγή Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Εισαγωγή Πωλήσεων από Excel</DialogTitle>
                <DialogDescription>
                  Ανεβάστε αρχείο Excel με δεδομένα πωλήσεων
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {file ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="mx-auto h-8 w-8 text-green-500" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        Αφαίρεση
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Σύρετε και αφήστε το αρχείο Excel εδώ, ή κάντε κλικ για επιλογή
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-2"
                        onClick={handleBrowseClick}
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Περιήγηση Αρχείων
                      </Button>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Μέγιστο μέγεθος αρχείου: 10MB
                </p>
                
                <div className="text-sm space-y-3">
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Απαιτούμενες στήλες Excel:</h4>
                    <ul className="list-disc pl-5 text-blue-700 space-y-1">
                      <li><strong>Ημερομηνία</strong> ή <strong>Date</strong> - Ημερομηνία πώλησης</li>
                      <li><strong>Είδος</strong> ή <strong>Species</strong> - Είδος φυτού</li>
                      <li><strong>Ποικιλία</strong> ή <strong>Variety</strong> - Ποικιλία (προαιρετικό)</li>
                      <li><strong>Ποσότητα</strong> ή <strong>Quantity</strong> - Ποσότητα πώλησης</li>
                      <li><strong>Κωδικός Παρτίδας</strong> ή <strong>Batch Code</strong> - Κωδικός παρτίδας (προαιρετικό)</li>
                      <li><strong>Κατηγορία Υλικού</strong> ή <strong>Material Category</strong> - Κατηγορία (προαιρετικό)</li>
                      <li><strong>Αγοραστής</strong> ή <strong>Buyer</strong> - Αγοραστής (προαιρετικό)</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsImportModalOpen(false)}
                  >
                    Ακύρωση
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={!file || isUploading}
                  >
                    {isUploading ? "Εισαγωγή..." : "Εισαγωγή"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Πωλήσεις</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολική Ποσότητα</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales.reduce((sum, s) => sum + s.quantity, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Διαφορετικά Είδη</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(sales.map(s => s.species)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μοναδικοί Αγοραστές</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(sales.filter(s => s.buyer).map(s => s.buyer)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Εισαγόμενες Πωλήσεις</CardTitle>
          <CardDescription>
            Λίστα όλων των εισαγόμενων δεδομένων πωλήσεων
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Ημερομηνία</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Είδος</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Ποικιλία</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Ποσότητα</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Κωδικός Παρτίδας</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Κατηγορία</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Αγοραστής</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{sale.date}</td>
                    <td className="border border-gray-300 px-4 py-2">{sale.species}</td>
                    <td className="border border-gray-300 px-4 py-2">{sale.variety || "-"}</td>
                    <td className="border border-gray-300 px-4 py-2">{sale.quantity}</td>
                    <td className="border border-gray-300 px-4 py-2">{sale.batchCode || "-"}</td>
                    <td className="border border-gray-300 px-4 py-2">{sale.materialCategory || "-"}</td>
                    <td className="border border-gray-300 px-4 py-2">{sale.buyer || "-"}</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                      Δεν υπάρχουν εισαγόμενα δεδομένα πωλήσεων
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}