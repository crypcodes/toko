import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <DashboardOverview />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/products"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <ProductsPage />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/orders"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <OrdersPage />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/analytics"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <AnalyticsPage />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}