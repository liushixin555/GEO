import React from 'react';
import { Layout as AntLayout, Button, Drawer, Spin } from 'antd';
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
    <AntLayout className={['app-layout-root', isMobile && 'app-layout-mobile'].filter(Boolean).join(' ')}>
      {/* 桌面端 Sider */}
      {!isMobile && (
        <Sider
          width={LAYOUT.SIDER_WIDTH}
          collapsedWidth={LAYOUT.SIDER_COLLAPSED_WIDTH}
          collapsed={collapsed}
          trigger={null}
          className="app-sider"
        >
          <Sidebar
            collapsed={collapsed}
            onCollapse={setCollapsed}
            isMobile={false}
          />
        </Sider>
      )}

      {/* 移动端 Drawer 侧边栏（替代 Sider + overlay 手写方案，antd Drawer 自带 mask/动画/Escape 关闭） */}
      {isMobile && (
        <Drawer
          placement="left"
          open={!collapsed}
          onClose={() => setCollapsed(true)}
          width={LAYOUT.SIDER_WIDTH}
          maskClosable
          closable={false}
          styles={{ body: { padding: 0 }, wrapper: {} }}
          rootClassName="mobile-drawer"
        >
          <Sidebar
            collapsed={false}
            onCollapse={setCollapsed}
            isMobile
          />
        </Drawer>
      )}

      {/* 移动端展开按钮 */}
      {isMobile && collapsed && (
        <Button
          type="text"
          icon={<MenuUnfoldOutlined />}
          onClick={() => setCollapsed(false)}
          className="sidebar-mobile-unfold"
          aria-label="展开侧边栏"
        />
      )}

      <Content className={['main-content', isMobile && 'main-content-mobile'].filter(Boolean).join(' ')}>
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
