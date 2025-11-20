import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { AdminConsole } from '../components/admin/AdminConsole';
import { DevConsole } from '../components/dev/DevConsole';
import { AuthGate } from '../components/AuthGate';

export const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AuthGate><AdminConsole /></AuthGate>} />
        <Route path="/dev-console" element={<AuthGate><DevConsole /></AuthGate>} />
        <Route path="/" element={<AuthGate><App /></AuthGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

