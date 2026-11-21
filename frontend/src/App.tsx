import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KioskPage } from './pages/KioskPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/kiosk" replace />} />
          <Route path="/kiosk" element={<KioskPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/:tab" element={<AdminPage />} />
          <Route path="/bonus" element={<Navigate to="/admin?tab=bonus" replace />} />
          <Route path="/payroll" element={<Navigate to="/admin?tab=payroll" replace />} />
          <Route path="/attendance" element={<Navigate to="/admin?tab=attendance" replace />} />
          <Route path="/employees" element={<Navigate to="/admin?tab=employees" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/kiosk" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
