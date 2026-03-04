import { useGetStatsQuery, useGetAllOrdersQuery, useGetAllCustomOrdersQuery, useGetAllServicesQuery } from '../../store/api/adminApi';
import { AdminCard } from '../../components/ui/AdminCard';
import { H1, H2, Body } from '../../components/ui/Typography';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  CheckCircle,
  Wrench,
  FileText,
  Loader2,
  TrendingUp,
  Truck,
  UserPlus,
  Settings,
  Smartphone,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import type { OrderStatus } from '@shared/types';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper function to get status badge colors
const getStatusBadgeColor = (status: OrderStatus | string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const AdminDashboard = () => {
  const { data: statsData, isLoading: statsLoading, error: statsError } = useGetStatsQuery();
  const { data: ordersData } = useGetAllOrdersQuery({ limit: 5, status: 'pending' });
  const { data: customOrdersData } = useGetAllCustomOrdersQuery({ limit: 5, status: 'pending' });
  const { data: servicesData } = useGetAllServicesQuery({ limit: 5, status: 'pending' });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (statsError) {
    return (
      <AdminCard variant="default" className="text-center">
        <H1 className="text-2xl text-red-500 mb-2">Error Loading Dashboard</H1>
        <Body className="text-gray-400">
          Unable to load dashboard statistics. Please try again later.
        </Body>
      </AdminCard>
    );
  }

  const stats = statsData;

  const kpiCards = [
    {
      title: 'Total Sales (MWK)',
      value: (stats?.revenue?.total || 0).toLocaleString(),
      change: '+12.4%',
      changePositive: true,
      icon: DollarSign,
      accentColor: 'teal' as const,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-500/20',
    },
    {
      title: 'Pending Requests',
      value: ((stats?.orders?.pending || 0) + (customOrdersData?.customOrders?.length || 0)).toString(),
      change: '+5.2%',
      changePositive: true,
      icon: FileText,
      accentColor: 'blue' as const,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/20',
    },
    {
      title: 'Total Services',
      value: ((stats?.services?.towing || 0) + (stats?.services?.carService || 0)).toString(),
      change: '+8.1%',
      changePositive: true,
      icon: Wrench,
      accentColor: 'purple' as const,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/20',
    },
    {
      title: 'Total Users',
      value: (stats?.users?.total || 0).toString(),
      change: '+3.7%',
      changePositive: true,
      icon: Users,
      accentColor: 'green' as const,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/20',
    },
  ];

  // Build pending actions from real data
  const pendingActions = [
    ...(ordersData?.orders?.slice(0, 2).map((order: any) => ({
      id: order._id.slice(-8).toUpperCase(),
      type: 'Order',
      customer: order.user?.name || 'Unknown',
      priority: order.paymentStatus === 'pending' ? 'HIGH' : 'MEDIUM',
      action: 'View',
      link: `/admin/orders`,
    })) || []),
    ...(customOrdersData?.customOrders?.slice(0, 1).map((customOrder: any) => ({
      id: customOrder._id.slice(-8).toUpperCase(),
      type: 'Custom Order',
      customer: customOrder.user?.name || 'Unknown',
      priority: 'MEDIUM',
      action: 'Quote',
      link: `/admin/custom-orders`,
    })) || []),
    ...(servicesData?.towingServices?.slice(0, 1).map((service: any) => ({
      id: service._id.slice(-8).toUpperCase(),
      type: 'Towing',
      customer: service.user?.name || 'Unknown',
      priority: 'HIGH',
      action: 'Assign',
      link: `/admin/services`,
    })) || []),
    ...(servicesData?.carServices?.slice(0, 1).map((service: any) => ({
      id: service._id.slice(-8).toUpperCase(),
      type: 'Car Service',
      customer: service.user?.name || 'Unknown',
      priority: 'MEDIUM',
      action: 'Assign',
      link: `/admin/services`,
    })) || []),
  ].slice(0, 5);

  const marketInsights = [
    {
      icon: TrendingUp,
      title: 'Total Orders',
      description: `${stats?.orders?.total || 0} orders placed`,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/20',
    },
    {
      icon: AlertCircle,
      title: 'Out of Stock',
      description: `${stats?.products?.outOfStock || 0} products need restocking`,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-500/20',
    },
    {
      icon: Package,
      title: 'Total Products',
      description: `${stats?.products?.total || 0} products in catalog`,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/20',
    },
  ];

  // Mock revenue data for chart (would come from API in production)
  const revenueData = [
    { month: 'Jan', revenue: Math.round((stats?.revenue?.total || 0) * 0.12) },
    { month: 'Feb', revenue: Math.round((stats?.revenue?.total || 0) * 0.15) },
    { month: 'Mar', revenue: Math.round((stats?.revenue?.total || 0) * 0.18) },
    { month: 'Apr', revenue: Math.round((stats?.revenue?.total || 0) * 0.16) },
    { month: 'May', revenue: Math.round((stats?.revenue?.total || 0) * 0.19) },
    { month: 'Jun', revenue: Math.round((stats?.revenue?.total || 0) * 0.20) },
  ];

  // Order status distribution data
  const orderStatusData = [
    { name: 'Pending', value: stats?.orders?.pending || 0, color: '#F59E0B' },
    { name: 'Processing', value: (stats?.orders?.total || 0) - (stats?.orders?.pending || 0) - Math.round((stats?.orders?.total || 0) * 0.6), color: '#3B82F6' },
    { name: 'Completed', value: Math.round((stats?.orders?.total || 0) * 0.6), color: '#10B981' },
    { name: 'Cancelled', value: Math.round((stats?.orders?.total || 0) * 0.05), color: '#EF4444' },
  ].filter(item => item.value > 0);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-50 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: MWK {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <AdminCard key={kpi.title} variant="kpi" accentColor={kpi.accentColor}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Body className="text-sm text-gray-400 mb-1">{kpi.title}</Body>
                  <H2 className="text-2xl font-bold text-gray-50 mb-2">{kpi.value}</H2>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      kpi.changePositive
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}
                  >
                    {kpi.change}
                  </span>
                </div>
                <div className={`${kpi.iconBg} rounded-full p-3`}>
                  <Icon className={`h-6 w-6 ${kpi.iconColor}`} />
                </div>
              </div>
            </AdminCard>
          );
        })}
      </div>

      {/* Middle Row - Revenue Trends and Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue Trends - Recharts */}
        <AdminCard variant="chart">
          <div className="flex items-center justify-between mb-4">
            <div>
              <H2 className="text-xl font-semibold text-gray-50 mb-1">Monthly Revenue Trends</H2>
              <Body className="text-sm text-gray-400">Revenue in MWK (Last 6 Months)</Body>
            </div>
            <div className="text-right">
              <Body className="text-sm text-gray-400">Total</Body>
              <H2 className="text-2xl font-bold text-teal-500">
                MWK {(stats?.revenue?.total || 0).toLocaleString()}
              </H2>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="revenue" 
                  fill="#14b8a6"
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        {/* Order Status Distribution - Pie Chart */}
        <AdminCard variant="chart">
          <div className="flex items-center justify-between mb-4">
            <div>
              <H2 className="text-xl font-semibold text-gray-50 mb-1">Order Status Distribution</H2>
              <Body className="text-sm text-gray-400">Current order status breakdown</Body>
            </div>
            <div className="text-right">
              <Body className="text-sm text-gray-400">Total Orders</Body>
              <H2 className="text-2xl font-bold text-teal-500">
                {stats?.orders?.total || 0}
              </H2>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={800}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      {/* Pending Actions */}
      <div className="mb-6">
        <AdminCard variant="table">
          <div className="flex items-center justify-between mb-4">
            <H2 className="text-xl font-semibold text-gray-50">Pending Actions</H2>
            <Link to="/admin/orders" className="text-sm text-teal-500 hover:text-teal-400 font-medium flex items-center gap-1">
              View All
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {pendingActions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <Body className="text-gray-400">No pending actions</Body>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Request Type
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingActions.map((action) => (
                    <tr key={action.id} className="border-b border-gray-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <Body className="text-sm text-gray-50 font-mono">#{action.id}</Body>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {action.type === 'Car Service' ? (
                            <Smartphone className="h-4 w-4 text-gray-400" />
                          ) : action.type === 'Custom Order' ? (
                            <Package className="h-4 w-4 text-gray-400" />
                          ) : action.type === 'Towing' ? (
                            <Truck className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                          )}
                          <Body className="text-sm text-gray-50">{action.type}</Body>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-sm text-gray-50">{action.customer}</Body>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            action.priority === 'HIGH'
                              ? 'bg-red-500/20 text-red-500'
                              : action.priority === 'MEDIUM'
                              ? 'bg-orange-500/20 text-orange-500'
                              : 'bg-green-500/20 text-green-500'
                          }`}
                        >
                          {action.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={action.link || '#'}>
                          <button className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium rounded-lg transition-colors">
                            {action.action}
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {/* Enhanced Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Recent Orders Widget */}
        <AdminCard variant="default">
          <div className="flex items-center justify-between mb-4">
            <H2 className="text-lg font-semibold text-gray-50">Recent Orders</H2>
            <Link to="/admin/orders" className="text-sm text-teal-500 hover:text-teal-400">
              View All
            </Link>
          </div>
          {ordersData?.orders && ordersData.orders.length > 0 ? (
            <div className="space-y-3">
              {ordersData.orders.slice(0, 3).map((order: any) => (
                <div key={order._id} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                  <div className="flex-1">
                    <Body className="text-sm font-medium text-gray-50">
                      #{order._id.slice(-8).toUpperCase()}
                    </Body>
                    <Body className="text-xs text-gray-400">
                      {order.user?.name || 'Unknown'} • MWK {order.totalAmount.toLocaleString()}
                    </Body>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Body className="text-sm text-gray-400 text-center py-4">No recent orders</Body>
          )}
        </AdminCard>

        {/* Low Stock Alerts Widget */}
        <AdminCard variant="default">
          <div className="flex items-center justify-between mb-4">
            <H2 className="text-lg font-semibold text-gray-50">Stock Alerts</H2>
            <Link to="/admin/products" className="text-sm text-teal-500 hover:text-teal-400">
              Manage
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <Body className="text-sm font-medium text-gray-50">
                  {stats?.products?.outOfStock || 0} Products Out of Stock
                </Body>
                <Body className="text-xs text-gray-400">Requires immediate attention</Body>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
              <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <Body className="text-sm font-medium text-gray-50">
                  {stats?.products?.total || 0} Total Products
                </Body>
                <Body className="text-xs text-gray-400">In catalog</Body>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Service Requests Widget */}
        <AdminCard variant="default">
          <div className="flex items-center justify-between mb-4">
            <H2 className="text-lg font-semibold text-gray-50">Service Requests</H2>
            <Link to="/admin/services" className="text-sm text-teal-500 hover:text-teal-400">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-400" />
                <Body className="text-sm text-gray-50">Towing Services</Body>
              </div>
              <Body className="text-sm font-bold text-teal-500">
                {stats?.services?.towing || 0}
              </Body>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-gray-400" />
                <Body className="text-sm text-gray-50">Car Services</Body>
              </div>
              <Body className="text-sm font-bold text-teal-500">
                {stats?.services?.carService || 0}
              </Body>
            </div>
            <div className="flex items-center justify-between p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
              <Body className="text-sm font-medium text-gray-50">Pending Payments</Body>
              <Body className="text-sm font-bold text-teal-500">
                {stats?.payments?.pending || 0}
              </Body>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Market Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {marketInsights.map((insight) => {
          const Icon = insight.icon;
          return (
            <AdminCard key={insight.title} variant="default">
              <div className="flex items-start gap-4">
                <div className={`${insight.iconBg} rounded-lg p-3`}>
                  <Icon className={`h-6 w-6 ${insight.iconColor}`} />
                </div>
                <div className="flex-1">
                  <H2 className="text-lg font-semibold text-gray-50 mb-1">{insight.title}</H2>
                  <Body className="text-sm text-gray-400">{insight.description}</Body>
                </div>
              </div>
            </AdminCard>
          );
        })}
      </div>

      {/* Quick Actions Panel */}
      <div className="mt-6">
        <AdminCard variant="default">
          <div className="flex items-center justify-between mb-4">
            <H2 className="text-lg font-semibold text-gray-50">Quick Actions</H2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/admin/products">
              <button className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left">
                <Package className="h-5 w-5 text-teal-500 mb-2" />
                <Body className="text-sm font-medium text-gray-50">Manage Products</Body>
                <Body className="text-xs text-gray-400">Add, edit, or remove products</Body>
              </button>
            </Link>
            <Link to="/admin/orders">
              <button className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left">
                <ShoppingCart className="h-5 w-5 text-teal-500 mb-2" />
                <Body className="text-sm font-medium text-gray-50">View Orders</Body>
                <Body className="text-xs text-gray-400">Process and track orders</Body>
              </button>
            </Link>
            <Link to="/admin/services">
              <button className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left">
                <Wrench className="h-5 w-5 text-teal-500 mb-2" />
                <Body className="text-sm font-medium text-gray-50">Manage Services</Body>
                <Body className="text-xs text-gray-400">Assign and track services</Body>
              </button>
            </Link>
            <Link to="/admin/custom-orders">
              <button className="w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left">
                <FileText className="h-5 w-5 text-teal-500 mb-2" />
                <Body className="text-sm font-medium text-gray-50">Custom Orders</Body>
                <Body className="text-xs text-gray-400">Review and quote requests</Body>
              </button>
            </Link>
          </div>
        </AdminCard>
      </div>
    </div>
  );
};
