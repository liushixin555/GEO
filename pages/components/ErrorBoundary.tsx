import React from 'react';
import { Result, Button, Modal, Space, Typography } from 'antd';
import { CloseCircleFilled } from '@ant-design/icons';
import axios from 'axios';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  errorCount: number;
  lastErrorTime: number | null;
  logoutLoading: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
    errorCount: 0,
    lastErrorTime: null,
    logoutLoading: false,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = Date.now().toString(36).toUpperCase();
    return { hasError: true, error, errorId };
  }

  componentDidCatch(_error: Error, info: React.ErrorInfo) {
    const now = Date.now();
    const errorCount = this.state.errorCount + 1;
    this.setState({ errorInfo: info, errorCount, lastErrorTime: now });

    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', _error, info.componentStack);
    }
  }

  /** L1: 轻量重试 — 重置 state，重新渲染子树 */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  /** L2: 刷新页面 — 保留会话状态 */
  handleReload = () => {
    window.location.reload();
  };

  /** L3: 销毁会话（需 Modal.confirm 二次确认） */
  handleLogout = () => {
    Modal.confirm({
      title: '确认返回登录',
      content: '未保存的数据将丢失，确定要返回登录页面吗？',
      okText: '确认退出',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        this.setState({ logoutLoading: true });
        // 调用后端注销以触发 token-blacklist
        const token = localStorage.getItem('token');
        if (token) {
          try {
            await axios.post('/api/v1/auth/logout', null, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {
            // 后端注销失败也继续客户端清理
          }
        }
        try {
          const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
          keysToRemove.forEach((key) => {
            try { localStorage.removeItem(key); } catch { /* skip */ }
          });
        } finally {
          window.location.href = '/login';
        }
      },
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { errorId, errorCount } = this.state;
      const isPersistentError = errorCount >= 3;

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          <Result
            status="error"
            icon={<CloseCircleFilled style={{ color: '#da1e28', fontSize: 72 }} />}
            title={
              <Typography.Title level={3} style={{ margin: 0, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, color: '#161616' }}>
                应用遇到问题
              </Typography.Title>
            }
            subTitle={
              <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
                <span style={{ color: '#525252', letterSpacing: '0.16px' }}>
                  {isPersistentError ? '页面反复出现异常，请刷新浏览器或联系管理员' : '请尝试刷新页面，如果问题持续请联系管理员'}
                </span>
                {errorId && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    错误编号: ERR-{errorId}
                  </Typography.Text>
                )}
              </Space>
            }
            extra={
              <Space direction="vertical" style={{ width: '100%' }}>
                {!isPersistentError && (
                  <Button
                    type="primary"
                    onClick={this.handleRetry}
                    aria-label="重试加载页面"
                    style={{
                      borderRadius: 0,
                      backgroundColor: '#0f62fe',
                      borderColor: '#0f62fe',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}
                  >
                    重试
                  </Button>
                )}
                <Button
                  onClick={this.handleReload}
                  aria-label="刷新页面"
                  style={{
                    borderRadius: 0,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  刷新页面
                </Button>
                <Button
                  danger
                  onClick={this.handleLogout}
                  loading={this.state.logoutLoading}
                  aria-label="返回登录（将清除当前会话数据）"
                  style={{
                    borderRadius: 0,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  返回登录
                </Button>
              </Space>
            }
            role="alert"
            aria-live="assertive"
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
