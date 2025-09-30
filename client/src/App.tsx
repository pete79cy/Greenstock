import React, { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Py8Purchases from "@/pages/Py8Purchases";
import Py8BatchPurchases from "@/pages/Py8BatchPurchases";
import Py8Report from "@/pages/Py8Report";
import Py9Sales from "@/pages/Py9Sales";
import Employees from "@/pages/Employees";
import Payslips from "@/pages/Payslips";
import BackupRestore from "@/pages/BackupRestore";
import RegulatoryChecks from "@/pages/RegulatoryChecks";
import DocumentCategoryPage from "@/pages/documents/DocumentCategoryPage";
import PlantPurchasesSimpleFixed from "@/pages/PlantPurchasesSimpleFixed";
import PlantPurchaseAnalysisNew from "@/pages/PlantPurchaseAnalysisNew";
import PlantVarietiesManagement from "@/pages/PlantVarietiesManagement";
import Layout from "@/components/Layout";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";

// Protected route component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  console.log("ProtectedRoute called with component:", Component.name);
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Always define hooks at the top level, regardless of conditions
  useEffect(() => {
    console.log("ProtectedRoute effect running:", { 
      isLoading, 
      isAuthenticated, 
      component: Component.name 
    });
    
    // If not authenticated and not loading, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log("Authentication check failed, redirecting to login", { user, isAuthenticated });
      window.location.href = "/login";
    }
  }, [isLoading, isAuthenticated, user, Component.name]);
  
  // While checking authentication status, we can return a loading state
  if (isLoading) {
    console.log("ProtectedRoute - Loading auth state");
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Checking authentication status...</p>
      </div>
    </div>;
  }
  
  // If not authenticated, show a loading state while redirecting
  if (!isAuthenticated) {
    console.log("ProtectedRoute - Not authenticated, redirecting");
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>;
  }
  
  // If authenticated, render the component
  console.log("ProtectedRoute - Authenticated, rendering component:", Component.name);
  return <Component />;
}

// Simple HOC to wrap protected components with Layout
function ProtectedWithLayout(Component: React.ComponentType) {
  return function WrappedComponent() {
    console.log("ProtectedWithLayout rendering for:", Component.name);
    return (
      <Layout>
        <ProtectedRoute component={Component} />
      </Layout>
    );
  };
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
      
      {/* Protected routes with Layout */}
      <Route path="/" component={ProtectedWithLayout(Dashboard)} />
      <Route path="/inventory" component={ProtectedWithLayout(Inventory)} />
      <Route path="/reports" component={ProtectedWithLayout(Reports)} />
      <Route path="/py8-purchases" component={ProtectedWithLayout(Py8Purchases)} />
      <Route path="/py8-batch-purchases" component={ProtectedWithLayout(Py8BatchPurchases)} />
      <Route path="/py8-report" component={ProtectedWithLayout(Py8Report)} />
      <Route path="/py9-sales" component={ProtectedWithLayout(Py9Sales)} />
      <Route path="/employees" component={ProtectedWithLayout(Employees)} />
      <Route path="/payslips" component={ProtectedWithLayout(Payslips)} />
      <Route path="/regulatory-checks" component={ProtectedWithLayout(RegulatoryChecks)} />
      <Route path="/documents/:categoryCode" component={ProtectedWithLayout(DocumentCategoryPage)} />
      <Route path="/plant-purchases" component={ProtectedWithLayout(PlantPurchasesSimpleFixed)} />
      <Route path="/plant-purchase-analysis" component={ProtectedWithLayout(PlantPurchaseAnalysisNew)} />
      <Route path="/plant-varieties" component={ProtectedWithLayout(PlantVarietiesManagement)} />
      <Route path="/backup-restore" component={ProtectedWithLayout(BackupRestore)} />
      <Route path="/settings" component={ProtectedWithLayout(Settings)} />
      
      {/* Catch-all route for 404 */}
      <Route path="/:rest*">
        {(params) => {
          // Skip the 404 for login and register paths
          const path = params["rest*"] || "";
          if (path.includes('login') || path.includes('register')) {
            return null;
          }
          return <NotFound />;
        }}
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
