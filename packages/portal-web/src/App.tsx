```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CatalogPage from './pages/CatalogPage';
import DeployMcpPage from './pages/DeployMcpPage';
import MyServersPage from './pages/MyServersPage';
import ChatPage from './pages/ChatPage'; // Assuming ChatPage will be created
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './contexts/AuthContext';
import './index.css'; // Assuming Tailwind base styles are here

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/deploy/:templateId" element={<DeployMcpPage />} />
              <Route path="/my-servers" element={<MyServersPage />} />
              <Route path="/chat" element={<ChatPage />} />
              {/* Add other protected routes here */}
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```
