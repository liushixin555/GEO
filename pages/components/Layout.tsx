import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Button } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import PageRouter from '../router/routes';
import { AppContextProvider } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const { Sider, Content } = AntLayout;

const MOBILE_BREAKPOINT = 672;

const Layout: React.FC = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true);
    }
  }, [isMobile]);

  if (!user) return null;

  return (
    <AppContextProvider>
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
        <Sider
          width={240}
          collapsedWidth={isMobile ? 0 : 64}
          collapsed={collapsed}
          trigger={null}
          className={[
            'app-sider',
            isMobile ? 'app-sider-mobile' : '',
            isMobile && collapsed ? 'app-sider-mobile-collapsed' : '',
          ].filter(Boolean).join(' ')}
        >
          <Sidebar
            userRole={user.role}
            cnName={user.cn_name}
            collapsed={collapsed}
            onCollapse={setCollapsed}
            isMobile={isMobile}
          />
        </Sider>

        {isMobile && !collapsed && (
          <div className="mobile-overlay" onClick={() => setCollapsed(true)} role="presentation" aria-hidden="true" />
        )}

        <Content className="main-content">
          <a href="#main-content" className="skip-to-content">跳到主要内容</a>
          <div id="main-content">
            <PageRouter />
          </div>
        </Content>
      </AntLayout>
    </AppContextProvider>
  );
};

export default Layout;
