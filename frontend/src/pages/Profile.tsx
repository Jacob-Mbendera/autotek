import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { useGetMeQuery, useUpdateProfileMutation, useChangePasswordMutation } from '../store/api/authApi';
import { useGetOrdersQuery } from '../store/api/orderApi';
import { useGetTowingServicesQuery, useGetCarServicesQuery } from '../store/api/serviceApi';
import { updateUser } from '../store/slices/authSlice';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Save,
  X,
  Lock,
  Package,
  Wrench,
  Truck,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowRight,
  Clock,
  TrendingUp,
  Banknote,
  ShoppingBag,
  Award,
  Shield,
  Star,
  Activity,
  BarChart3,
  CreditCard,
  Heart,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export const Profile = () => {
  const dispatch = useAppDispatch();
  const { user: authUser } = useAppSelector((state) => state.auth);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // API hooks
  const { data: userData, isLoading: isLoadingUser, refetch: refetchUser } = useGetMeQuery(undefined, {
    skip: !authUser,
  });
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPasswordMutation }] = useChangePasswordMutation();

  // Fetch user orders and services
  const { data: ordersData, isLoading: isLoadingOrders } = useGetOrdersQuery(undefined, {
    skip: !authUser,
  });
  const { data: towingData, isLoading: isLoadingTowing } = useGetTowingServicesQuery(
    {},
    { skip: !authUser }
  );
  const { data: carServiceData, isLoading: isLoadingCar } = useGetCarServicesQuery(
    {},
    { skip: !authUser }
  );

  const user = userData?.user || authUser;

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handleEditProfile = () => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
      }).unwrap();

      dispatch(updateUser(result.user));
      dispatch(showNotification({ message: 'Profile updated successfully!', type: 'success' }));
      setIsEditingProfile(false);
      await refetchUser();
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to update profile');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      dispatch(showNotification({
        message: 'New passwords do not match',
        type: 'error',
      }));
      return;
    }

    if (newPassword.length < 6) {
      dispatch(showNotification({
        message: 'Password must be at least 6 characters long',
        type: 'error',
      }));
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();

      dispatch(showNotification({ message: 'Password changed successfully!', type: 'success' }));
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to change password');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Profile' },
  ];

  const orders = ordersData?.orders || [];
  const towingServices = towingData?.services || [];
  const carServices = carServiceData?.services || [];

  // Calculate statistics
  const totalSpent = orders.reduce((sum: number, order: any) => {
    return sum + (order.totalAmount || 0);
  }, 0);

  const completedOrders = orders.filter((o: any) => o.status === 'completed').length;
  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
  const totalServices = towingServices.length + carServices.length;
  const completedServices = [...towingServices, ...carServices].filter((s: any) => s.status === 'completed').length;

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate member duration
  const memberSince = userData?.user && (userData.user as any).createdAt
    ? format(new Date((userData.user as any).createdAt), 'MMMM yyyy')
    : null;
  const memberDays = userData?.user && (userData.user as any).createdAt
    ? differenceInDays(new Date(), new Date((userData.user as any).createdAt))
    : 0;

  // Recent activity (combine orders and services)
  const recentActivity = [
    ...orders.slice(0, 5).map((order: any) => ({
      type: 'order',
      id: order._id,
      title: `Order #${order._id.slice(-8)}`,
      description: `${order.items?.length || 0} item${order.items?.length !== 1 ? 's' : ''} • MWK ${order.totalAmount?.toLocaleString() || 0}`,
      status: order.status,
      date: order.createdAt,
      icon: Package,
      color: 'teal',
    })),
    ...towingServices.slice(0, 3).map((service: any) => ({
      type: 'service',
      id: service._id,
      title: 'Towing Service',
      description: `${service.vehicleType} ${service.vehicleModel}`,
      status: service.status,
      date: service.createdAt,
      icon: Truck,
      color: 'blue',
    })),
    ...carServices.slice(0, 3).map((service: any) => ({
      type: 'service',
      id: service._id,
      title:
        (Array.isArray(service.serviceTypes) && service.serviceTypes.length > 0
          ? service.serviceTypes
          : service.serviceType
            ? [service.serviceType]
            : []
        )
          .map((entry: string) => entry.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))
          .join(', ') || 'Car Service',
      description: `${service.vehicleType} ${service.vehicleModel}`,
      status: service.status,
      date: service.createdAt,
      icon: Wrench,
      color: 'purple',
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  if (isLoadingUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card variant="md" className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <H1 className="text-2xl mb-2">User not found</H1>
          <Body className="text-gray-600">Please log in to view your profile.</Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        {/* Hero Section */}
        <div className="mt-8 mb-8">
          <Card variant="lg" className="bg-teal-600 text-white border-0 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-3xl font-bold">
                    {getInitials(user.name)}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-white rounded-full p-1.5">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                </div>

                {/* User Info */}
                <div>
                  <H1 className="text-3xl font-bold mb-2 text-white">{user.name}</H1>
                  <div className="flex flex-wrap items-center gap-4 text-white/90">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <Body className="text-white/90">{user.email}</Body>
                    </div>
                    {memberSince && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <Body className="text-white/90">Member since {memberSince}</Body>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <Link to="/orders">
                  <Button variant="secondary" size="default" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                    <Package className="h-4 w-4 mr-2" />
                    View Orders
                  </Button>
                </Link>
                <Link to="/services">
                  <Button variant="secondary" size="default" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                    <Wrench className="h-4 w-4 mr-2" />
                    Services
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Spent */}
          <Card variant="md" className="bg-teal-50 border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <Body className="text-gray-600 text-sm mb-1">Total Spent</Body>
                <H2 className="text-2xl font-bold text-gray-900">MWK {totalSpent.toLocaleString()}</H2>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  <Body className="text-sm text-teal-600 font-medium">{orders.length} orders</Body>
                </div>
              </div>
              <div className="h-16 w-16 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Banknote className="h-8 w-8 text-teal-600" />
              </div>
            </div>
          </Card>

          {/* Total Orders */}
          <Card variant="md" className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <Body className="text-gray-600 text-sm mb-1">Total Orders</Body>
                <H2 className="text-2xl font-bold text-gray-900">{orders.length}</H2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <Body className="text-xs text-gray-600">{completedOrders} completed</Body>
                  </div>
                  {pendingOrders > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-orange-600" />
                      <Body className="text-xs text-gray-600">{pendingOrders} pending</Body>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Services */}
          <Card variant="md" className="bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <Body className="text-gray-600 text-sm mb-1">Services</Body>
                <H2 className="text-2xl font-bold text-gray-900">{totalServices}</H2>
                <div className="flex items-center gap-2 mt-2">
                  <Truck className="h-3 w-3 text-purple-600" />
                  <Body className="text-xs text-gray-600">{towingServices.length} towing</Body>
                  <Wrench className="h-3 w-3 text-purple-600 ml-2" />
                  <Body className="text-xs text-gray-600">{carServices.length} car</Body>
                </div>
              </div>
              <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Wrench className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>

          {/* Member Status */}
          <Card variant="md" className="bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <Body className="text-gray-600 text-sm mb-1">Member For</Body>
                <H2 className="text-2xl font-bold text-gray-900">{memberDays}</H2>
                <Body className="text-xs text-gray-600 mt-2">days</Body>
              </div>
              <div className="h-16 w-16 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Award className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card variant="lg">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <H2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-teal-600" />
                  Personal Information
                </H2>
                {!isEditingProfile && (
                  <Button variant="ghost" size="small" onClick={handleEditProfile}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditingProfile ? (
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your address"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveProfile}
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" onClick={handleCancelEdit} disabled={isUpdatingProfile}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <User className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <Body className="text-sm text-gray-500 mb-1">Full Name</Body>
                      <Body className="text-gray-900 font-medium">{user.name}</Body>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <Body className="text-sm text-gray-500 mb-1">Email</Body>
                      <Body className="text-gray-900 font-medium">{user.email}</Body>
                      <Body className="text-xs text-gray-500 mt-1">Used for login</Body>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <Body className="text-sm text-gray-500 mb-1">Phone Number</Body>
                      <Body className="text-gray-900 font-medium">{user.phone}</Body>
                    </div>
                  </div>
                  {user.address && (
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MapPin className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <Body className="text-sm text-gray-500 mb-1">Address</Body>
                        <Body className="text-gray-900 font-medium">{user.address}</Body>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Change Password */}
            <Card variant="lg">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <H2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-teal-600" />
                  Security & Password
                </H2>
                {!isChangingPassword && (
                  <Button variant="ghost" size="small" onClick={() => setIsChangingPassword(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                )}
              </div>

              {isChangingPassword ? (
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="primary"
                      onClick={handleChangePassword}
                      disabled={isChangingPasswordMutation}
                    >
                      {isChangingPasswordMutation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleCancelPasswordChange}
                      disabled={isChangingPasswordMutation}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <Body className="text-sm text-gray-600">Your password is securely encrypted</Body>
                    </div>
                  </div>
                  <Body className="text-gray-600 text-sm">Click "Change Password" to update your password.</Body>
                </div>
              )}
            </Card>

            {/* Recent Activity Timeline */}
            {recentActivity.length > 0 && (
              <Card variant="lg">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <H2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-600" />
                    Recent Activity
                  </H2>
                </div>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon;
                    const isLast = index === recentActivity.length - 1;
                    const getIconBgClass = (color: string) => {
                      if (color === 'teal') return 'bg-teal-100';
                      if (color === 'blue') return 'bg-blue-100';
                      if (color === 'purple') return 'bg-purple-100';
                      return 'bg-gray-100';
                    };
                    const getIconColorClass = (color: string) => {
                      if (color === 'teal') return 'text-teal-600';
                      if (color === 'blue') return 'text-blue-600';
                      if (color === 'purple') return 'text-purple-600';
                      return 'text-gray-600';
                    };
                    return (
                      <div key={activity.id} className="flex gap-4 relative">
                        {!isLast && (
                          <div className="absolute left-6 top-10 w-0.5 h-full bg-gray-200" />
                        )}
                        <div className={`flex-shrink-0 h-12 w-12 rounded-full ${getIconBgClass(activity.color)} flex items-center justify-center z-10`}>
                          <Icon className={`h-6 w-6 ${getIconColorClass(activity.color)}`} />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <Body className="font-semibold text-gray-900">{activity.title}</Body>
                            <Body className="text-xs text-gray-500">
                              {format(new Date(activity.date), 'MMM dd, yyyy')}
                            </Body>
                          </div>
                          <Body className="text-sm text-gray-600 mb-2">{activity.description}</Body>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                            activity.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card variant="md">
              <H2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Quick Stats
              </H2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-600" />
                    <Body className="text-gray-600">Orders</Body>
                  </div>
                  <div className="flex items-center gap-2">
                    <Body className="font-semibold text-gray-900">{orders.length}</Body>
                    {orders.length > 0 && (
                      <Link to="/orders">
                        <Button variant="ghost" size="small">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-600" />
                    <Body className="text-gray-600">Towing</Body>
                  </div>
                  <Body className="font-semibold text-gray-900">{towingServices.length}</Body>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-gray-600" />
                    <Body className="text-gray-600">Car Services</Body>
                  </div>
                  <Body className="font-semibold text-gray-900">{carServices.length}</Body>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <Body className="text-gray-600">Completed</Body>
                  </div>
                  <Body className="font-semibold text-gray-900">{completedOrders + completedServices}</Body>
                </div>
              </div>
            </Card>

            {/* Account Information */}
            <Card variant="md">
              <H2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                Account Details
              </H2>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-50">
                  <Body className="text-xs text-gray-500 mb-1">Email</Body>
                  <Body className="text-sm font-medium text-gray-900">{user.email}</Body>
                </div>
                {memberSince && (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <Body className="text-xs text-gray-500 mb-1">Member Since</Body>
                    <Body className="text-sm font-medium text-gray-900">{memberSince}</Body>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-gray-50">
                  <Body className="text-xs text-gray-500 mb-1">Account Status</Body>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <Body className="text-sm font-medium text-gray-900">Active</Body>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recent Orders */}
            {orders.length > 0 && (
              <Card variant="md">
                <div className="flex items-center justify-between mb-4">
                  <H2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-600" />
                    Recent Orders
                  </H2>
                  <Link to="/orders">
                    <Button variant="ghost" size="small">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {orders.slice(0, 3).map((order: any) => (
                    <Link
                      key={order._id}
                      to={`/orders/${order._id}`}
                      className="block p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Body className="font-medium text-gray-900 group-hover:text-teal-600">
                          Order #{order._id.slice(-8)}
                        </Body>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <Body className="text-xs text-gray-600">
                        {format(new Date(order.createdAt), 'MMM dd, yyyy')} • MWK {order.totalAmount?.toLocaleString() || 0}
                      </Body>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Quick Links */}
            <Card variant="md">
              <H2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</H2>
              <div className="space-y-2">
                <Link to="/orders" className="block">
                  <Button variant="ghost" size="default" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    My Orders
                  </Button>
                </Link>
                <Link to="/services" className="block">
                  <Button variant="ghost" size="default" className="w-full justify-start">
                    <Wrench className="h-4 w-4 mr-2" />
                    Services
                  </Button>
                </Link>
                <Link to="/wishlist" className="block">
                  <Button variant="ghost" size="default" className="w-full justify-start">
                    <Heart className="h-4 w-4 mr-2" />
                    Wishlist
                  </Button>
                </Link>
                <Link to="/cart" className="block">
                  <Button variant="ghost" size="default" className="w-full justify-start">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Shopping Cart
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
