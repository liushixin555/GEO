import React, { Suspense, lazy, Component } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useAuth } from '../context/AuthContext';
import { ROLES, type Role } from '../../apis/constants/roles';

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

const VALID_ROLES = Object.values(ROLES) as string[];

interface RouteDef {
  path: string;
  roles: Role[];
  Component: React.LazyExoticComponent<React.ComponentType> | React.ComponentType;
}

const ROUTE_DEFS: RouteDef[] = [
  { path: '/todo', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: TodoPage },
  { path: '/knowledge', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: KnowledgePage },
  { path: '/knowledge/:baseId', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: KnowledgeBaseDetail },
  { path: '/knowledge/:baseId/keyword-mine', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: KeywordMine },
  { path: '/knowledge/:baseId/keyword/:id', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: KeywordDetail },
  { path: '/knowledge/:baseId/portrait/:id', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: PortraitDetail },
  { path: '/knowledge/:baseId/image/:id', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: ImageDetail },
  { path: '/knowledge/:baseId/document/:id', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: DocumentDetail },
  { path: '/article', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: ArticlePage },
  { path: '/article/:id', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: ArticleDetail },
  { path: '/publish', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: PublishingSchedulePage },
  { path: '/project', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: ProjectPage },
  { path: '/users', roles: [ROLES.SYSADMIN], Component: UserPage },
  { path: '/skills', roles: [ROLES.SYSADMIN, ROLES.ADMIN], Component: SkillPage },
  { path: '/company', roles: [ROLES.SYSADMIN], Component: CompanyPage },
  { path: '/company/add', roles: [ROLES.SYSADMIN], Component: CompanyForm },
  { path: '/company/edit/:id', roles: [ROLES.SYSADMIN], Component: CompanyForm },
  { path: '/sysadmin', roles: [ROLES.SYSADMIN], Component: SystemAdminPage },
  { path: '/swagger', roles: [ROLES.SYSADMIN], Component: ApiDocsPage },
];

interface ChunkErrorBoundaryState {
  hasError: boolean;
}

class ChunkErrorBoundary extends Component<
  { children: React.ReactNode },
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    if (/Loading chunk|ChunkLoadError/i.test(error.message)) {
      return { hasError: true };
    }
    throw error;
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面加载失败"
          subTitle="网络连接异常或页面已更新，请刷新页面重试"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

const PageLoading: React.FC = () => (
  <div
    className="full-page-loading"
    role="status"
    aria-busy="true"
    aria-label="页面加载中"
  >
    <Spin size="large" tip="页面加载中...">
      <div className="loading-content" />
    </Spin>
  </div>
);
PageLoading.displayName = 'PageLoading';

const ForbiddenResult: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="无法访问此页面"
      subTitle="您没有访问此页面的权限，如需帮助请联系管理员"
      extra={
        <Button type="primary" onClick={() => navigate('/todo')}>
          返回首页
        </Button>
      }
    />
  );
};

const NotFoundResult: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="找不到此页面"
      subTitle="请检查访问的地址是否正确，或返回首页"
      extra={
        <Button type="primary" onClick={() => navigate('/todo')}>
          返回首页
        </Button>
      }
    />
  );
};

const RouteGuard: React.FC<{ route: RouteDef; role: Role }> = ({ route, role }) => {
  if (!VALID_ROLES.includes(role)) {
    console.warn('[Security] Invalid role detected:', { path: route.path, role });
    return <ForbiddenResult />;
  }

  if (!route.roles.includes(role)) {
    console.warn('[Security] Unauthorized route access:', {
      path: route.path,
      userRole: role,
      requiredRoles: route.roles,
    });
    return <ForbiddenResult />;
  }

  const { Component: PageComponent } = route;
  return <PageComponent />;
};

const PageRouter: React.FC = () => {
  const { user } = useAuth();
  const role: Role = user?.role ?? ROLES.VIEW;

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/todo" replace />} />
          {ROUTE_DEFS.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<RouteGuard route={route} role={role} />}
            />
          ))}
          <Route path="*" element={<NotFoundResult />} />
        </Routes>
      </Suspense>
    </ChunkErrorBoundary>
  );
};

export default PageRouter;
