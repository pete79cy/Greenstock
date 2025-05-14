import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType, Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ExportDropdown() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Create a hidden file input for restore
  const fileInputElement = (
    <input
      type="file"
      ref={fileInputRef}
      style={{ display: "none" }}
      accept=".json"
      onChange={handleFileSelected}
    />
  );

  function handleBackupClick() {
    handleCreateBackup();
  }

  function handleRestoreClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      // Show confirmation dialog
      setShowRestoreConfirm(true);
    }
  }

  async function handleRestoreConfirmed() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({
        title: "Restore Error",
        description: "No backup file selected.",
        variant: "destructive",
      });
      return;
    }

    setIsRestoring(true);
    
    try {
      const formData = new FormData();
      formData.append("backupFile", file);
      
      const response = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Restore failed");
      }
      
      // Show success message
      toast({
        title: "Restore Successful",
        description: `${result.success} plants restored successfully.`,
      });
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/plants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
    } catch (error) {
      console.error("Restore error:", error);
      toast({
        title: "Restore Failed",
        description: (error as Error).message || "There was an error restoring the backup.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      setShowRestoreConfirm(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleCreateBackup() {
    setIsExporting(true);
    
    try {
      const response = await fetch("/api/backup", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Backup failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "plant-inventory-backup.json"; // Default filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Backup successful",
        description: `Plant inventory backed up to ${filename}`,
      });
    } catch (error) {
      console.error("Backup error:", error);
      toast({
        title: "Backup failed",
        description: "There was an error creating the backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch("/api/plants/export/excel", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "plant-inventory.xlsx";
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Plant inventory exported to Excel",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting to Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch("/api/plants/export/pdf", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "plant-inventory.pdf";
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Plant inventory exported to PDF",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting to PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportCultivationDeclaration = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch("/api/plants/export/cultivation-declaration", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "cultivation-declaration.pdf";
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Cultivation Declaration exported to PDF",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the Cultivation Declaration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Hidden file input for backup restore */}
      {fileInputElement}
      
      {/* Restore confirmation dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all your current plant data with data from the backup file.
              This action cannot be undone.
              
              <p className="mt-2 font-semibold text-destructive">Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              disabled={isRestoring} 
              onClick={(e) => {
                e.preventDefault();
                handleRestoreConfirmed();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRestoring ? "Restoring..." : "Yes, Restore Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Export dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Export / Backup
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            onClick={handleExportExcel}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Export as Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <FileType className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Export as PDF</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleExportCultivationDeclaration}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>ΔΗΛΩΣΗ ΚΑΛΛΙΕΡΓΕΙΑΣ</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleBackupClick}
            disabled={isExporting}
            className="cursor-pointer"
          >
            <Save className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Backup Data (JSON)</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleRestoreClick}
            disabled={isExporting || isRestoring}
            className="cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Restore from Backup</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
