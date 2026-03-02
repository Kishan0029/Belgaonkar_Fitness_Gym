import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { AlertCircle, UserX, Clock, MessageCircle, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Reports = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'expiring';

  const [expiringMembers, setExpiringMembers] = useState([]);
  const [inactiveMembers, setInactiveMembers] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [expiringRes, inactiveRes, pendingRes] = await Promise.all([
        axios.get(`${API}/dashboard/expiring-members`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/dashboard/inactive-members`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/dashboard/pending-payments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setExpiringMembers(expiringRes.data);
      setInactiveMembers(inactiveRes.data);
      setPendingPayments(pendingRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const generateWhatsAppLink = (member, type) => {
    const phone = member.phone_number.replace(/[^0-9]/g, '');
    const phoneWithCode = phone.startsWith('91') ? phone : `91${phone}`;

    let message = '';
    if (type === 'expiry') {
      message = `Hi ${member.full_name}, your gym membership at Belgaonkar Fitness expires on ${format(
        new Date(member.expiry_date),
        'dd MMM yyyy'
      )}. Please renew soon to continue your fitness journey!`;
    } else if (type === 'inactive') {
      message = `Hi ${member.full_name}, we miss you at Belgaonkar Fitness! It's been a while since your last visit. Come back and continue your fitness journey with us!`;
    } else if (type === 'payment') {
      const pending = member.total_amount - member.amount_paid;
      message = `Hi ${member.full_name}, your pending payment for Belgaonkar Fitness is ₹${pending.toFixed(
        2
      )}. Please clear the dues at your earliest convenience.`;
    }

    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
  };

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-text-muted">Loading reports...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'expiring', label: 'Expiring Soon', count: expiringMembers.length, icon: AlertCircle },
    { id: 'inactive', label: 'Inactive Members', count: inactiveMembers.length, icon: UserX },
    { id: 'pending', label: 'Pending Payments', count: pendingPayments.length, icon: Clock }
  ];

  const MemberCard = ({ member, type }) => {
    const pendingAmount = member.total_amount - member.amount_paid;
    const daysUntilExpiry = Math.ceil(
      (new Date(member.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div
        data-testid={`report-member-${member.id}`}
        className="bg-white rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Link
              to={`/members/${member.id}`}
              className="font-semibold text-text-main hover:text-primary transition-colors"
            >
              {member.full_name}
            </Link>
            <div className="flex items-center text-sm text-text-muted mt-1">
              <Phone className="w-4 h-4 mr-1" />
              {member.phone_number}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {type === 'expiring' && (
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-status-warning" />
              <span className="text-text-muted">
                Expires in <span className="font-medium text-status-warning">{daysUntilExpiry} days</span>
              </span>
            </div>
          )}
          {type === 'inactive' && member.last_visit_date && (
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-text-muted" />
              <span className="text-text-muted">
                Last visit: {format(new Date(member.last_visit_date), 'dd MMM yyyy')}
              </span>
            </div>
          )}
          {type === 'pending' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Pending:</span>
              <span className="text-lg font-bold text-status-error">₹{pendingAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        <a
          href={generateWhatsAppLink(member, type)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`whatsapp-${member.id}`}
          className="flex items-center justify-center w-full bg-green-50 text-status-success border border-green-200 hover:bg-green-100 h-11 px-4 rounded-lg font-medium transition-colors"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Send WhatsApp
        </a>
        <a
          href={`tel:${member.phone_number}`}
          data-testid={`call-${member.id}`}
          className="flex items-center justify-center w-full bg-blue-50 text-status-info border border-blue-200 hover:bg-blue-100 h-11 px-4 rounded-lg font-medium transition-colors mt-2"
        >
          <Phone className="w-4 h-4 mr-2" />
          Call Now
        </a>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Reports</h1>
        <p className="text-text-muted mt-1">Member insights and follow-ups</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-x-auto">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary-light'
                  : 'border-transparent text-text-muted hover:text-text-main hover:bg-background-subtle'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'expiring' && (
          <div>
            {expiringMembers.length === 0 ? (
              <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
                <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted">No members expiring in the next 5 days</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiringMembers.map((member) => (
                  <MemberCard key={member.id} member={member} type="expiry" />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inactive' && (
          <div>
            {inactiveMembers.length === 0 ? (
              <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
                <UserX className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted">No inactive members</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveMembers.map((member) => (
                  <MemberCard key={member.id} member={member} type="inactive" />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            {pendingPayments.length === 0 ? (
              <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
                <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted">No pending payments</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingPayments.map((member) => (
                  <MemberCard key={member.id} member={member} type="payment" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
