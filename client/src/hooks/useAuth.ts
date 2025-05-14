import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, InsertUser, LoginUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading, isError, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always refetch on mount to ensure we have the latest
    gcTime: 1000 * 60 * 60,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Poll every 10 seconds to keep session active
  });

  // Login
  const login = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      return apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      // Force an immediate refetch of the user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.prefetchQuery({
        queryKey: ["/api/auth/user"],
        staleTime: 0,
      });
      
      toast({
        title: "Success",
        description: "You have been logged in successfully.",
      });
      
      console.log("Login mutation successful, auth query invalidated");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log in. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Register
  const register = useMutation({
    mutationFn: async (userData: InsertUser) => {
      return apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account created successfully. You can now log in.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Logout
  const logout = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
      toast({
        title: "Success",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log out. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    isError,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}