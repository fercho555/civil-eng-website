import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();

  // Simple token check — could expand later with expiry validation
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
