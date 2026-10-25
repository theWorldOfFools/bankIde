import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
