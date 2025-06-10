import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmployeeDocumentsProps {
  employeePassport: string;
}

interface EmployeeDocument {
  id: number;
  employeePassport: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

const documentTypeLabels: Record<string, string> = {
  passport: "Passport",
  contract: "Employment Contract",
  visa: "Visa Document",
  plane_ticket: "Plane Ticket"
};

const documentTypeColors: Record<string, string> = {
  passport: "bg-blue-100 text-blue-800",
  contract: "bg-green-100 text-green-800",
  visa: "bg-purple-100 text-purple-800",
  plane_ticket: "bg-orange-100 text-orange-800"
};

export default function EmployeeDocuments({ employeePassport }: EmployeeDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/employees", employeePassport, "documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("documentType", documentType);
      
      const response = await fetch(`/api/employees/${employeePassport}/documents`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload document");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeePassport, "documents"] });
      setSelectedFile(null);
      setSelectedDocumentType("");
      setIsUploading(false);
      toast({ title: "Success", description: "Document uploaded successfully" });
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => 
      apiRequest(`/api/employees/${employeePassport}/documents/${docId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeePassport, "documents"] });
      toast({ title: "Success", description: "Document deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocumentType) {
      toast({ title: "Error", description: "Please select a file and document type", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate({ file: selectedFile, documentType: selectedDocumentType });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Document Type</label>
              <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="contract">Employment Contract</SelectItem>
                  <SelectItem value="visa">Visa Document</SelectItem>
                  <SelectItem value="plane_ticket">Plane Ticket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select File</label>
              <Input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </div>
          </div>
          
          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">
                Selected: <span className="font-medium">{selectedFile.name}</span>
                <span className="text-gray-500 ml-2">({formatFileSize(selectedFile.size)})</span>
              </p>
            </div>
          )}
          
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !selectedDocumentType || isUploading}
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.fileName}</p>
                        <Badge className={documentTypeColors[doc.documentType] || "bg-gray-100 text-gray-800"}>
                          {documentTypeLabels[doc.documentType] || doc.documentType}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(doc.fileSize)} • Uploaded {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.filePath, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}