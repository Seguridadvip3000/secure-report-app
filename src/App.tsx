import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReportProvider } from './context/ReportContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewReport from './pages/NewReport';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';

export default function App() {
  return (
    <BrowserRouter>
      <ReportProvider>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-6xl mx-auto pt-12 lg:pt-0">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/nuevo" element={<NewReport />} />
                <Route path="/reportes" element={<ReportList />} />
                <Route path="/reportes/:id" element={<ReportDetail />} />
              </Routes>
            </div>
          </main>
        </div>
      </ReportProvider>
    </BrowserRouter>
  );
}
