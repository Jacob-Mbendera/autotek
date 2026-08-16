import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { useGetMeQuery, useUpdateProfileMutation, useChangePasswordMutation } from '../store/api/authApi';
import { useGetOrdersQuery } from '../store/api/orderApi';
import { useGetTowingServicesQuery, useGetCarServicesQuery } from '../store/api/serviceApi';
import { updateUser } from '../store/slices/authSlice';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Breadcrumb } from '../components/Breadcrumb';
import { JournalCard, JournalButton, JournalInput, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
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
  Activity,
  BarChart3,
  Heart,
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
  const { data: ordersData } = useGetOrdersQuery(undefined, {
    skip: !authUser,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const { data: towingData } = useGetTowingServicesQuery(
    {},
    { skip: !authUser }
  );
  const { data: carServiceData } = useGetCarServicesQuery(
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
    })),
    ...towingServices.slice(0, 3).map((service: any) => ({
      type: 'service',
      id: service._id,
      title: 'Towing Service',
      description: `${service.vehicleType} ${service.vehicleModel}`,
      status: service.status,
      date: service.createdAt,
      icon: Truck,
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
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-journal-teal-tint text-journal-teal';
      case 'pending':
        return 'bg-journal-warn-bg text-journal-warn-text';
      case 'processing':
        return 'bg-journal-teal-tint text-journal-teal';
      default:
        return 'bg-journal-sand text-journal-body';
    }
  };

  if (isLoadingUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-journal-teal" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-10">
          <AlertCircle className="h-12 w-12 text-journal-faint mx-auto mb-4" />
          <CardHeading className="!text-[22px] mb-2">User not found</CardHeading>
          <JournalBody className="!text-journal-muted">Please log in to view your profile.</JournalBody>
        </JournalCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-journal-bone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        {/* Hero Section */}
        <div className="mt-8 mb-8 bg-journal-ink text-journal-bone p-6 sm:p-8 rounded-journal">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[22px] font-journal text-journal-bone">
                  {getInitials(user.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-journal-teal-bright border-2 border-journal-ink rounded-full p-1">
                  <CheckCircle className="h-3 w-3 text-journal-deep-teal" />
                </div>
              </div>

              {/* User Info */}
              <div>
                <PageHeading className="!text-[26px] sm:!text-[30px] !text-journal-bone mb-1.5">{user.name}</PageHeading>
                <div className="flex flex-wrap items-center gap-4 text-journal-bone/80">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="text-[13px] font-sans">{user.email}</span>
                  </div>
                  {memberSince && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-[13px] font-sans">Member since {memberSince}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link to="/orders">
                <JournalButton variant="secondary" className="!border-journal-bone/40 !text-journal-bone hover:!bg-journal-bone hover:!text-journal-ink">
                  <Package className="h-3.5 w-3.5" />
                  View orders
                </JournalButton>
              </Link>
              <Link to="/services">
                <JournalButton variant="secondary" className="!border-journal-bone/40 !text-journal-bone hover:!bg-journal-bone hover:!text-journal-ink">
                  <Wrench className="h-3.5 w-3.5" />
                  Services
                </JournalButton>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Spent */}
          <JournalCard className="bg-journal-teal-tint border-journal-teal-tint-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Total spent</p>
                <p className="font-journal text-[22px] text-journal-ink">MWK {totalSpent.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp className="h-3.5 w-3.5 text-journal-teal" />
                  <span className="text-[12px] font-sans font-medium text-journal-teal">{orders.length} orders</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Banknote className="h-6 w-6 text-journal-teal" />
              </div>
            </div>
          </JournalCard>

          {/* Total Orders */}
          <JournalCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Total orders</p>
                <p className="font-journal text-[22px] text-journal-ink">{orders.length}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-journal-teal" />
                    <span className="text-[11px] font-sans text-journal-muted">{completedOrders} completed</span>
                  </div>
                  {pendingOrders > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-journal-warn-text" />
                      <span className="text-[11px] font-sans text-journal-muted">{pendingOrders} pending</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 bg-journal-sand rounded-full flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-6 w-6 text-journal-body" />
              </div>
            </div>
          </JournalCard>

          {/* Services */}
          <JournalCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Services</p>
                <p className="font-journal text-[22px] text-journal-ink">{totalServices}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Truck className="h-3 w-3 text-journal-body" />
                  <span className="text-[11px] font-sans text-journal-muted">{towingServices.length} towing</span>
                  <Wrench className="h-3 w-3 text-journal-body ml-1" />
                  <span className="text-[11px] font-sans text-journal-muted">{carServices.length} car</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-journal-sand rounded-full flex items-center justify-center flex-shrink-0">
                <Wrench className="h-6 w-6 text-journal-body" />
              </div>
            </div>
          </JournalCard>

          {/* Member Status */}
          <JournalCard className="bg-journal-warn-bg border-journal-warn-bg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-warn-text mb-1">Member for</p>
                <p className="font-journal text-[22px] text-journal-warn-text">{memberDays}</p>
                <p className="text-[11px] font-sans text-journal-warn-text mt-2">days</p>
              </div>
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="h-6 w-6 text-journal-warn-text" />
              </div>
            </div>
          </JournalCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <JournalCard className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-journal-hairline">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-journal-teal" />
                  <CardHeading className="!text-[19px]">Personal information</CardHeading>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={handleEditProfile}
                    className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-teal hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <div className="space-y-4">
                  <JournalInput
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <JournalInput
                    label="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">
                      Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your address"
                      rows={3}
                      className="w-full px-3.5 py-3 text-[14px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <JournalButton
                      variant="primary"
                      onClick={handleSaveProfile}
                      disabled={isUpdatingProfile}
                    >
                      {isUpdatingProfile ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Save changes
                        </>
                      )}
                    </JournalButton>
                    <JournalButton variant="secondary" onClick={handleCancelEdit} disabled={isUpdatingProfile}>
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </JournalButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-journal hover:bg-journal-sand transition-colors">
                    <div className="p-1.5 bg-journal-teal-tint rounded-journal">
                      <User className="h-4 w-4 text-journal-teal" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-sans text-journal-faint mb-1">Full name</p>
                      <p className="text-journal-ink font-sans font-medium text-[14px]">{user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-journal hover:bg-journal-sand transition-colors">
                    <div className="p-1.5 bg-journal-teal-tint rounded-journal">
                      <Mail className="h-4 w-4 text-journal-teal" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-sans text-journal-faint mb-1">Email</p>
                      <p className="text-journal-ink font-sans font-medium text-[14px]">{user.email}</p>
                      <p className="text-[11px] font-sans text-journal-faint mt-1">Used for login</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-journal hover:bg-journal-sand transition-colors">
                    <div className="p-1.5 bg-journal-teal-tint rounded-journal">
                      <Phone className="h-4 w-4 text-journal-teal" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-sans text-journal-faint mb-1">Phone number</p>
                      <p className="text-journal-ink font-sans font-medium text-[14px]">{user.phone}</p>
                    </div>
                  </div>
                  {user.address && (
                    <div className="flex items-start gap-3 p-3 rounded-journal hover:bg-journal-sand transition-colors">
                      <div className="p-1.5 bg-journal-teal-tint rounded-journal">
                        <MapPin className="h-4 w-4 text-journal-teal" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-sans text-journal-faint mb-1">Address</p>
                        <p className="text-journal-ink font-sans font-medium text-[14px]">{user.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </JournalCard>

            {/* Change Password */}
            <JournalCard className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-journal-hairline">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-journal-teal" />
                  <CardHeading className="!text-[19px]">Security & password</CardHeading>
                </div>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-teal hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Change password
                  </button>
                )}
              </div>

              {isChangingPassword ? (
                <div className="space-y-4">
                  <JournalInput
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <JournalInput
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <JournalInput
                    label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <div className="flex gap-3 pt-4">
                    <JournalButton
                      variant="primary"
                      onClick={handleChangePassword}
                      disabled={isChangingPasswordMutation}
                    >
                      {isChangingPasswordMutation ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Change password
                        </>
                      )}
                    </JournalButton>
                    <JournalButton
                      variant="secondary"
                      onClick={handleCancelPasswordChange}
                      disabled={isChangingPasswordMutation}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </JournalButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-journal bg-journal-sand">
                    <Shield className="h-4 w-4 text-journal-faint" />
                    <p className="text-[13px] font-sans text-journal-body">Your password is securely encrypted</p>
                  </div>
                  <p className="text-journal-muted text-[13px] font-sans">Click "Change password" to update your password.</p>
                </div>
              )}
            </JournalCard>

            {/* Recent Activity Timeline */}
            {recentActivity.length > 0 && (
              <JournalCard className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-journal-hairline">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-journal-teal" />
                    <CardHeading className="!text-[19px]">Recent activity</CardHeading>
                  </div>
                </div>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    const Icon = activity.icon;
                    const isLast = index === recentActivity.length - 1;
                    return (
                      <div key={activity.id} className="flex gap-4 relative">
                        {!isLast && (
                          <div className="absolute left-[19px] top-10 w-px h-full bg-journal-hairline" />
                        )}
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-journal-teal-tint flex items-center justify-center z-10">
                          <Icon className="h-4 w-4 text-journal-teal" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                            <p className="font-sans font-semibold text-[13px] text-journal-ink">{activity.title}</p>
                            <p className="text-[11px] font-sans text-journal-faint">
                              {format(new Date(activity.date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <p className="text-[13px] font-sans text-journal-muted mb-2">{activity.description}</p>
                          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium', getActivityStatusColor(activity.status))}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </JournalCard>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <JournalCard>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-journal-teal" />
                <CardHeading className="!text-[17px]">Quick stats</CardHeading>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-journal bg-journal-sand">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-journal-body" />
                    <span className="text-[13px] font-sans text-journal-body">Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-[13px] text-journal-ink">{orders.length}</span>
                    {orders.length > 0 && (
                      <Link to="/orders" className="text-journal-teal hover:opacity-70">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-journal bg-journal-sand">
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-journal-body" />
                    <span className="text-[13px] font-sans text-journal-body">Towing</span>
                  </div>
                  <span className="font-sans font-semibold text-[13px] text-journal-ink">{towingServices.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-journal bg-journal-sand">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-journal-body" />
                    <span className="text-[13px] font-sans text-journal-body">Car services</span>
                  </div>
                  <span className="font-sans font-semibold text-[13px] text-journal-ink">{carServices.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-journal bg-journal-sand">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-journal-teal" />
                    <span className="text-[13px] font-sans text-journal-body">Completed</span>
                  </div>
                  <span className="font-sans font-semibold text-[13px] text-journal-ink">{completedOrders + completedServices}</span>
                </div>
              </div>
            </JournalCard>

            {/* Account Information */}
            <JournalCard>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-journal-teal" />
                <CardHeading className="!text-[17px]">Account details</CardHeading>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-journal bg-journal-sand">
                  <p className="text-[11px] font-sans text-journal-faint mb-1">Email</p>
                  <p className="text-[13px] font-sans font-medium text-journal-ink">{user.email}</p>
                </div>
                {memberSince && (
                  <div className="p-3 rounded-journal bg-journal-sand">
                    <p className="text-[11px] font-sans text-journal-faint mb-1">Member since</p>
                    <p className="text-[13px] font-sans font-medium text-journal-ink">{memberSince}</p>
                  </div>
                )}
                <div className="p-3 rounded-journal bg-journal-sand">
                  <p className="text-[11px] font-sans text-journal-faint mb-1">Account status</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-journal-teal rounded-full"></div>
                    <p className="text-[13px] font-sans font-medium text-journal-ink">Active</p>
                  </div>
                </div>
              </div>
            </JournalCard>

            {/* Recent Orders */}
            {orders.length > 0 && (
              <JournalCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-journal-teal" />
                    <CardHeading className="!text-[17px]">Recent orders</CardHeading>
                  </div>
                  <Link to="/orders" className="inline-flex items-center gap-1 text-[12px] font-sans font-medium text-journal-teal hover:underline">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {orders.slice(0, 3).map((order: any) => (
                    <Link
                      key={order._id}
                      to={`/orders/${order._id}`}
                      className="block p-3 rounded-journal border border-journal-hairline hover:border-journal-ink transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-sans font-medium text-[13px] text-journal-ink group-hover:text-journal-teal">
                          Order #{order._id.slice(-8)}
                        </p>
                        <span className={cn('px-2 py-0.5 rounded text-[11px] font-sans font-medium', getActivityStatusColor(order.status))}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-journal-faint">
                        {format(new Date(order.createdAt), 'MMM dd, yyyy')} &#183; MWK {order.totalAmount?.toLocaleString() || 0}
                      </p>
                    </Link>
                  ))}
                </div>
              </JournalCard>
            )}

            {/* Quick Links */}
            <JournalCard>
              <CardHeading className="!text-[17px] mb-4">Quick links</CardHeading>
              <div className="space-y-1">
                <Link to="/orders" className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-sans text-journal-body hover:bg-journal-sand rounded-journal transition-colors">
                  <Package className="h-3.5 w-3.5" />
                  My orders
                </Link>
                <Link to="/services" className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-sans text-journal-body hover:bg-journal-sand rounded-journal transition-colors">
                  <Wrench className="h-3.5 w-3.5" />
                  Services
                </Link>
                <Link to="/wishlist" className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-sans text-journal-body hover:bg-journal-sand rounded-journal transition-colors">
                  <Heart className="h-3.5 w-3.5" />
                  Wishlist
                </Link>
                <Link to="/cart" className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-sans text-journal-body hover:bg-journal-sand rounded-journal transition-colors">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Shopping cart
                </Link>
              </div>
            </JournalCard>
          </div>
        </div>
      </div>
    </div>
  );
};
