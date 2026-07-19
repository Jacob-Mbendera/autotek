import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Eager load critical routes (immediate page load)
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Services } from './pages/Services';

// Lazy load secondary routes (code splitting)
const Wishlist = lazy(() => import('./pages/Wishlist').then(m => ({ default: m.Wishlist })));
const CompareProducts = lazy(() => import('./pages/CompareProducts').then(m => ({ default: m.CompareProducts })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const BookService = lazy(() => import('./pages/BookService').then(m => ({ default: m.BookService })));
const MyServices = lazy(() => import('./pages/MyServices').then(m => ({ default: m.MyServices })));
const RequestPart = lazy(() => import('./pages/RequestPart').then(m => ({ default: m.RequestPart })));
const MyPartRequests = lazy(() => import('./pages/MyPartRequests').then(m => ({ default: m.MyPartRequests })));
const ServicePayment = lazy(() => import('./pages/ServicePayment').then(m => ({ default: m.ServicePayment })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./pages/OrderDetail').then(m => ({ default: m.OrderDetail })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Returns = lazy(() => import('./pages/Returns').then(m => ({ default: m.Returns })));
const ReturnDetail = lazy(() => import('./pages/ReturnDetail').then(m => ({ default: m.ReturnDetail })));
const RequestReturn = lazy(() => import('./pages/RequestReturn').then(m => ({ default: m.RequestReturn })));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel').then(m => ({ default: m.PaymentCancel })));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminOrders })));
const AdminServices = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminServices })));
const AdminProviders = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminProviders })));
const AdminCustomOrders = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminCustomOrders })));
const AdminUsers = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminUsers })));
const AdminSettings = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminSettings })));
const AdminSupport = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminSupport })));
const AdminReturns = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminReturns })));
const DeliveryLocations = lazy(() => import('./pages/admin').then(m => ({ default: m.DeliveryLocations })));
const AdminMediaLibrary = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminMediaLibrary })));
const AdminCoupons = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminCoupons })));
const AdminRefunds = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminRefunds })));

import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestOnlyRoute } from './components/GuestOnlyRoute';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Toast } from './components/ui/Toast';
import { CrossTabSync } from './components/CrossTabSync';

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <CrossTabSync />
      <Toast />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public routes without layout */}
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <Login />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute>
              <Register />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnlyRoute>
              <ForgotPassword />
            </GuestOnlyRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        
        {/* Home page - temporarily public for preview */}
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        
        {/* Protected routes with layout */}
        
        {/* Public routes - Product and Service browsing */}
        <Route
          path="/products"
          element={
            <Layout>
              <Products />
            </Layout>
          }
        />
        <Route
          path="/products/:id"
          element={
            <Layout>
              <ProductDetail />
            </Layout>
          }
        />
        <Route
          path="/services"
          element={
            <Layout>
              <Services />
            </Layout>
          }
        />
        <Route
          path="/cart"
          element={
            <Layout>
              <Cart />
            </Layout>
          }
        />
        
        {/* Protected routes with layout */}
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <Layout>
                <Wishlist />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-service"
          element={
            <ProtectedRoute>
              <Layout>
                <BookService />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-services"
          element={
            <ProtectedRoute>
              <Layout>
                <MyServices />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/request-part"
          element={
            <ProtectedRoute>
              <Layout>
                <RequestPart />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-part-requests"
          element={
            <ProtectedRoute>
              <Layout>
                <MyPartRequests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/service-payment"
          element={
            <ProtectedRoute>
              <Layout>
                <ServicePayment />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <Layout>
              <Checkout />
            </Layout>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Layout>
                <Orders />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <OrderDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <ProtectedRoute>
              <Layout>
                <Returns />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns/new"
          element={
            <ProtectedRoute>
              <Layout>
                <RequestReturn />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ReturnDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminProducts />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/media"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminMediaLibrary />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminOrders />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminServices />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/providers"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminProviders />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/custom-orders"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminCustomOrders />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminCoupons />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/refunds"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminRefunds />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/delivery-locations"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <DeliveryLocations />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <OrderDetail isAdmin={true} />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminSettings />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminSupport />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/returns"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <AdminReturns />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/returns/:id"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <ReturnDetail isAdmin />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
