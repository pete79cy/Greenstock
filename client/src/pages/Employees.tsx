import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, DollarSign, User, Eye, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmployeeSchema, updateEmployeeSchema, type Employee, type InsertEmployee, type UpdateEmployee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Employees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [leavingEmployee, setLeavingEmployee] = useState<Employee | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<"ALL" | "ACTIVE" | "FORMER">("ACTIVE");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertEmployee) => apiRequest("/api/employees", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Employee created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ passport, data }: { passport: string; data: UpdateEmployee }) =>
      apiRequest(`/api/employees/${passport}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      toast({ title: "Success", description: "Employee updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (passport: string) => apiRequest(`/api/employees/${passport}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Success", description: "Employee deactivated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markAsLeftMutation = useMutation({
    mutationFn: ({ passport, date }: { passport: string; date: string }) =>
      apiRequest(`/api/employees/${passport}/leave`, "PUT", { date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsLeaveDialogOpen(false);
      setLeavingEmployee(null);
      toast({ title: "Success", description: "Employee marked as left successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<InsertEmployee | UpdateEmployee>({
    resolver: zodResolver(editingEmployee ? updateEmployeeSchema : insertEmployeeSchema),
    defaultValues: {
      name: "",
      designation: "",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "",
      passport: "",
      arc: "",
      socialInsurance: "",
      taxId: "",
      monthlySalary: 0,
    },
  });

  const onSubmit = (data: InsertEmployee | UpdateEmployee) => {
    // Convert salary to cents for storage
    const salaryInCents = Math.round((data.monthlySalary || 0) * 100);
    const employeeData = { ...data, monthlySalary: salaryInCents };

    if (editingEmployee) {
      updateMutation.mutate({ passport: editingEmployee.passport, data: employeeData });
    } else {
      createMutation.mutate(employeeData as InsertEmployee);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    // Convert salary back to euros for display
    const salaryInEuros = employee.monthlySalary / 100;
    form.reset({
      passport: employee.passport,
      name: employee.name,
      designation: employee.designation,
      paymentMethod: employee.paymentMethod,
      dateOfBirth: employee.dateOfBirth || "",
      arc: employee.arc || "",
      socialInsurance: employee.socialInsurance || "",
      taxId: employee.taxId || "",
      monthlySalary: salaryInEuros,
      status: employee.status || (employee.isActive ? "ACTIVE" : "FORMER"),
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    form.reset({
      name: "",
      designation: "",
      paymentMethod: "Bank Transfer",
      dateOfBirth: "",
      passport: "",
      arc: "",
      socialInsurance: "",
      taxId: "",
      monthlySalary: 0,
      status: "ACTIVE",
    });
    setIsDialogOpen(true);
  };

  const handleView = (employee: Employee) => {
    console.log("Employee data in view:", employee);
    console.log("dateOfBirth field:", employee.dateOfBirth);
    console.log("date_of_birth field:", (employee as any)['date_of_birth']);
    setViewingEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const handleMarkAsLeft = (employee: Employee) => {
    setLeavingEmployee(employee);
    setIsLeaveDialogOpen(true);
  };

  // Filter employees based on status
  const filteredEmployees = employees.filter((employee) => {
    if (employeeFilter === "ALL") return true;
    if (employeeFilter === "ACTIVE") return (employee.status === "ACTIVE" || (!employee.status && employee.isActive));
    if (employeeFilter === "FORMER") return (employee.status === "FORMER" || (!employee.status && !employee.isActive));
    return true;
  });

  const formatCurrency = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employee records and payroll information
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Employee Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Show:</label>
        <Select value={employeeFilter} onValueChange={(value: "ALL" | "ACTIVE" | "FORMER") => setEmployeeFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active Employees</SelectItem>
            <SelectItem value="FORMER">Former Employees</SelectItem>
            <SelectItem value="ALL">All Employees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee: Employee) => (
          <Card key={employee.passport} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{employee.designation}</p>
                </div>
                <Badge 
                  variant={(employee.status === "ACTIVE" || (!employee.status && employee.isActive)) ? "default" : "secondary"}
                  className={(employee.status === "ACTIVE" || (!employee.status && employee.isActive)) ? "bg-sky-600 text-white" : "bg-gray-400 text-white"}
                >
                  {(employee.status === "ACTIVE" || (!employee.status && employee.isActive)) ? "Active" : "Former"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatCurrency(employee.monthlySalary)}/month</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{employee.paymentMethod}</span>
              </div>

              {employee.dateOfBirth && (
                <div className="text-xs text-muted-foreground">
                  Date of Birth: {new Date(employee.dateOfBirth).toLocaleDateString()}
                </div>
              )}

              {employee.socialInsurance && (
                <div className="text-xs text-muted-foreground">
                  Social Insurance: {employee.socialInsurance}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(employee)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(employee)}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                {(employee.status === "ACTIVE" || (!employee.status && employee.isActive)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsLeft(employee)}
                    className="text-orange-600 hover:text-orange-700"
                    disabled={markAsLeftMutation.isPending}
                  >
                    <UserX className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(employee.passport)}
                  className="text-red-600 hover:text-red-700"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No employees found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first employee to the system.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee Details" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Details Section */}
              <Card className="bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Kerlos Sayed Fathy Asaad" 
                                autoFocus
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Agricultural Worker" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Salary & Payment Section */}
              <Card className="bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Salary & Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="monthlySalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Salary (€) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g., 850.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Gross monthly salary before deductions
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Check">Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "ACTIVE"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employment status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="FORMER">Former</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Identification & Documentation Section */}
              <Card className="bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identification & Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="passport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., A26540193" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="arc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ARC Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 581863693" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialInsurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Social Insurance</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 20012345" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 12345678X" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Optional fields for Cyprus employment documentation
                  </p>
                </CardContent>
              </Card>

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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingEmployee
                    ? "Update Employee"
                    : "Add Employee"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          
          {viewingEmployee && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm font-medium">{viewingEmployee.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Job Title</label>
                    <p className="text-sm">{viewingEmployee.designation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-sm">
                      {viewingEmployee.dateOfBirth || (viewingEmployee as any)['date_of_birth']
                        ? new Date(viewingEmployee.dateOfBirth || (viewingEmployee as any)['date_of_birth']).toLocaleDateString()
                        : "Not specified"
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={viewingEmployee.isActive ? "default" : "secondary"}>
                      {viewingEmployee.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Employment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm">
                      <Badge 
                        variant={(viewingEmployee.status === "ACTIVE" || (!viewingEmployee.status && viewingEmployee.isActive)) ? "default" : "secondary"}
                        className={(viewingEmployee.status === "ACTIVE" || (!viewingEmployee.status && viewingEmployee.isActive)) ? "bg-sky-600 text-white" : "bg-gray-400 text-white"}
                      >
                        {(viewingEmployee.status === "ACTIVE" || (!viewingEmployee.status && viewingEmployee.isActive)) ? "Active" : "Former"}
                      </Badge>
                    </p>
                  </div>
                  {viewingEmployee.leftOn && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Left On</label>
                      <p className="text-sm">{new Date(viewingEmployee.leftOn).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Monthly Salary</label>
                    <p className="text-sm font-medium">{formatCurrency(viewingEmployee.monthlySalary)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                    <p className="text-sm">{viewingEmployee.paymentMethod}</p>
                  </div>
                </div>
              </div>

              {/* Documentation */}
              {(viewingEmployee.passport || viewingEmployee.arc || viewingEmployee.socialInsurance || viewingEmployee.taxId) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Documentation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingEmployee.passport && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Passport</label>
                        <p className="text-sm">{viewingEmployee.passport}</p>
                      </div>
                    )}
                    {viewingEmployee.arc && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">ARC Number</label>
                        <p className="text-sm">{viewingEmployee.arc}</p>
                      </div>
                    )}
                    {viewingEmployee.socialInsurance && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Social Insurance</label>
                        <p className="text-sm">{viewingEmployee.socialInsurance}</p>
                      </div>
                    )}
                    {viewingEmployee.taxId && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
                        <p className="text-sm">{viewingEmployee.taxId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Employee Modal */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Employment</DialogTitle>
          </DialogHeader>
          {leavingEmployee && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose the last working day for <strong>{leavingEmployee.name}</strong>.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Working Date</label>
                <Input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = e.target.value;
                    const confirmLeave = () => {
                      markAsLeftMutation.mutate({ 
                        passport: leavingEmployee.passport, 
                        date 
                      });
                    };
                    // Store the function for later use
                    (e.target as any).confirmLeave = confirmLeave;
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsLeaveDialogOpen(false)}
                  disabled={markAsLeftMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                    const date = dateInput?.value || new Date().toISOString().split('T')[0];
                    markAsLeftMutation.mutate({ 
                      passport: leavingEmployee.passport, 
                      date 
                    });
                  }}
                  disabled={markAsLeftMutation.isPending}
                >
                  {markAsLeftMutation.isPending ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}