import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Users,
  UserCheck,
  AlertCircle,
  DollarSign,
  Clock,
  UserX,
  Plus,
  Cake
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [birthdayMembers, setBirthdayMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, birthdayRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/dashboard/birthday-today`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setStats(statsRes.data);
      setBirthdayMembers(birthdayRes.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-text-muted">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Members',
      value: stats?.total_members || 0,
      icon: Users,
      color: 'bg-blue-50 text-status-info',
      testId: 'stat-total-members'
    },
    {
      title: 'Active Members',
      value: stats?.active_members || 0,
      icon: UserCheck,
      color: 'bg-green-50 text-status-success',
      testId: 'stat-active-members'
    },
    {
      title: 'Expiring in 5 Days',
      value: stats?.expiring_in_5_days || 0,
      icon: AlertCircle,
      color: 'bg-yellow-50 text-status-warning',
      testId: 'stat-expiring'
    },
    {
      title: "Today's Collection",
      value: `₹${stats?.todays_collection?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'bg-primary-light text-primary',
      testId: 'stat-collection'
    },
    {
      title: 'Pending Payments',
      value: `₹${stats?.pending_payments?.toFixed(2) || '0.00'}`,
      icon: Clock,
      color: 'bg-red-50 text-status-error',
      testId: 'stat-pending'
    },
    {
      title: 'Inactive Members (7d)',
      value: stats?.inactive_members || 0,
      icon: UserX,
      color: 'bg-slate-100 text-text-muted',
      testId: 'stat-inactive'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Dashboard</h1>
          <p className="text-text-muted mt-1">Overview of your gym management</p>
        </div>
        <Link
          to="/members/add"
          data-testid="quick-add-member"
          className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </Link>
      </div>

      {/* Birthday Alert */}
      {birthdayMembers.length > 0 && (
        <div className="bg-primary-light border border-primary/20 rounded-xl p-5" data-testid="birthday-alert">
          <div className="flex items-start gap-3">
            <Cake className="w-6 h-6 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-text-main mb-1">Birthdays Today!</h3>
              <div className="space-y-1">
                {birthdayMembers.map((member) => (
                  <p key={member.id} className="text-sm text-text-main">
                    {member.full_name} - {member.phone_number}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            data-testid={stat.testId}
            className="bg-white rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-text-muted mb-2">{stat.title}</p>
                <p className="text-2xl md:text-3xl font-bold text-text-main">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/attendance"
          data-testid="quick-link-attendance"
          className="bg-white rounded-xl border border-border shadow-sm p-5 hover:border-primary/50 hover:shadow-md transition-all"
        >
          <UserCheck className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-semibold text-text-main mb-1">Mark Attendance</h3>
          <p className="text-sm text-text-muted">Quick check-in for members</p>
        </Link>

        <Link
          to="/reports?tab=expiring"
          data-testid="quick-link-expiring"
          className="bg-white rounded-xl border border-border shadow-sm p-5 hover:border-primary/50 hover:shadow-md transition-all"
        >
          <AlertCircle className="w-8 h-8 text-status-warning mb-3" />
          <h3 className="font-semibold text-text-main mb-1">Expiring Soon</h3>
          <p className="text-sm text-text-muted">View members expiring in 5 days</p>
        </Link>

        <Link
          to="/reports?tab=inactive"
          data-testid="quick-link-inactive"
          className="bg-white rounded-xl border border-border shadow-sm p-5 hover:border-primary/50 hover:shadow-md transition-all"
        >
          <UserX className="w-8 h-8 text-text-muted mb-3" />
          <h3 className="font-semibold text-text-main mb-1">Inactive Members</h3>
          <p className="text-sm text-text-muted">Members not visited in 7 days</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
