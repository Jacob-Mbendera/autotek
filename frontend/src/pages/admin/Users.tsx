import { useState } from 'react';
import { useGetAllUsersQuery, useGetUserQuery, useUpdateUserRoleMutation, type User } from '../../store/api/adminApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, H2, Body } from '../../components/ui/Typography';
import { Search, Filter, Eye, Loader2, Users, Mail, Phone, MapPin, Calendar, Shield, ChevronLeft, X } from 'lucide-react';
import { UserRole } from '@shared/types';

export const AdminUsers = () => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.CUSTOMER);

  const { data, isLoading, refetch } = useGetAllUsersQuery({
    page,
    limit,
    role: roleFilter || undefined,
    search: searchTerm || undefined,
  });

  const { data: userData, isLoading: isLoadingUser, refetch: refetchUser } = useGetUserQuery(
    selectedUserId || '',
    { skip: !selectedUserId }
  );

  const [updateUserRole, { isLoading: isUpdatingRole }] = useUpdateUserRoleMutation();

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-500/20 text-red-500';
      case UserRole.MECHANIC:
        return 'bg-blue-500/20 text-blue-500';
      case UserRole.CUSTOMER:
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleCloseUserDetails = () => {
    setSelectedUserId(null);
  };

  const handleOpenRoleModal = (user: User) => {
    setNewRole(user.role);
    setSelectedUserId(user._id);
    setShowRoleModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUserId) return;
    try {
      await updateUserRole({ userId: selectedUserId, role: newRole }).unwrap();
      dispatch(showNotification({ message: 'User role updated successfully!', type: 'success' }));
      setShowRoleModal(false);
      await refetch(); // Refetch users list
      if (selectedUserId) {
        await refetchUser(); // Refetch user details if viewing user details
      }
    } catch (error: any) {
      dispatch(showNotification({ 
        message: error.data?.message || 'Failed to update user role', 
        type: 'error' 
      }));
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update user role:', error);
      }
    }
  };

  const users = data?.users || [];
  const pagination = data?.pagination as { page: number; limit: number; total: number; pages: number } | undefined;

  if (selectedUserId && userData?.user) {
    const user = userData.user;
    return (
      <div>
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleCloseUserDetails}
            className="text-gray-400 hover:text-gray-50 gap-2"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Users
          </Button>
        </div>

        <AdminCard variant="default" className="mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <H1 className="text-3xl font-bold text-gray-50 mb-2">{user.name}</H1>
              <Body className="text-gray-400">User Details</Body>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-5 w-5 text-gray-400" />
                <Body className="text-sm text-gray-400">Email</Body>
              </div>
              <Body className="text-gray-50">{user.email}</Body>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <Body className="text-sm text-gray-400">Phone</Body>
              </div>
              <Body className="text-gray-50">{user.phone}</Body>
            </div>

            {user.address && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <Body className="text-sm text-gray-400">Address</Body>
                </div>
                <Body className="text-gray-50">{user.address}</Body>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <Body className="text-sm text-gray-400">Member Since</Body>
              </div>
              <Body className="text-gray-50">{formatDate(user.createdAt)}</Body>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <H2 className="text-xl font-semibold text-gray-50 mb-4">Actions</H2>
            <Button
              variant="primary"
              onClick={() => handleOpenRoleModal(user)}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Change Role
            </Button>
          </div>
        </AdminCard>

        {/* Role Update Modal - Render even when viewing user details */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <AdminCard variant="default" className="max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <H2 className="text-xl font-semibold text-gray-50">Change User Role</H2>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="text-gray-400 hover:text-gray-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg text-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={UserRole.CUSTOMER}>Customer</option>
                  <option value={UserRole.MECHANIC}>Mechanic</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleUpdateRole}
                  disabled={isUpdatingRole}
                  className="flex-1 gap-2"
                >
                  {isUpdatingRole ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Role'
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowRoleModal(false)}
                  disabled={isUpdatingRole}
                >
                  Cancel
                </Button>
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <H1 className="text-3xl font-bold text-gray-50 mb-2">User Management</H1>
        <Body className="text-gray-400">View and manage all users</Body>
      </div>

      {/* Filters */}
      <AdminCard variant="default" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                dark
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, or phone"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | '');
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg text-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Roles</option>
              <option value={UserRole.CUSTOMER}>Customer</option>
              <option value={UserRole.MECHANIC}>Mechanic</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setPage(1);
              }}
              className="w-full gap-2"
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>
      </AdminCard>

      {/* Users List */}
      <AdminCard variant="default">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-teal-500 animate-spin mx-auto mb-4" />
            <Body className="text-gray-400">Loading users...</Body>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <H2 className="text-xl font-semibold text-gray-400 mb-2">No users found</H2>
            <Body className="text-gray-500">
              {searchTerm || roleFilter
                ? 'Try adjusting your search or filters'
                : 'No users in the system yet'}
            </Body>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Joined</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <Body className="text-gray-50 font-medium">{user.name}</Body>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-gray-400">{user.email}</Body>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-gray-400">{user.phone}</Body>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-gray-400">{formatDate(user.createdAt)}</Body>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => handleOpenRoleModal(user)}
                            className="text-blue-400 hover:text-blue-300 gap-1.5"
                            title="Change Role"
                          >
                            <Shield className="h-4 w-4" />
                            Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => handleViewUser(user._id)}
                            className="text-teal-400 hover:text-teal-300"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <Body className="text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                </Body>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Body className="text-gray-400">
                    Page {pagination.page} of {pagination.pages}
                  </Body>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* Role Update Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AdminCard variant="default" className="max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <H2 className="text-xl font-semibold text-gray-50">Change User Role</H2>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-gray-400 hover:text-gray-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg text-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={UserRole.CUSTOMER}>Customer</option>
                <option value={UserRole.MECHANIC}>Mechanic</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleUpdateRole}
                disabled={isUpdatingRole}
                className="flex-1 gap-2"
              >
                {isUpdatingRole ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowRoleModal(false)}
                disabled={isUpdatingRole}
              >
                Cancel
              </Button>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
};
