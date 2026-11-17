import { Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import IdeasPage from './pages/IdeasPage';
import InsightsPage from './pages/InsightsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AiSettingsPage from './pages/AiSettingsPage';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="ideas" element={<IdeasPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/ai" element={<AiSettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MotionConfig>
  );
}
