import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

const REDIRECT_KEY = 'redirect_after_login';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="full-page-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    if (location.pathname !== '/login') {
      localStorage.setItem(REDIRECT_KEY, location.pathname);
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
