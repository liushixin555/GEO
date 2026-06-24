import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import { AuthProvider } from './context/AuthContext';
import { AppContextProvider } from './context/AppContext';
import Layout from './components/Layout';
import LoginPage from './login';

const PAGE_TITLES: Record<string, string> = {
  '/login': '登录',
  '/todo': '待办事项',
  '/knowledge': '知识库',
  '/article': '文章管理',
  '/publish': '发布管理',
  '/citation-diagnosis': '检测管理',
  '/project': '项目',
  '/users': '用户管理',
  '/skills': '技能管理',
  '/company': '企业管理',
  '/sysadmin': '系统设置',
  '/swagger': 'API 文档',
};

const SITE_NAME = '薄云商机倍增服务';

function usePageTitle() {
  const location = useLocation();
  useEffect(() => {
    const basePath = '/' + location.pathname.split('/').filter(Boolean)[0];
    const pageTitle = PAGE_TITLES[basePath];
    document.title = pageTitle ? `${pageTitle} - ${SITE_NAME}` : SITE_NAME;
  }, [location.pathname]);
}

const AppRoutes: React.FC = () => {
  usePageTitle();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<AuthGuard><Layout /></AuthGuard>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContextProvider>
          <AppRoutes />
        </AppContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
