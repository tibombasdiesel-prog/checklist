import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Lazy load all pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewChecklist = lazy(() => import("./pages/NewChecklist"));
const ChecklistPhotos = lazy(() => import("./pages/ChecklistPhotos"));
const ChecklistVideo = lazy(() => import("./pages/ChecklistVideo"));
const ChecklistSignatures = lazy(() => import("./pages/ChecklistSignatures"));
const ChecklistView = lazy(() => import("./pages/ChecklistView"));
const History = lazy(() => import("./pages/History"));
const AllHistory = lazy(() => import("./pages/AllHistory"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ReceptionDashboard = lazy(() => import("./pages/ReceptionDashboard"));
const MarkOSOpened = lazy(() => import("./pages/MarkOSOpened"));
const FleetDashboard = lazy(() => import("./pages/FleetDashboard"));
const NewFleetChecklist = lazy(() => import("./pages/NewFleetChecklist"));
const FleetHistory = lazy(() => import("./pages/FleetHistory"));
const FleetChecklistView = lazy(() => import("./pages/FleetChecklistView"));
const FleetStats = lazy(() => import("./pages/FleetStats"));
const VehicleManagement = lazy(() => import("./pages/VehicleManagement"));

// Loading fallback component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">Carregando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist/new"
              element={
                <ProtectedRoute>
                  <NewChecklist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist/:id/photos"
              element={
                <ProtectedRoute>
                  <ChecklistPhotos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist/:id/video"
              element={
                <ProtectedRoute>
                  <ChecklistVideo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist/:id/signatures"
              element={
                <ProtectedRoute>
                  <ChecklistSignatures />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist/:id/view"
              element={
                <ProtectedRoute>
                  <ChecklistView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-history"
              element={
                <ProtectedRoute>
                  <AllHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reception-dashboard"
              element={
                <ProtectedRoute>
                  <ReceptionDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklist/:id/mark-os-opened"
              element={
                <ProtectedRoute>
                  <MarkOSOpened />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet"
              element={
                <ProtectedRoute>
                  <FleetDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet/checklist/new"
              element={
                <ProtectedRoute>
                  <NewFleetChecklist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet/history"
              element={
                <ProtectedRoute>
                  <FleetHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet/checklist/:id/view"
              element={
                <ProtectedRoute>
                  <FleetChecklistView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet/stats"
              element={
                <ProtectedRoute>
                  <FleetStats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet/vehicles"
              element={
                <ProtectedRoute>
                  <VehicleManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
