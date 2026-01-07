import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import StudentView from './pages/StudentView';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student/:studentName" element={<StudentView />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

