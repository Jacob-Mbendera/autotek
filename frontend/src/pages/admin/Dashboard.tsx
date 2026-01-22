import { useGetStatsQuery } from '../../store/api/adminApi';
import { AdminCard } from '../../components/ui/AdminCard';
import { H1, H2, Body } from '../../components/ui/Typography';
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
  Smartphone
} from 'lucide-react';

export const AdminDashboard = () => {
  const { data, isLoading, error } = useGetStatsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <AdminCard variant="default" className="text-center">
        <H1 className="text-2xl text-red-500 mb-2">Error Loading Dashboard</H1>
        <Body className="text-gray-400">
          Unable to load dashboard statistics. Please try again later.
        </Body>
      </AdminCard>
    );
  }

  const stats = data?.stats;

  const kpiCards = [
    {
      title: 'Total Sales (MWK)',
      value: (stats?.totalRevenue || 0).toLocaleString(),
      change: '+12.4%',
      changePositive: true,
      icon: DollarSign,
      accentColor: 'teal' as const,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-500/20',
    },
    {
      title: 'Total Requests',
      value: ((stats?.pendingOrders || 0) + (stats?.pendingCustomOrders || 0)).toString(),
      change: '+5.2%',
      changePositive: true,
      icon: FileText,
      accentColor: 'blue' as const,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/20',
    },
    {
      title: 'Active Services',
      value: (stats?.activeServices || 0).toString(),
      change: '+8.1%',
      changePositive: true,
      icon: Wrench,
      accentColor: 'purple' as const,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/20',
    },
    {
      title: 'Total Users',
      value: (stats?.totalUsers || 0).toString(),
      change: '+3.7%',
      changePositive: true,
      icon: Users,
      accentColor: 'green' as const,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/20',
    },
  ];

  // Mock pending actions data (replace with real data from API later)
  const pendingActions = [
    {
      id: 'REQ-001',
      type: 'Mobile Service',
      customer: 'John Doe',
      priority: 'HIGH',
      action: 'Assign',
    },
    {
      id: 'REQ-002',
      type: 'Custom Part',
      customer: 'Jane Smith',
      priority: 'MEDIUM',
      action: 'Quote',
    },
    {
      id: 'REQ-003',
      type: 'Towing',
      customer: 'Mike Johnson',
      priority: 'LOW',
      action: 'Assign',
    },
  ];

  const marketInsights = [
    {
      icon: TrendingUp,
      title: 'High Demand',
      description: 'Brake pads and filters trending up',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/20',
    },
    {
      icon: Truck,
      title: 'Supply Chain Alert',
      description: '3 parts low in stock',
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-500/20',
    },
    {
      icon: UserPlus,
      title: 'New Mechanics Onboard',
      description: '2 new service providers added',
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/20',
    },
  ];

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

      {/* Middle Row - Revenue Trends and Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue Trends */}
        <AdminCard variant="chart">
          <div className="flex items-center justify-between mb-4">
            <div>
              <H2 className="text-xl font-semibold text-gray-50 mb-1">Monthly Revenue Trends</H2>
              <Body className="text-sm text-gray-400">Revenue in MWK (Last 6 Months)</Body>
            </div>
            <div className="text-right">
              <Body className="text-sm text-gray-400">Total</Body>
              <H2 className="text-2xl font-bold text-teal-500">
                MWK {(stats?.totalRevenue || 0).toLocaleString()}
              </H2>
            </div>
          </div>
          {/* Chart Placeholder */}
          <div className="h-48 bg-slate-900 rounded-lg flex items-end justify-between p-4 border border-gray-700">
            {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'].map((month, index) => (
              <div key={month} className="flex flex-col items-center gap-2">
                <div
                  className={`w-8 rounded-t ${
                    month === 'JUN'
                      ? 'bg-teal-500 h-32'
                      : 'bg-gray-700 h-20'
                  } transition-all`}
                />
                <span
                  className={`text-xs font-medium ${
                    month === 'JUN' ? 'text-teal-500' : 'text-gray-400'
                  }`}
                >
                  {month}
                </span>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Pending Actions */}
        <AdminCard variant="table">
          <div className="flex items-center justify-between mb-4">
            <H2 className="text-xl font-semibold text-gray-50">Pending Actions</H2>
            <button className="text-sm text-teal-500 hover:text-teal-400 font-medium">
              View All
            </button>
          </div>
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
                      <Body className="text-sm text-gray-50 font-mono">{action.id}</Body>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {action.type === 'Mobile Service' ? (
                          <Smartphone className="h-4 w-4 text-gray-400" />
                        ) : action.type === 'Custom Part' ? (
                          <Package className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Truck className="h-4 w-4 text-gray-400" />
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
                      <button className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium rounded-lg transition-colors">
                        {action.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
};
