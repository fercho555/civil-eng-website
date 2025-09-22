import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // adjust path if needed

export function PrivateRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    // Not authenticated: redirect to login/home
    return <Navigate to="/" replace />;
  }
  // Authenticated: render children
  return children;
}
