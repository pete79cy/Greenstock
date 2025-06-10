import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmployeeLeave {
  id: number;
  employeePassport: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason?: string;
  appliedDate: string;
}

interface EmployeeLeaveBalance {
  id: number;
  employeePassport: string;
  year: number;
  leaveType: string;
  entitled: number;
  used: number;
  remaining: number;
}

interface LeaveManagementProps {
  employeePassport: string;
}

export default function LeaveManagement({ employeePassport }: LeaveManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['/api/employees', employeePassport, 'leaves'],
    queryFn: () => fetch(`/api/employees/${employeePassport}/leaves`).then(res => res.json()),
  });

  const { data: balances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ['/api/employees', employeePassport, 'leave-balances'],
    queryFn: () => fetch(`/api/employees/${employeePassport}/leave-balances`).then(res => res.json()),
  });

  const createLeaveMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/employees/${employeePassport}/leaves`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', employeePassport, 'leaves'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees', employeePassport, 'leave-balances'] });
      setIsAddDialogOpen(false);
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      toast({ title: "Success", description: "Leave request submitted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit leave request", variant: "destructive" });
    },
  });

  const handleSubmitLeave = () => {
    if (!leaveType || !startDate || !endDate) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    createLeaveMutation.mutate({
      leaveType,
      startDate,
      endDate,
      days: diffDays,
      reason,
      status: "PENDING"
    });
  };

  const leaveTypes = [
    { value: "annual", label: "Annual Leave" },
    { value: "sick", label: "Sick Leave" },
    { value: "personal", label: "Personal Leave" },
    { value: "maternity", label: "Maternity Leave" },
    { value: "paternity", label: "Paternity Leave" },
    { value: "emergency", label: "Emergency Leave" },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-600';
      case 'pending': return 'bg-yellow-600';
      case 'rejected': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    return leaveTypes.find(lt => lt.value === type)?.label || type;
  };

  if (leavesLoading || balancesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leave Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Leave Balances (2025)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="text-muted-foreground">No leave balances configured for this employee.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {balances.map((balance: EmployeeLeaveBalance) => (
                <div key={balance.id} className="p-4 border rounded-lg">
                  <h4 className="font-medium">{getLeaveTypeLabel(balance.leaveType)}</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Entitled:</span>
                      <span>{balance.entitled} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span>{balance.used} days</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Remaining:</span>
                      <span className={balance.remaining > 0 ? "text-green-600" : "text-red-600"}>
                        {balance.remaining} days
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Leave Requests</h3>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Leave
        </Button>
      </div>

      {leaves.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leave requests</h3>
            <p className="text-muted-foreground">
              Submit leave requests for annual leave, sick leave, and other types.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave: EmployeeLeave) => (
            <Card key={leave.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{getLeaveTypeLabel(leave.leaveType)}</h4>
                      <Badge className={`text-white ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      <span className="ml-2">({leave.days} days)</span>
                    </p>
                    {leave.reason && (
                      <p className="text-sm text-muted-foreground">
                        Reason: {leave.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Applied on {leave.appliedDate ? new Date(leave.appliedDate).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Leave Request Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Leave Type</label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Textarea
                placeholder="Reason for leave request"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createLeaveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitLeave}
                disabled={createLeaveMutation.isPending}
              >
                {createLeaveMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}