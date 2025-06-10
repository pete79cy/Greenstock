import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmployeeLeaveBalancesProps {
  employeePassport: string;
}

interface EmployeeLeaveBalance {
  id: number;
  employeePassport: string;
  year: number;
  leaveType: string;
  totalEntitlement: number;
  usedDays: number;
  remainingDays: number;
  updatedAt: string;
}

const balanceSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  leaveType: z.enum(["annual", "sick", "maternity", "paternity", "personal", "bereavement"]),
  totalEntitlement: z.number().int().positive("Total entitlement must be positive"),
});

type BalanceFormData = z.infer<typeof balanceSchema>;

const leaveTypeLabels: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  personal: "Personal Leave",
  bereavement: "Bereavement Leave"
};

const leaveTypeColors: Record<string, string> = {
  annual: "bg-blue-100 text-blue-800",
  sick: "bg-red-100 text-red-800",
  maternity: "bg-pink-100 text-pink-800",
  paternity: "bg-purple-100 text-purple-800",
  personal: "bg-orange-100 text-orange-800",
  bereavement: "bg-gray-100 text-gray-800"
};

export default function EmployeeLeaveBalances({ employeePassport }: EmployeeLeaveBalancesProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: balances = [], isLoading } = useQuery<EmployeeLeaveBalance[]>({
    queryKey: ["/api/employees", employeePassport, "leave-balances", selectedYear],
    queryFn: () => apiRequest(`/api/employees/${employeePassport}/leave-balances?year=${selectedYear}`),
  });

  const form = useForm<BalanceFormData>({
    resolver: zodResolver(balanceSchema),
    defaultValues: {
      year: selectedYear,
      leaveType: "annual",
      totalEntitlement: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: BalanceFormData) =>
      apiRequest(`/api/employees/${employeePassport}/leave-balances`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/employees", employeePassport, "leave-balances", selectedYear] 
      });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Leave balance created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: BalanceFormData) => {
    createMutation.mutate(data);
  };

  const handleCreate = () => {
    form.reset({ year: selectedYear, leaveType: "annual", totalEntitlement: 0 });
    setIsDialogOpen(true);
  };

  const getUtilizationColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-orange-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getUtilizationIcon = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 70) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  // Generate year options (current year ± 5 years)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 2; year <= currentYear + 3; year++) {
    yearOptions.push(year);
  }

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading leave balances...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Leave Balances</h3>
          <Select 
            value={selectedYear.toString()} 
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Balance
        </Button>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                No leave balances found for {selectedYear}
              </CardContent>
            </Card>
          </div>
        ) : (
          balances.map((balance) => (
            <Card key={balance.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {leaveTypeLabels[balance.leaveType] || balance.leaveType}
                  </CardTitle>
                  <Badge className={leaveTypeColors[balance.leaveType] || "bg-gray-100 text-gray-800"}>
                    {balance.year}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Usage Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Used</span>
                    <span className={getUtilizationColor(balance.usedDays, balance.totalEntitlement)}>
                      {balance.usedDays} / {balance.totalEntitlement} days
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        balance.usedDays / balance.totalEntitlement >= 0.9 
                          ? 'bg-red-500' 
                          : balance.usedDays / balance.totalEntitlement >= 0.7
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((balance.usedDays / balance.totalEntitlement) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1">
                      {getUtilizationIcon(balance.usedDays, balance.totalEntitlement)}
                      <span className="font-medium">Remaining</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {balance.remainingDays} days
                    </span>
                  </div>
                </div>

                {/* Utilization Percentage */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Utilization</span>
                    <span className={getUtilizationColor(balance.usedDays, balance.totalEntitlement)}>
                      {((balance.usedDays / balance.totalEntitlement) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Balance Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Leave Balance</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="annual">Annual Leave</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="maternity">Maternity Leave</SelectItem>
                        <SelectItem value="paternity">Paternity Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="bereavement">Bereavement Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalEntitlement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Entitlement (Days) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="e.g., 25"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Balance"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}