import React, { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Layout from "@/components/Layout";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";

// Protected route component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Always define hooks at the top level, regardless of conditions
  useEffect(() => {
    // If not authenticated and not loading, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log("Authentication check failed, redirecting to login", { user, isAuthenticated });
      window.location.href = "/login";
    }
  }, [isLoading, isAuthenticated, user]);
  
  // While checking authentication status, we can return a loading state
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Checking authentication status...</p>
      </div>
    </div>;
  }
  
  // If not authenticated, show a loading state while redirecting
  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>;
  }
  
  // If authenticated, render the component
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        {() => (
          <div className="min-h-screen bg-background">
            <Login />
          </div>
        )}
      </Route>
      
      {/* Registration route removed - only admin user pete_cy is allowed */}
      <Route path="/register">
        {() => (
          <Redirect to="/login" />
        )}
      </Route>
      
      {/* Protected routes */}
      <Route path="/">
        {() => (
          <Layout>
            <Switch>
              <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/inventory" component={() => <ProtectedRoute component={Inventory} />} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
