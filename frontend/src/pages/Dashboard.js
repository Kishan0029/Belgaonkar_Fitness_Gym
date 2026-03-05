import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { isToday } from 'date-fns';
import {
  Users,
  UserCheck,
  AlertCircle,
  DollarSign,
  Clock,
  UserX,
  Plus,
  Cake,
  Phone,
  MessageCircle,
  CalendarCheck,
  Fingerprint,
  Activity
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [birthdayMembers, setBirthdayMembers] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, birthdayRes, financeRes, enquiriesRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/dashboard/birthday-today`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/financial-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/enquiries`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(statsRes.data);
      setBirthdayMembers(birthdayRes.data);
      setFinancialSummary(financeRes.data);

      const todaysFollowUps = enquiriesRes.data.filter(e =>
        e.follow_up_date && isToday(new Date(e.follow_up_date))
      );
      setFollowUps(todaysFollowUps);

    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = (name, phone, pkg) => {
    if (!phone) {
      toast.error('No phone number provided.');
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const message = `Hi ${name} 👋\n\nThank you for your enquiry at Belgaonkar Fitness Gym.\nOur ${pkg || 'membership'} details are available.\nLet us know if you'd like to visit for a trial 💪`;
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
  };

  const handleCall = (phone) => {
    if (!phone) {
      toast.error('No phone number provided.');
      return;
    }
    window.location.href = `tel:${phone}`;
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
      testId: 'stat-total-members',
      path: '/members'
    },
    {
      title: 'Active Members',
      value: stats?.active_members || 0,
      icon: UserCheck,
      color: 'bg-green-50 text-status-success',
      testId: 'stat-active-members',
      path: '/members?status=active'
    },
    {
      title: 'Expiring in 5 Days',
      value: stats?.expiring_in_5_days || 0,
      icon: AlertCircle,
      color: 'bg-yellow-50 text-status-warning',
      testId: 'stat-expiring',
      path: '/reports?tab=expiring'
    },
    {
      title: "Today's Collection",
      value: `₹${stats?.todays_collection?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'bg-primary-light text-primary',
      testId: 'stat-collection',
      path: '/payments?date=today'
    },
    {
      title: 'Pending Payments',
      value: `₹${stats?.pending_payments?.toFixed(2) || '0.00'}`,
      icon: Clock,
      color: 'bg-red-50 text-status-error',
      testId: 'stat-pending',
      path: '/reports?tab=pending'
    },
    {
      title: 'Inactive Members (7d)',
      value: stats?.inactive_members || 0,
      icon: UserX,
      color: 'bg-slate-100 text-text-muted',
      testId: 'stat-inactive',
      path: '/reports?tab=inactive'
    },
    {
      title: 'Biometric Devices',
      value: `${stats?.biometric_devices_connected || 0} / ${stats?.biometric_devices_total || 0}`,
      icon: Fingerprint,
      color: 'bg-indigo-50 text-indigo-600',
      testId: 'stat-devices',
      path: '/devices'
    },
    {
      title: "Today's Bio Entries",
      value: stats?.biometric_entries_today || 0,
      icon: Activity,
      color: 'bg-teal-50 text-teal-600',
      testId: 'stat-bio-entries',
      path: '/entry-monitor'
    }
  ];

  const financeCards = [
    {
      title: 'Monthly Revenue',
      value: `₹${financialSummary?.monthly_revenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'bg-green-50 text-status-success',
      testId: 'stat-monthly-revenue'
    },
    {
      title: 'Monthly Expenses',
      value: `₹${financialSummary?.monthly_expenses?.toFixed(2) || '0.00'}`,
      icon: AlertCircle,
      color: 'bg-red-50 text-status-error',
      testId: 'stat-monthly-expenses'
    },
    {
      title: 'Monthly Profit',
      value: `₹${financialSummary?.monthly_profit?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'bg-blue-50 text-status-info',
      testId: 'stat-monthly-profit'
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

      {/* Follow-ups Today Widget */}
      {followUps.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5" data-testid="followups-alert">
          <div className="flex items-start gap-3">
            <CalendarCheck className="w-6 h-6 text-orange-500 mt-0.5" />
            <div className="flex-1 w-full">
              <h3 className="font-semibold text-text-main mb-3">Follow-ups Today ({followUps.length})</h3>
              <div className="space-y-3">
                {followUps.map((enquiry) => (
                  <div key={enquiry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                    <div>
                      <p className="font-semibold text-sm text-text-main">{enquiry.name}</p>
                      <p className="text-xs text-text-muted">{enquiry.phone_number} • {enquiry.package_interest}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleWhatsApp(enquiry.name, enquiry.phone_number, enquiry.package_interest)} className="flex items-center text-xs font-semibold bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-1.5 rounded-md transition-colors">
                        <MessageCircle className="w-4 h-4 mr-1.5" />
                        WhatsApp
                      </button>
                      <button onClick={() => handleCall(enquiry.phone_number)} className="flex items-center text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors">
                        <Phone className="w-4 h-4 mr-1.5" />
                        Call
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            to={stat.path}
            data-testid={stat.testId}
            className="bg-white rounded-xl border border-border shadow-sm p-5 hover:shadow-md hover:border-primary/50 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-text-muted mb-2 group-hover:text-primary transition-colors">{stat.title}</p>
                <p className="text-2xl md:text-3xl font-bold text-text-main">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Financial Summary */}
      <div>
        <h2 className="text-xl font-bold text-text-main font-heading mb-4">Financial Summary (This Month)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {financeCards.map((stat) => (
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
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Link
          to="/entry-monitor"
          data-testid="quick-link-monitor"
          className="bg-white rounded-xl border border-border shadow-sm p-5 hover:border-indigo-500/50 hover:shadow-md transition-all"
        >
          <Activity className="w-8 h-8 text-indigo-500 mb-3" />
          <h3 className="font-semibold text-text-main mb-1">Live Entry Monitor</h3>
          <p className="text-sm text-text-muted">Watch real-time biometric access</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
