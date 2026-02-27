import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Phone, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Members = () => {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, expired, expiring
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, statusFilter]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.phone_number.includes(searchQuery)
      );
    }

    // Status filter
    const now = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(now.getDate() + 5);

    if (statusFilter === 'active') {
      filtered = filtered.filter((m) => new Date(m.expiry_date) >= now);
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter((m) => new Date(m.expiry_date) < now);
    } else if (statusFilter === 'expiring') {
      filtered = filtered.filter(
        (m) => new Date(m.expiry_date) >= now && new Date(m.expiry_date) <= fiveDaysFromNow
      );
    }

    setFilteredMembers(filtered);
  };

  const getStatusBadge = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(now.getDate() + 5);

    if (expiry < now) {
      return (
        <span className="bg-red-50 text-status-error border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
          Expired
        </span>
      );
    } else if (expiry <= fiveDaysFromNow) {
      return (
        <span className="bg-yellow-50 text-status-warning border border-yellow-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
          Expiring Soon
        </span>
      );
    }
    return (
      <span className="bg-green-50 text-status-success border border-green-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
        Active
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const badges = {
      Paid: 'bg-green-50 text-status-success border border-green-200',
      Partial: 'bg-yellow-50 text-status-warning border border-yellow-200',
      Pending: 'bg-red-50 text-status-error border border-red-200'
    };
    return (
      <span className={`${badges[status]} px-2.5 py-0.5 rounded-full text-xs font-medium`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-text-muted">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Members</h1>
          <p className="text-text-muted mt-1">{filteredMembers.length} total members</p>
        </div>
        <Link
          to="/members/add"
          data-testid="add-member-button"
          className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone"
              data-testid="search-members"
              className="w-full h-12 pl-12 pr-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'active', 'expiring', 'expired'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                data-testid={`filter-${filter}`}
                className={`px-4 h-12 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white border border-border text-text-muted hover:bg-secondary'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Link
              key={member.id}
              to={`/members/${member.id}`}
              data-testid={`member-card-${member.id}`}
              className="bg-white rounded-xl border border-border shadow-sm p-5 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-text-main text-lg">{member.full_name}</h3>
                {getStatusBadge(member.expiry_date)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-text-muted">
                  <Phone className="w-4 h-4 mr-2" />
                  {member.phone_number}
                </div>
                <div className="flex items-center text-sm text-text-muted">
                  <Calendar className="w-4 h-4 mr-2" />
                  Expires: {format(new Date(member.expiry_date), 'dd MMM yyyy')}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                {getPaymentBadge(member.payment_status)}
                <span className="text-sm text-text-muted">
                  ₹{member.amount_paid} / ₹{member.total_amount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Members;
