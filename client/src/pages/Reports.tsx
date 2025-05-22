import { useState } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, BarChart } from "lucide-react";
import CustomReportForm from "@/components/CustomReportForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const [reportType, setReportType] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState<string>("standard");
  
  // Available years for selection
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());
  
  // Handle report generation based on type
  const handleGenerateReport = () => {
    switch (reportType) {
      case "excel":
        window.open("/api/plants/export/excel", "_blank");
        break;
      case "pdf":
        window.open("/api/plants/export/pdf", "_blank");
        break;
      case "cultivation":
        // For cultivation declaration, include the year
        window.open(`/api/plants/export/cultivation-declaration?year=${year}`, "_blank");
        break;
      case "plant-catalog-2025":
        // For plant catalog 2025 report
        window.open("/api/plants/export/plant-catalog-2025", "_blank");
        break;
      default:
        // If no report type selected, do nothing
        break;
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Reports | Plant Inventory System</title>
        <meta name="description" content="Generate and download various reports for your plant inventory" />
      </Helmet>
      
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1">Generate and download various reports for your plant inventory</p>
          </div>
        </div>
        
        <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="standard">Standard Reports</TabsTrigger>
            <TabsTrigger value="custom">Custom Report</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Excel Export Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Excel Report
                  </CardTitle>
                  <CardDescription>
                    Export your complete inventory as an Excel spreadsheet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setReportType("excel");
                      window.open("/api/plants/export/excel", "_blank");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Excel
                  </Button>
                </CardContent>
              </Card>
              
              {/* PDF Export Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    PDF Report
                  </CardTitle>
                  <CardDescription>
                    Generate a PDF report of your plant inventory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setReportType("pdf");
                      window.open("/api/plants/export/pdf", "_blank");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
              
              {/* Cultivation Declaration Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Cultivation Declaration
                  </CardTitle>
                  <CardDescription>
                    Generate a cultivation declaration PDF for official purposes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Year</label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setReportType("cultivation");
                      window.open(`/api/plants/export/cultivation-declaration?year=${year}`, "_blank");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Generate Declaration
                  </Button>
                </CardContent>
              </Card>

              {/* Plant Catalog 2025 Card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Κατάλογος Παραγώμενων Φυτών 2025
                  </CardTitle>
                  <CardDescription>
                    Generate a catalog of all available plant varieties for 2025
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      setReportType("plant-catalog-2025");
                      window.open("/api/plants/export/plant-catalog-2025", "_blank");
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Generate Catalog
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="custom">
            <CustomReportForm />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}