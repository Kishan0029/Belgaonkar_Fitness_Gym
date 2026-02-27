import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AddMember = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    package_id: '',
    join_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    amount_paid: '0',
    payment_status: 'Pending',
    assigned_trainer: '',
    date_of_birth: ''
  });

  useEffect(() => {
    fetchPackages();
    if (isEdit) {
      fetchMember();
    }
  }, [id]);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackages(response.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    }
  };

  const fetchMember = async () => {
    try {
      const response = await axios.get(`${API}/members/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const member = response.data;
      setFormData({
        full_name: member.full_name,
        phone_number: member.phone_number,
        package_id: member.package_id,
        join_date: member.join_date.split('T')[0],
        total_amount: member.total_amount.toString(),
        amount_paid: member.amount_paid.toString(),
        payment_status: member.payment_status,
        assigned_trainer: member.assigned_trainer || '',
        date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : ''
      });
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Failed to load member data');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-fill total_amount when package is selected
    if (name === 'package_id') {
      const selectedPackage = packages.find((p) => p.id === value);
      if (selectedPackage) {
        setFormData((prev) => ({
          ...prev,
          total_amount: selectedPackage.price.toString()
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        amount_paid: parseFloat(formData.amount_paid),
        join_date: new Date(formData.join_date).toISOString(),
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : null
      };

      if (isEdit) {
        await axios.patch(`${API}/members/${id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Member updated successfully');
      } else {
        await axios.post(`${API}/members`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Member added successfully');
      }
      navigate('/members');
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error(error.response?.data?.detail || 'Failed to save member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/members')}
          data-testid="back-button"
          className="flex items-center text-text-muted hover:text-text-main mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Members
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">
          {isEdit ? 'Edit Member' : 'Add New Member'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-text-main mb-1.5">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              data-testid="full-name-input"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-text-main mb-1.5">
              Phone Number *
            </label>
            <input
              id="phone_number"
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              required
              data-testid="phone-input"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label htmlFor="package_id" className="block text-sm font-medium text-text-main mb-1.5">
              Package *
            </label>
            <select
              id="package_id"
              name="package_id"
              value={formData.package_id}
              onChange={handleChange}
              required
              data-testid="package-select"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">Select a package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.package_name} ({pkg.duration_days} days) - ₹{pkg.price}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="join_date" className="block text-sm font-medium text-text-main mb-1.5">
              Join Date *
            </label>
            <input
              id="join_date"
              type="date"
              name="join_date"
              value={formData.join_date}
              onChange={handleChange}
              required
              data-testid="join-date-input"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label htmlFor="total_amount" className="block text-sm font-medium text-text-main mb-1.5">
              Total Amount *
            </label>
            <input
              id="total_amount"
              type="number"
              step="0.01"
              name="total_amount"
              value={formData.total_amount}
              onChange={handleChange}
              required
              data-testid="total-amount-input"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="amount_paid" className="block text-sm font-medium text-text-main mb-1.5">
              Amount Paid
            </label>
            <input
              id="amount_paid"
              type="number"
              step="0.01"
              name="amount_paid"
              value={formData.amount_paid}
              onChange={handleChange}
              data-testid="amount-paid-input"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="payment_status" className="block text-sm font-medium text-text-main mb-1.5">
              Payment Status
            </label>
            <select
              id="payment_status"
              name="payment_status"
              value={formData.payment_status}
              onChange={handleChange}
              data-testid="payment-status-select"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div>
            <label htmlFor="assigned_trainer" className="block text-sm font-medium text-text-main mb-1.5">
              Assigned Trainer
            </label>
            <input
              id="assigned_trainer"
              type="text"
              name="assigned_trainer"
              value={formData.assigned_trainer}
              onChange={handleChange}
              data-testid="trainer-input"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Trainer name (optional)"
            />
          </div>

          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-text-main mb-1.5">
              Date of Birth
            </label>
            <input
              id="date_of_birth"
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              data-testid="dob-input"
              className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="flex-1 bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            data-testid="submit-member-button"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5 inline mr-2" />
            {loading ? 'Saving...' : isEdit ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMember;
