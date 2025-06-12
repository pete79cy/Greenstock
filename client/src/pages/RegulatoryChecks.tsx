import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Upload, Download, Filter, Trash2, Plus, Calendar, Building } from "lucide-react";
import type { RegulatoryCheck } from "@shared/schema";
import BackToMenuButton from "@/components/BackToMenuButton";

export default function RegulatoryChecks() {
  const { toast } = useToast();
  const [filterProducerId, setFilterProducerId] = useState("");
  const [filterFormType, setFilterFormType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    producerId: "",
    date: "",
    formType: "ΦΥ/ΠΥ 3" as const,
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['/api/regulatory-checks', filterProducerId, filterFormType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterProducerId) params.append('producerId', filterProducerId);
      if (filterFormType) params.append('formType', filterFormType);
      const queryString = params.toString();
      return fetch(`/api/regulatory-checks${queryString ? `?${queryString}` : ''}`).then(res => res.json()) as Promise<RegulatoryCheck[]>;
    }
  });

  const createCheckMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/regulatory-checks', {
        method: 'POST',
        body: data
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload regulatory check');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/regulatory-checks'] });
      toast({
        title: "Success",
        description: "Regulatory check uploaded successfully"
      });
      setShowForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload regulatory check",
        variant: "destructive"
      });
    }
  });

  const deleteCheckMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/regulatory-checks/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete regulatory check');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/regulatory-checks'] });
      toast({
        title: "Success",
        description: "Regulatory check deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete regulatory check",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      producerId: "",
      date: "",
      formType: "ΦΥ/ΠΥ 3",
      notes: "",
    });
    setSelectedFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a document file",
        variant: "destructive"
      });
      return;
    }

    const submitData = new FormData();
    submitData.append('producerId', formData.producerId);
    submitData.append('date', formData.date);
    submitData.append('formType', formData.formType);
    submitData.append('notes', formData.notes);
    submitData.append('document', selectedFile);

    createCheckMutation.mutate(submitData);
  };

  const handleDelete = (id: number) => {
    deleteCheckMutation.mutate(id);
  };

  const getFormTypeBadgeColor = (formType: string) => {
    switch (formType) {
      case "ΦΥ/ΠΥ 3": return "bg-blue-100 text-blue-800";
      case "Lab Analysis": return "bg-green-100 text-green-800";
      case "Passport": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Regulatory Compliance</h1>
          <p className="text-gray-600 mt-2">Manage and track compliance documents and regulatory checks</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Regulatory Document
            </CardTitle>
            <CardDescription>
              Upload compliance documents such as ΦΥ/ΠΥ 3 forms, lab analyses, or passports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="producerId">Producer ID</Label>
                  <Input
                    id="producerId"
                    value={formData.producerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, producerId: e.target.value }))}
                    placeholder="Enter producer identifier"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="date">Document Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="formType">Document Type</Label>
                  <Select value={formData.formType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, formType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ΦΥ/ΠΥ 3">ΦΥ/ΠΥ 3</SelectItem>
                      <SelectItem value="Lab Analysis">Lab Analysis</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="document">Document File</Label>
                  <Input
                    id="document"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this document..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createCheckMutation.isPending}>
                  {createCheckMutation.isPending ? "Uploading..." : "Upload Document"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filterProducerId">Filter by Producer ID</Label>
              <Input
                id="filterProducerId"
                value={filterProducerId}
                onChange={(e) => setFilterProducerId(e.target.value)}
                placeholder="Enter producer ID..."
              />
            </div>

            <div>
              <Label htmlFor="filterFormType">Filter by Document Type</Label>
              <Select value={filterFormType || "all"} onValueChange={(value) => setFilterFormType(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ΦΥ/ΠΥ 3">ΦΥ/ΠΥ 3</SelectItem>
                  <SelectItem value="Lab Analysis">Lab Analysis</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterProducerId("");
                  setFilterFormType("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-8">Loading regulatory checks...</div>
      ) : checks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500 mb-4">Upload your first regulatory compliance document to get started.</p>
            <Button onClick={() => setShowForm(true)}>
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checks.map((check) => (
            <Card key={check.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <Badge className={getFormTypeBadgeColor(check.formType)}>
                      {check.formType}
                    </Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this regulatory check? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(check.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span className="font-medium">Producer:</span> {check.producerId}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Date:</span> {new Date(check.date).toLocaleDateString()}
                  </div>

                  {check.notes && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Notes:</span>
                      <p className="mt-1 text-gray-500 line-clamp-2">{check.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(check.documentUrl, '_blank')}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      View Document
                    </Button>
                  </div>

                  <div className="text-xs text-gray-400">
                    Uploaded: {new Date(check.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}