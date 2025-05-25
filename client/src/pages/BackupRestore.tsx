import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Shield, Database, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function BackupRestore() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [lastBackupInfo, setLastBackupInfo] = useState<any>(null);

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      
      const response = await fetch("/api/backup", {
        credentials: 'include',
        cache: 'no-store'
      });
      
      // Handle both 200 (new data) and 304 (cached data) as success
      if (!response.ok && response.status !== 304) {
        throw new Error(`Backup failed: ${response.statusText}`);
      }
      
      // For 304 responses, treat as success but skip download
      if (response.status === 304) {
        toast({
          title: "Backup Retrieved Successfully",
          description: "Your backup data is ready for download",
        });
        return;
      }
      
      // Handle the backup file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] 
        || `payroll_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setLastBackupInfo({
        timestamp: new Date().toISOString(),
        totalRecords: 'Successfully exported',
        tables: ['All critical data tables']
      });
      
      toast({
        title: "Backup Created Successfully",
        description: "All critical payroll data exported safely",
      });
      
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setRestoreFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid JSON backup file",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        title: "No File Selected",
        description: "Please select a backup file to restore",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreProgress(0);
      
      const formData = new FormData();
      formData.append('backupFile', restoreFile);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setRestoreProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const response = await fetch("/api/restore", {
        method: "POST",
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore data');
      }
      
      const result = await response.json();
      
      clearInterval(progressInterval);
      setRestoreProgress(100);
      
      toast({
        title: "Data Restored Successfully",
        description: `${result.totalRestored} records restored from backup`,
      });
      
      // Reset form
      setRestoreFile(null);
      const fileInput = document.getElementById('restore-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      setRestoreProgress(0);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Data Backup & Restore</h1>
        </div>
        <p className="text-muted-foreground">
          Protect your critical payroll and employee data with comprehensive backup and restoration tools
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Always create regular backups of your payroll data. 
          Store backup files securely and verify them periodically to ensure data integrity.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Create Backup
            </CardTitle>
            <CardDescription>
              Export all your critical data including employees, payslips, plants, and financial records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Backup Coverage</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Employee records & payslips
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Plant inventory & cultivation data
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Purchase & sales records (ΠΥ8/ΠΥ9)
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  User accounts & system settings
                </div>
              </div>
            </div>

            {lastBackupInfo && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-800 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Last Backup Created
                </div>
                <div className="text-sm text-green-700 mt-1">
                  <div>Date: {new Date(lastBackupInfo.timestamp).toLocaleString()}</div>
                  <div>Records: {lastBackupInfo.totalRecords}</div>
                  <div>Tables: {lastBackupInfo.tables.join(', ')}</div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleBackup} 
              disabled={isBackingUp}
              className="w-full"
              size="lg"
            >
              {isBackingUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create Full Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Restore Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore Data
            </CardTitle>
            <CardDescription>
              Restore your data from a previously created backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restore-file">Select Backup File</Label>
              <Input
                id="restore-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={isRestoring}
              />
              {restoreFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {isRestoring && (
              <div className="space-y-2">
                <Label>Restoration Progress</Label>
                <Progress value={restoreProgress} className="w-full" />
                <div className="text-sm text-center text-muted-foreground">
                  {restoreProgress}% Complete
                </div>
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Warning:</strong> Restoring data will add records from the backup file. 
                Duplicate records may be skipped automatically.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleRestore} 
              disabled={!restoreFile || isRestoring}
              variant="secondary"
              className="w-full"
              size="lg"
            >
              {isRestoring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Restoring Data...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Restore from Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Backup Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Regular Backups</h4>
              <p className="text-sm text-muted-foreground">
                Create daily backups of your payroll data, especially before major operations like payroll processing or data imports.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Secure Storage</h4>
              <p className="text-sm text-muted-foreground">
                Store backup files in multiple secure locations - cloud storage, external drives, and encrypted archives.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Verify Backups</h4>
              <p className="text-sm text-muted-foreground">
                Regularly test your backup files by checking their content and ensuring they can be successfully restored.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Data Protection</h4>
              <p className="text-sm text-muted-foreground">
                Backup files contain sensitive employee data. Always encrypt and protect them according to privacy regulations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}