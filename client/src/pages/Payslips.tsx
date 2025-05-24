import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, Calendar, DollarSign, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPayslipSchema, type Employee, type Payslip, type InsertPayslip, type PayslipCalculation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Payslips() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [calculations, setCalculations] = useState<PayslipCalculation | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: payslips = [], isLoading } = useQuery<Payslip[]>({
    queryKey: ["/api/payslips"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertPayslip) => apiRequest("/api/payslips", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payslips"] });
      setIsDialogOpen(false);
      setSelectedEmployee(null);
      setCalculations(null);
      toast({ title: "Success", description: "Payslip created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<InsertPayslip>({
    resolver: zodResolver(insertPayslipSchema),
    defaultValues: {
      employeeId: 0,
      payPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM format
      payDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
      grossSalary: 0,
      notes: "",
    },
  });

  const grossSalary = form.watch("grossSalary");

  // Calculate deductions in real-time
  const calculateDeductions = async (salary: number) => {
    if (salary > 0) {
      try {
        const result = await apiRequest("/api/payslips/calculate", "POST", { grossSalary: salary });
        setCalculations(result as unknown as PayslipCalculation);
      } catch (error) {
        console.error("Error calculating deductions:", error);
      }
    } else {
      setCalculations(null);
    }
  };

  const onSubmit = (data: InsertPayslip) => {
    // Convert salary to cents for storage
    const salaryInCents = Math.round(data.grossSalary * 100);
    const payslipData = { ...data, grossSalary: salaryInCents };
    createMutation.mutate(payslipData);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find((emp: Employee) => emp.id === parseInt(employeeId));
    setSelectedEmployee(employee || null);
    
    if (employee) {
      // Pre-fill with employee's monthly salary
      const salaryInEuros = employee.monthlySalary / 100;
      form.setValue("grossSalary", salaryInEuros);
      calculateDeductions(salaryInEuros);
    }
  };

  const handleCreate = () => {
    form.reset({
      employeeId: 0,
      payPeriod: new Date().toISOString().slice(0, 7),
      payDate: new Date().toISOString().slice(0, 10),
      grossSalary: 0,
      notes: "",
    });
    setSelectedEmployee(null);
    setCalculations(null);
    setIsDialogOpen(true);
  };

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((emp: Employee) => emp.id === employeeId);
    return employee?.name || 'Unknown Employee';
  };

  // Group payslips by employee
  const payslipsByEmployee = payslips.reduce((acc: Record<number, Payslip[]>, payslip: Payslip) => {
    if (!acc[payslip.employeeId]) {
      acc[payslip.employeeId] = [];
    }
    acc[payslip.employeeId].push(payslip);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Payslips</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payslip Management</h1>
          <p className="text-muted-foreground">
            Generate payslips with automatic Cyprus deduction calculations (8.3% Social Insurance + 2.65% GESY)
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Generate Payslip
        </Button>
      </div>

      {/* Recent Payslips */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {payslips.slice(0, 6).map((payslip: Payslip) => (
          <Card key={payslip.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{getEmployeeName(payslip.employeeId)}</CardTitle>
                  <p className="text-sm text-muted-foreground">{formatPeriod(payslip.payPeriod)}</p>
                </div>
                <Badge variant="outline">
                  {formatDate(payslip.payDate)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Salary:</span>
                  <span className="font-medium">{formatCurrency(payslip.grossSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Social Insurance:</span>
                  <span className="text-red-600">-{formatCurrency(payslip.socialInsurance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GESY:</span>
                  <span className="text-red-600">-{formatCurrency(payslip.gesy)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Net Pay:</span>
                  <span className="text-green-600">{formatCurrency(payslip.netPay)}</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.open(`/api/payslips/${payslip.id}/pdf`, '_blank')}
              >
                <Download className="h-3 w-3 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {payslips.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payslips found</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first payslip with automatic Cyprus deduction calculations.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Payslip
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payslips by Employee */}
      {Object.keys(payslipsByEmployee).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Payslips by Employee</h2>
          {Object.entries(payslipsByEmployee).map(([employeeId, employeePayslips]) => (
            <Card key={employeeId}>
              <CardHeader>
                <CardTitle className="text-lg">{getEmployeeName(parseInt(employeeId))}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employeePayslips.map((payslip) => (
                    <div key={payslip.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{formatPeriod(payslip.payPeriod)}</p>
                          <p className="text-sm text-muted-foreground">Paid on {formatDate(payslip.payDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(payslip.netPay)}</p>
                        <p className="text-xs text-muted-foreground">Net Pay</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate New Payslip</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(parseInt(value));
                      handleEmployeeChange(value);
                    }}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee: Employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.name} - {employee.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Period *</FormLabel>
                      <FormControl>
                        <Input type="month" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="grossSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gross Salary (€) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="465.00"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                          calculateDeductions(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Real-time Calculation Display */}
              {calculations && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Deduction Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Salary:</span>
                      <span className="font-medium">€{calculations?.grossSalary?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Social Insurance (8.3%):</span>
                      <span>-€{calculations?.socialInsurance?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>GESY (2.65%):</span>
                      <span>-€{calculations?.gesy?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-green-600">
                      <span>Net Pay:</span>
                      <span>€{calculations?.netPay?.toFixed(2) || '0.00'}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !selectedEmployee}
                  className="flex-1"
                >
                  {createMutation.isPending ? "Generating..." : "Generate Payslip"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}