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
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // While checking authentication status, we can return a loading state or null
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    console.log("User not authenticated, redirecting to login", { isLoading, user });
    
    // Add a small delay before redirect to avoid race conditions
    if (!isLoading) {
      window.location.href = "/login";
    }
    return null;
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
