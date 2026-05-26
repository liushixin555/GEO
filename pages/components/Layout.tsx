import React from 'react';
import { Layout as AntLayout, Button, Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { MenuUnfoldOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import PageRouter from '../router/routes';
import { useAuth } from '../context/AuthContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { LAYOUT } from '../constants/layout';

const { Sider, Content } = AntLayout;

const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const { collapsed, setCollapsed, isMobile } = useResponsiveLayout();

  // 防御性检查（defense-in-depth），主认证守卫在 AuthGuard
  if (loading) return <Spin size="large" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AntLayout className="app-layout-root">
      {isMobile && collapsed && (
        <Button
          type="text"
          icon={<MenuUnfoldOutlined />}
          onClick={() => setCollapsed(false)}
          className="sidebar-mobile-unfold"
          aria-label="展开侧边栏"
        />
      )}
      {(!isMobile || !collapsed) && (
        <Sider
          width={LAYOUT.SIDER_WIDTH}
          collapsedWidth={isMobile ? 0 : LAYOUT.SIDER_COLLAPSED_WIDTH}
          collapsed={collapsed}
          trigger={null}
          className={`app-sider${isMobile ? ' app-sider-mobile' : ''}`}
        >
          <Sidebar
            collapsed={collapsed}
            onCollapse={setCollapsed}
            isMobile={isMobile}
          />
        </Sider>
      )}

      {isMobile && !collapsed && (
        <div className="mobile-overlay" onClick={() => setCollapsed(true)} role="presentation" aria-hidden="true" />
      )}

      <Content className="main-content">
        {/* skip-to-content: WAI-ARIA 最佳实践，原生 <a> 用于屏幕阅读器语义正确性 */}
        <a
          href="#main-content"
          className="skip-to-content"
          onClick={(e) => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('main-content')?.focus(); } }}
        >
          跳到主要内容
        </a>
        <div id="main-content" tabIndex={-1}>
          <PageRouter />
        </div>
      </Content>
    </AntLayout>
  );
};

Layout.displayName = 'Layout';

export default Layout;
