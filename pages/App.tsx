import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import { AuthProvider } from './context/AuthContext';
import { AppContextProvider } from './context/AppContext';
import Layout from './components/Layout';
import LoginPage from './login';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContextProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<AuthGuard><Layout /></AuthGuard>} />
          </Routes>
        </AppContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
