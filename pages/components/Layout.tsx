import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Spin, Button, Breadcrumb } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import SystemAdminPage from '../sysadmin';
import CompanyPage from '../company';
import CompanyForm from '../company/CompanyForm';
import UserPage from '../user';
import SkillPage from '../skills';
import ProjectPage from '../project';
import ArticlePage from '../article';
import ArticleDetail from '../article/ArticleDetail';
import KnowledgePage from '../knowledge';
import PublishingSchedulePage from '../publish';
import TodoPage from '../todo';
import KnowledgeBaseDetail from '../knowledge/KnowledgeBaseDetail';
import KeywordDetail from '../knowledge/KeywordDetail';
import PortraitDetail from '../knowledge/PortraitDetail';
import ImageDetail from '../knowledge/ImageDetail';
import DocumentDetail from '../knowledge/DocumentDetail';
import KeywordMine from '../knowledge/KeywordMine';
import ApiDocsPage from '../api-docs';
import { AppContextProvider } from '../context/AppContext';
import axios from 'axios';

const { Sider, Content } = AntLayout;

const MOBILE_BREAKPOINT = 672;

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="page-container">
    <div className="page-breadcrumb">
      <Breadcrumb items={[{ title }]} />
    </div>
    <p className="page-subtitle">页面开发中...</p>
  </div>
);

interface UserData {
  id: number;
  username: string;
  cn_name: string;
  role: string;
  company_id?: number | null;
  selected_company: { id: number; short_name: string } | null;
  selected_project: { id: number; short_name: string } | null;
}

const Layout: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (location.pathname !== '/login') {
        localStorage.setItem('redirect_after_login', location.pathname);
      }
      setLoading(false);
      return;
    }

    axios
      .get('/api/v1/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUser(parsed);
          // Initialize AppContext from login data
          if (parsed.selected_company && !localStorage.getItem('selected_company')) {
            localStorage.setItem('selected_company', JSON.stringify(parsed.selected_company));
          }
          if (parsed.selected_project && !localStorage.getItem('selected_project')) {
            localStorage.setItem('selected_project', JSON.stringify(parsed.selected_project));
          }
        }
      })
      .catch(() => {
        if (location.pathname !== '/login') {
          localStorage.setItem('redirect_after_login', location.pathname);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, [location.pathname]);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.post('/api/v1/auth/logout', null, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore logout API errors — client cleanup is the priority
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selected_company');
    localStorage.removeItem('selected_project');
    setUser(null);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="full-page-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppContextProvider>
      <AntLayout className="app-layout-root">
        {isMobile && collapsed && (
          <Button
            type="text"
            icon={<MenuUnfoldOutlined />}
            onClick={() => setCollapsed(false)}
            className="sidebar-mobile-unfold"
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
            onLogout={handleLogout}
            collapsed={collapsed}
            onCollapse={setCollapsed}
            isMobile={isMobile}
          />
        </Sider>

        {isMobile && !collapsed && (
          <div className="mobile-overlay" onClick={() => setCollapsed(true)} />
        )}

        <Content className="main-content">
          <Routes>
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/knowledge/:baseId" element={<KnowledgeBaseDetail />} />
            <Route path="/knowledge/:baseId/keyword-mine" element={<KeywordMine />} />
            <Route path="/knowledge/:baseId/keyword/:id" element={<KeywordDetail />} />
            <Route path="/knowledge/:baseId/portrait/:id" element={<PortraitDetail />} />
            <Route path="/knowledge/:baseId/image/:id" element={<ImageDetail />} />
            <Route path="/knowledge/:baseId/document/:id" element={<DocumentDetail />} />
            <Route path="/article" element={<ArticlePage />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/publish" element={<PublishingSchedulePage />} />
            <Route path="/tools" element={<PlaceholderPage title="常用工具" />} />
            <Route path="/project" element={<ProjectPage />} />
            <Route path="/users" element={<UserPage />} />
            <Route path="/skills" element={<SkillPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/company/add" element={<CompanyForm />} />
            <Route path="/company/edit/:id" element={<CompanyForm />} />
            <Route path="/sysadmin" element={<SystemAdminPage />} />
            <Route path="/swagger" element={<ApiDocsPage />} />
            <Route path="*" element={<Navigate to="/publish" replace />} />
          </Routes>
        </Content>
      </AntLayout>
    </AppContextProvider>
  );
};

export default Layout;
