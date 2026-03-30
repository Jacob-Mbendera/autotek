import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Wishlist } from './pages/Wishlist';
import { CompareProducts } from './pages/CompareProducts';
import { ProductDetail } from './pages/ProductDetail';
import { Services } from './pages/Services';
import { BookService } from './pages/BookService';
import { MyServices } from './pages/MyServices';
import { ServicePayment } from './pages/ServicePayment';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { Profile } from './pages/Profile';
import { Returns } from './pages/Returns';
import { ReturnDetail } from './pages/ReturnDetail';
import { RequestReturn } from './pages/RequestReturn';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancel } from './pages/PaymentCancel';
import { AdminDashboard, AdminProducts, AdminOrders, AdminServices, AdminProviders, AdminCustomOrders, AdminUsers, AdminSettings, AdminSupport, AdminReturns, DeliveryLocations } from './pages/admin';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Toast } from './components/ui/Toast';

function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Public routes without layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
    </BrowserRouter>
  );
}

export default App;
