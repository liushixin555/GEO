import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Breadcrumb, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';

const LoginPage: React.FC = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token validity before redirecting to avoid /login → /publish → /login flash
      axios
        .get('/api/v1/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => navigate('/publish', { replace: true }))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        });
    }
  }, [navigate]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.post('/api/v1/auth/login', values);
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      const redirectTo = !user.selected_project
        ? '/project'
        : (localStorage.getItem('redirect_after_login') || '/publish');
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
      <div className="login-card">
        <div className="page-breadcrumb"><Breadcrumb items={[{ title: '薄云商机倍增服务' }]} /></div>
        {error && <Alert type="error" title={error} className="form-alert" showIcon />}
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" size="large" />
          </Form.Item>
          <Form.Item className="form-item-no-margin">
            <Button type="primary" htmlType="submit" loading={loading} block size="large">登录</Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;
