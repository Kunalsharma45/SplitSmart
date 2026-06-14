import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import CsvImporterPage from './pages/CsvImporterPage';
import BalancePage from './pages/BalancePage';
import ApprovalQueuePage from './pages/ApprovalQueuePage';
import NotFoundPage from './pages/NotFoundPage';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/groups/:groupId" element={<PrivateRoute><GroupPage /></PrivateRoute>} />
          <Route path="/app/import" element={<PrivateRoute><CsvImporterPage /></PrivateRoute>} />
          <Route path="/app/balances" element={<PrivateRoute><BalancePage /></PrivateRoute>} />
          <Route path="/app/approvals" element={<PrivateRoute><ApprovalQueuePage /></PrivateRoute>} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
