import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin, Result, Typography } from 'antd';
import { useAuth } from '../context/AuthContext';

const SystemAdminPage = lazy(() => import('../sysadmin'));
const CompanyPage = lazy(() => import('../company'));
const CompanyForm = lazy(() => import('../company/CompanyForm'));
const UserPage = lazy(() => import('../user'));
const SkillPage = lazy(() => import('../skills'));
const ProjectPage = lazy(() => import('../project'));
const ArticlePage = lazy(() => import('../article'));
const ArticleDetail = lazy(() => import('../article/ArticleDetail'));
const KnowledgePage = lazy(() => import('../knowledge'));
const KnowledgeBaseDetail = lazy(() => import('../knowledge/KnowledgeBaseDetail'));
const KeywordDetail = lazy(() => import('../knowledge/KeywordDetail'));
const PortraitDetail = lazy(() => import('../knowledge/PortraitDetail'));
const ImageDetail = lazy(() => import('../knowledge/ImageDetail'));
const DocumentDetail = lazy(() => import('../knowledge/DocumentDetail'));
const KeywordMine = lazy(() => import('../knowledge/KeywordMine'));
const PublishingSchedulePage = lazy(() => import('../publish'));
const TodoPage = lazy(() => import('../todo'));
const ApiDocsPage = lazy(() => import('../swagger'));

interface RouteDef {
  path: string;
  roles: string[];
  element: React.ReactNode;
}

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="page-container">
    <Typography.Title level={4} style={{ fontWeight: 400, marginBottom: 24 }}>{title}</Typography.Title>
    <Result
      status="info"
      title="功能建设中"
      subTitle="该功能正在开发中，敬请期待"
    />
  </div>
);

const PageLoading: React.FC = () => (
  <div className="full-page-loading">
    <Spin size="large" />
  </div>
);

const PageRouter: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const routes: RouteDef[] = [
    { path: '/todo', roles: ['sysadmin', 'admin'], element: <TodoPage /> },
    { path: '/knowledge', roles: ['sysadmin', 'admin'], element: <KnowledgePage /> },
    { path: '/knowledge/:baseId', roles: ['sysadmin', 'admin'], element: <KnowledgeBaseDetail /> },
    { path: '/knowledge/:baseId/keyword-mine', roles: ['sysadmin', 'admin'], element: <KeywordMine /> },
    { path: '/knowledge/:baseId/keyword/:id', roles: ['sysadmin', 'admin'], element: <KeywordDetail /> },
    { path: '/knowledge/:baseId/portrait/:id', roles: ['sysadmin', 'admin'], element: <PortraitDetail /> },
    { path: '/knowledge/:baseId/image/:id', roles: ['sysadmin', 'admin'], element: <ImageDetail /> },
    { path: '/knowledge/:baseId/document/:id', roles: ['sysadmin', 'admin'], element: <DocumentDetail /> },
    { path: '/article', roles: ['sysadmin', 'admin'], element: <ArticlePage /> },
    { path: '/article/:id', roles: ['sysadmin', 'admin'], element: <ArticleDetail /> },
    { path: '/publish', roles: ['sysadmin', 'admin', 'view'], element: <PublishingSchedulePage /> },
    { path: '/tools', roles: ['sysadmin', 'admin'], element: <PlaceholderPage title="常用工具" /> },
    { path: '/project', roles: ['sysadmin', 'admin'], element: <ProjectPage /> },
    { path: '/users', roles: ['sysadmin'], element: <UserPage /> },
    { path: '/skills', roles: ['sysadmin', 'admin'], element: <SkillPage /> },
    { path: '/company', roles: ['sysadmin'], element: <CompanyPage /> },
    { path: '/company/add', roles: ['sysadmin'], element: <CompanyForm /> },
    { path: '/company/edit/:id', roles: ['sysadmin'], element: <CompanyForm /> },
    { path: '/sysadmin', roles: ['sysadmin'], element: <SystemAdminPage /> },
    { path: '/swagger', roles: ['sysadmin'], element: <ApiDocsPage /> },
  ];

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              route.roles.includes(role) ? route.element : <Navigate to="/publish" replace />
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/publish" replace />} />
      </Routes>
    </Suspense>
  );
};

export default PageRouter;
