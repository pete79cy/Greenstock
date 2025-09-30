import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type PurchasesPy8 } from "@shared/schema";
import BackToMenuButton from "@/components/BackToMenuButton";
import * as XLSX from "xlsx";

const formatDateToDDMMYYYY = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Parse the date string (handles both YYYY-MM-DD and ISO timestamp formats)
  const date = new Date(dateStr);
  
  // Extract day, month, year
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

export default function Py8Report() {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: purchases = [], isLoading, isError } = useQuery<PurchasesPy8[]>({
    queryKey: ["/api/reports/py8", { startDate, endDate }],
    queryFn: async () => {
      const response = await fetch(`/api/reports/py8?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch report');
      return response.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const handleExportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      purchases.map(purchase => ({
        'Ημερομηνία': formatDateToDDMMYYYY(purchase.date),
        'Είδος': purchase.species,
        'Ποικιλία': purchase.variety || '',
        'Ποσότητα': purchase.quantity,
        'Έγγραφα Προέλευσης': purchase.documentsOrigin || '',
        'Κατηγορία': purchase.category || ''
      }))
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, "ΠΥ8 Αναφορά");

    const fileName = `py8-report-${startDate}-to-${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Αναφορά ΠΥ8</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Προβολή αγορών ΠΥ8 με φίλτρα ημερομηνίας
          </p>
        </div>
        <BackToMenuButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Επιλογή Ημερομηνιών
          </CardTitle>
          <CardDescription>
            Επιλέξτε το εύρος ημερομηνιών για την αναφορά
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-date">Από Ημερομηνία</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Έως Ημερομηνία</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div>
              <Button
                onClick={handleExportToExcel}
                disabled={purchases.length === 0}
                className="w-full"
                data-testid="button-export-excel"
              >
                <Download className="h-4 w-4 mr-2" />
                Εξαγωγή σε Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Αποτελέσματα Αναφοράς
          </CardTitle>
          <CardDescription>
            {purchases.length} {purchases.length === 1 ? 'καταχώριση' : 'καταχωρίσεις'} βρέθηκαν
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-state">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Φόρτωση δεδομένων...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive" data-testid="error-state">
              Σφάλμα φόρτωσης δεδομένων
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-state">
              Δεν βρέθηκαν καταχωρίσεις για το επιλεγμένο εύρος ημερομηνιών
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-date">Ημερομηνία</TableHead>
                    <TableHead data-testid="header-species">Είδος</TableHead>
                    <TableHead data-testid="header-variety">Ποικιλία</TableHead>
                    <TableHead className="text-right" data-testid="header-quantity">Ποσότητα</TableHead>
                    <TableHead data-testid="header-documents">Έγγραφα Προέλευσης</TableHead>
                    <TableHead data-testid="header-category">Κατηγορία</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id} data-testid={`row-purchase-${purchase.id}`}>
                      <TableCell data-testid={`cell-date-${purchase.id}`}>{formatDateToDDMMYYYY(purchase.date)}</TableCell>
                      <TableCell data-testid={`cell-species-${purchase.id}`}>{purchase.species}</TableCell>
                      <TableCell data-testid={`cell-variety-${purchase.id}`}>{purchase.variety || '-'}</TableCell>
                      <TableCell className="text-right" data-testid={`cell-quantity-${purchase.id}`}>
                        {purchase.quantity}
                      </TableCell>
                      <TableCell data-testid={`cell-documents-${purchase.id}`}>
                        {purchase.documentsOrigin || '-'}
                      </TableCell>
                      <TableCell data-testid={`cell-category-${purchase.id}`}>
                        {purchase.category || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
