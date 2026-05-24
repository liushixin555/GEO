import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const { user: authUser, login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateRedirect = (path: string | null): string => {
    if (!path) return '/publish';
    if (path.startsWith('/') && !path.startsWith('//')) return path;
    return '/publish';
  };

  // If already authenticated (AuthProvider verified token), redirect away
  useEffect(() => {
    if (authUser) {
      const redirectTo = !authUser.selected_project
        ? '/project'
        : validateRedirect(localStorage.getItem('redirect_after_login'));
      localStorage.removeItem('redirect_after_login');
      navigate(redirectTo, { replace: true });
    }
  }, [authUser, navigate]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('/api/v1/auth/login', values);
      const { token, user: userData } = response.data.data;

      // Update AuthContext state (not just localStorage) so AuthGuard sees the user
      login(token, userData);

      const redirectTo = !userData.selected_project
        ? '/project'
        : validateRedirect(localStorage.getItem('redirect_after_login'));
      localStorage.removeItem('redirect_after_login');
      navigate(redirectTo);
    } catch (err: any) {
      const message = err.response?.data?.message || '登录失败，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card" bordered>
        <Typography.Title level={3} style={{ fontWeight: 300, textAlign: 'center', marginBottom: 24 }}>
          薄云商机倍增服务
        </Typography.Title>
        {error && <Alert type="error" message={error} className="form-alert" showIcon closable />}
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" size="large" />
          </Form.Item>
          <Form.Item className="form-item-no-margin">
            <Button type="primary" htmlType="submit" loading={loading} block size="large">登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
