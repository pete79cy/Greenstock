import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Download, Eye, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmployeeDocument {
  id: number;
  employeePassport: string;
  documentType: string;
  filename: string;
  originalFilename: string;
  uploadDate: string;
  notes?: string;
}

interface DocumentUploadProps {
  employeePassport: string;
}

export default function DocumentUpload({ employeePassport }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['/api/employees', employeePassport, 'documents'],
    queryFn: () => fetch(`/api/employees/${employeePassport}/documents`).then(res => res.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/employees/${employeePassport}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', employeePassport, 'documents'] });
      setSelectedFile(null);
      setDocumentType("");
      setNotes("");
      toast({ title: "Success", description: "Document uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => 
      apiRequest(`/api/employees/${employeePassport}/documents/${docId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', employeePassport, 'documents'] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !documentType) {
      toast({ title: "Error", description: "Please select a file and document type", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', documentType);
    if (notes) {
      formData.append('notes', notes);
    }

    uploadMutation.mutate(formData);
  };

  const documentTypes = [
    { value: "passport", label: "Passport" },
    { value: "contract", label: "Employment Contract" },
    { value: "visa", label: "Visa Document" },
    { value: "plane_ticket", label: "Plane Ticket" },
    { value: "arc", label: "ARC Document" },
    { value: "social_insurance", label: "Social Insurance" },
    { value: "tax_document", label: "Tax Document" },
    { value: "other", label: "Other" },
  ];

  const getDocumentTypeLabel = (type: string) => {
    return documentTypes.find(dt => dt.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encryption Status */}
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <Shield className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700 font-medium">All documents are encrypted with AES-256-CBC</span>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Document Type</label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">File</label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Input
              placeholder="Add any notes about this document"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !documentType || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Uploaded Documents</h3>
        
        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents uploaded</h3>
              <p className="text-muted-foreground">
                Upload employee documents like passport, contract, visa, and plane tickets.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {documents.map((doc: EmployeeDocument) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <Shield className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.originalFilename}</p>
                        <Badge variant="outline">
                          {getDocumentTypeLabel(doc.documentType)}
                        </Badge>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Encrypted
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uploaded on {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'Unknown date'}
                      </p>
                      {doc.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Note: {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/uploads/${doc.filename}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `/uploads/${doc.filename}`;
                        link.download = doc.originalFilename;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}