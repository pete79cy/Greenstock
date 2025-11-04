import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, DollarSign, User, Eye, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmployeeSchema, updateEmployeeSchema, type Employee, type InsertEmployee, type UpdateEmployee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DocumentUpload from "@/components/DocumentUpload";
import LeaveManagement from "@/components/LeaveManagement";
import BackToMenuButton from "@/components/BackToMenuButton";

export default function Employees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [leavingEmployee, setLeavingEmployee] = useState<Employee | null>(null);
  const [retiringEmployee, setRetiringEmployee] = useState<Employee | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<"ALL" | "ACTIVE" | "FORMER" | "RETIRED">("ACTIVE");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useQuery({
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
      toast({ title: "Success", description: "Employee updated successfully" });
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

  const markAsRetiredMutation = useMutation({
    mutationFn: ({ passport, date }: { passport: string; date: string }) =>
      apiRequest(`/api/employees/${passport}/retire`, "PUT", { date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsRetireDialogOpen(false);
      setRetiringEmployee(null);
      toast({ title: "Success", description: "Employee marked as retired successfully" });
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
      retirementDate: "",
    },
  });

  const onSubmit = (data: InsertEmployee | UpdateEmployee) => {
    const salaryInCents = Math.round((data.monthlySalary || 0) * 100);
    const employeeData = { ...data, monthlySalary: salaryInCents };

    if (editingEmployee) {
      updateMutation.mutate({ passport: editingEmployee.passport, data: employeeData });
    } else {
      createMutation.mutate(employeeData as InsertEmployee);
    }
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
      retirementDate: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      name: employee.name,
      designation: employee.designation,
      paymentMethod: employee.paymentMethod,
      dateOfBirth: employee.dateOfBirth || "",
      passport: employee.passport,
      arc: employee.arc || "",
      socialInsurance: employee.socialInsurance || "",
      taxId: employee.taxId || "",
      monthlySalary: employee.monthlySalary / 100,
      retirementDate: employee.retirementDate || "",
    });
    setIsDialogOpen(true);
  };

  const handleView = (employee: Employee) => {
    setViewingEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const handleMarkAsLeft = (employee: Employee) => {
    setLeavingEmployee(employee);
    setIsLeaveDialogOpen(true);
  };

  const handleMarkAsRetired = (employee: Employee) => {
    setRetiringEmployee(employee);
    setIsRetireDialogOpen(true);
  };

  const formatCurrency = (amountInCents: number) => {
    return `€${(amountInCents / 100).toFixed(2)}`;
  };

  const filteredEmployees = employees.filter((employee: Employee) => {
    if (employeeFilter === "ALL") return true;
    if (employeeFilter === "ACTIVE") return employee.status === "ACTIVE" || (!employee.status && employee.isActive);
    if (employeeFilter === "FORMER") return employee.status === "FORMER" || (!employee.status && !employee.isActive);
    if (employeeFilter === "RETIRED") return employee.status === "RETIRED";
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackToMenuButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employee records, documents, and leave tracking
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Show:</label>
        <Select value={employeeFilter} onValueChange={(value: "ALL" | "ACTIVE" | "FORMER" | "RETIRED") => setEmployeeFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active Employees</SelectItem>
            <SelectItem value="FORMER">Former Employees</SelectItem>
            <SelectItem value="RETIRED">Retired Employees</SelectItem>
            <SelectItem value="ALL">All Employees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee: any) => (
          <Card key={employee.passport} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{employee.designation}</p>
                </div>
                <Badge 
                  variant={
                    (employee.status === "ACTIVE" || (!employee.status && employee.isActive)) ? "default" : 
                    employee.status === "RETIRED" ? "outline" : "secondary"
                  }
                  className={
                    (employee.status === "ACTIVE" || (!employee.status && employee.isActive)) ? "bg-sky-600 text-white" : 
                    employee.status === "RETIRED" ? "bg-amber-600 text-white" : "bg-gray-400 text-white"
                  }
                >
                  {
                    (employee.status === "ACTIVE" || (!employee.status && employee.isActive)) ? "Active" : 
                    employee.status === "RETIRED" ? "Retired" : "Former"
                  }
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

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(employee)}
                  className="flex-1"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
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

      {/* Create/Edit Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee Details" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <Card className="bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                              placeholder="e.g., 465.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
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
                      name="retirementDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retirement Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Employee will be marked as retired on this date
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identification & Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="passport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Number *</FormLabel>
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
                              placeholder="e.g., 1651167" 
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
                              placeholder="e.g., 60093421Q" 
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

      {/* View Employee Dialog with Enhanced Features */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details - {viewingEmployee?.name}</DialogTitle>
          </DialogHeader>
          
          {viewingEmployee && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
                <TabsTrigger value="balances">Leave Balances</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="space-y-6">
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
                          {viewingEmployee.dateOfBirth
                            ? new Date(viewingEmployee.dateOfBirth).toLocaleDateString()
                            : "Not specified"
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <Badge 
                          variant={(viewingEmployee.status === "ACTIVE" || (!viewingEmployee.status && viewingEmployee.isActive)) ? "default" : "secondary"}
                          className={(viewingEmployee.status === "ACTIVE" || (!viewingEmployee.status && viewingEmployee.isActive)) ? "bg-sky-600 text-white" : "bg-gray-400 text-white"}
                        >
                          {(viewingEmployee.status === "ACTIVE" || (!viewingEmployee.status && viewingEmployee.isActive)) ? "Active" : "Former"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Employment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Monthly Salary</label>
                        <p className="text-sm font-medium">{formatCurrency(viewingEmployee.monthlySalary)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                        <p className="text-sm">{viewingEmployee.paymentMethod}</p>
                      </div>
                      {viewingEmployee.leftOn && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Left On</label>
                          <p className="text-sm">{new Date(viewingEmployee.leftOn).toLocaleDateString()}</p>
                        </div>
                      )}
                      {viewingEmployee.retirementDate && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Retirement Date</label>
                          <p className="text-sm">{new Date(viewingEmployee.retirementDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

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
                </div>
              </TabsContent>
              
              <TabsContent value="documents">
                <DocumentUpload employeePassport={viewingEmployee.passport} />
              </TabsContent>
              
              <TabsContent value="leaves">
                <LeaveManagement employeePassport={viewingEmployee.passport} />
              </TabsContent>
              
              <TabsContent value="balances">
                <LeaveManagement employeePassport={viewingEmployee.passport} />
              </TabsContent>
            </Tabs>
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
                Mark <span className="font-medium">{leavingEmployee.name}</span> as having left the company.
              </p>
              
              <div>
                <label className="text-sm font-medium">Last Working Date</label>
                <Input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (leavingEmployee) {
                      setLeavingEmployee({
                        ...leavingEmployee,
                        leftOn: e.target.value
                      });
                    }
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
                    if (leavingEmployee) {
                      markAsLeftMutation.mutate({
                        passport: leavingEmployee.passport,
                        date: leavingEmployee.leftOn || new Date().toISOString().split('T')[0]
                      });
                    }
                  }}
                  disabled={markAsLeftMutation.isPending}
                >
                  {markAsLeftMutation.isPending ? "Processing..." : "End Employment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Retire Employee Modal */}
      <Dialog open={isRetireDialogOpen} onOpenChange={setIsRetireDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Employee as Retired</DialogTitle>
          </DialogHeader>
          
          {retiringEmployee && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mark <span className="font-medium">{retiringEmployee.name}</span> as retired.
              </p>
              
              <div>
                <label className="text-sm font-medium">Retirement Date</label>
                <Input
                  type="date"
                  defaultValue={retiringEmployee.retirementDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (retiringEmployee) {
                      setRetiringEmployee({
                        ...retiringEmployee,
                        retirementDate: e.target.value
                      });
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsRetireDialogOpen(false)}
                  disabled={markAsRetiredMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    if (retiringEmployee) {
                      markAsRetiredMutation.mutate({
                        passport: retiringEmployee.passport,
                        date: retiringEmployee.retirementDate || new Date().toISOString().split('T')[0]
                      });
                    }
                  }}
                  disabled={markAsRetiredMutation.isPending}
                >
                  {markAsRetiredMutation.isPending ? "Processing..." : "Mark as Retired"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}