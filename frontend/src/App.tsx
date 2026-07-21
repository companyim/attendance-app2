import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import StudentView from './pages/StudentView';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { ShopProvider } from './contexts/ShopContext';
import ShopLayout from './pages/shop/ShopLayout';
import ShopLogin from './pages/shop/ShopLogin';
import ShopHome from './pages/shop/ShopHome';
import ShopCart from './pages/shop/ShopCart';
import ShopOrders from './pages/shop/ShopOrders';

function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/student/:studentId" element={<StudentView />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard/*" element={<AdminDashboard />} />

          <Route path="/shop/login" element={<ShopLogin />} />
          <Route path="/shop" element={<ShopLayout />}>
            <Route index element={<ShopHome />} />
            <Route path="cart" element={<ShopCart />} />
            <Route path="orders" element={<ShopOrders />} />
          </Route>
        </Routes>
      </ShopProvider>
    </BrowserRouter>
  );
}

export default App;

