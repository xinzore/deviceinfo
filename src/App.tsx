import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PhoneDetailPage from './pages/PhoneDetailPage';
import SubmitPhonePage from './pages/SubmitPhonePage';
import AdminPage from './pages/AdminPage';
import AdminEditPhonePage from './pages/AdminEditPhonePage';
import ComparePage from './pages/ComparePage';
import FilterPage from './pages/FilterPage';

export interface SpecData {
  id: string;
  title: string;
  icon: any;
  primaryValue: string;
  secondaryValue?: string;
  iconColor: string;
  category: string;
  details: {
    label: string;
    value: string;
    description?: string;
  }[];
  highlights?: string[];
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/phone/:slug" element={<PhoneDetailPage />} />
          <Route path="/submit" element={<SubmitPhonePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/phones/:id" element={<AdminEditPhonePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/compare/:pair" element={<ComparePage />} />
          <Route path="/filter" element={<FilterPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </>
  );
}
