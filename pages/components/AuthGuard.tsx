import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, Typography } from 'antd';
import { useAuth } from '../context/AuthContext';

const REDIRECT_KEY = 'redirect_after_login';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="full-page-loading" role="status" aria-busy="true" aria-label="正在验证身份">
        <div className="loading-brand">
          <Typography.Title level={3} style={{ fontWeight: 300, marginBottom: 24 }}>薄云商机倍增服务</Typography.Title>
          <Spin size="large" />
          <Typography.Text type="secondary" style={{ marginTop: 16 }}>正在验证身份...</Typography.Text>
        </div>
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
