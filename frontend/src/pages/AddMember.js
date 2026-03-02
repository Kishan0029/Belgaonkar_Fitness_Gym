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
    membership_start_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    discount_amount: '0',
    amount_paid: '0',
    payment_status: 'Pending',
    assigned_trainer: '',
    date_of_birth: '',
    pt_plan: '',
    pt_price: '0'
  });

  const [packagePrice, setPackagePrice] = useState(0);

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
        membership_start_date: member.membership_start_date?.split('T')[0] || member.join_date.split('T')[0],
        total_amount: member.total_amount.toString(),
        discount_amount: (member.discount_amount || 0).toString(),
        amount_paid: member.amount_paid.toString(),
        payment_status: member.payment_status,
        assigned_trainer: member.assigned_trainer || '',
        date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
        pt_plan: member.pt_plan || '',
        pt_price: (member.pt_price || 0).toString()
      });
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Failed to load member data');
    }
  };

  const calculateTotal = (pkgPrice, discount, ptPrice) => {
    const pkg = parseFloat(pkgPrice) || 0;
    const disc = parseFloat(discount) || 0;
    const pt = parseFloat(ptPrice) || 0;
    return pkg - disc + pt;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-fill package price when package is selected
      if (name === 'package_id') {
        const selectedPackage = packages.find((p) => p.id === value);
        if (selectedPackage) {
          setPackagePrice(selectedPackage.price);
          const total = calculateTotal(selectedPackage.price, updated.discount_amount, updated.pt_price);
          updated.total_amount = total.toString();
        }
      }

      // Handle PT plan change
      if (name === 'pt_plan') {
        if (value === 'alternate_day') {
          updated.pt_price = '4000';
        } else if (value === 'daily') {
          updated.pt_price = '6000';
        } else {
          updated.pt_price = '0';
        }
        const total = calculateTotal(packagePrice, updated.discount_amount, updated.pt_price);
        updated.total_amount = total.toString();
      }

      // Recalculate total when discount changes
      if (name === 'discount_amount') {
        const total = calculateTotal(packagePrice, value, updated.pt_price);
        updated.total_amount = total.toString();
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        discount_amount: parseFloat(formData.discount_amount),
        amount_paid: parseFloat(formData.amount_paid),
        pt_price: parseFloat(formData.pt_price),
        join_date: new Date(formData.join_date).toISOString(),
        membership_start_date: new Date(formData.membership_start_date).toISOString(),
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : null,
        pt_plan: formData.pt_plan || null
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

  const finalAmount = parseFloat(formData.total_amount) || 0;
  const discountAmt = parseFloat(formData.discount_amount) || 0;
  const ptAmt = parseFloat(formData.pt_price) || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Basic Information</h2>
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
          </div>
        </div>

        {/* Package & Membership Details */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Package & Membership</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <label htmlFor="discount_amount" className="block text-sm font-medium text-text-main mb-1.5">
                Discount Amount
              </label>
              <input
                id="discount_amount"
                type="number"
                step="0.01"
                name="discount_amount"
                value={formData.discount_amount}
                onChange={handleChange}
                data-testid="discount-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="join_date" className="block text-sm font-medium text-text-main mb-1.5">
                Payment Date *
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
              <label htmlFor="membership_start_date" className="block text-sm font-medium text-text-main mb-1.5">
                Membership Start Date *
              </label>
              <input
                id="membership_start_date"
                type="date"
                name="membership_start_date"
                value={formData.membership_start_date}
                onChange={handleChange}
                required
                data-testid="membership-start-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Personal Training */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Personal Training (PT)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="pt_plan" className="block text-sm font-medium text-text-main mb-1.5">
                PT Plan
              </label>
              <select
                id="pt_plan"
                name="pt_plan"
                value={formData.pt_plan}
                onChange={handleChange}
                data-testid="pt-plan-select"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">No PT</option>
                <option value="alternate_day">Alternate Day Training - ₹4,000/month</option>
                <option value="daily">Daily Training - ₹6,000/month</option>
              </select>
            </div>

            {formData.pt_plan && (
              <div>
                <label htmlFor="pt_price" className="block text-sm font-medium text-text-main mb-1.5">
                  PT Price (auto-filled)
                </label>
                <input
                  id="pt_price"
                  type="number"
                  step="0.01"
                  name="pt_price"
                  value={formData.pt_price}
                  readOnly
                  className="w-full h-12 px-4 rounded-lg border border-border bg-gray-100 text-base"
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-primary-light border border-primary/20 rounded-lg p-5">
          <h3 className="font-semibold text-text-main mb-3">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Package Price:</span>
              <span className="font-medium">₹{packagePrice.toFixed(2)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-status-error">
                <span>Discount:</span>
                <span className="font-medium">-₹{discountAmt.toFixed(2)}</span>
              </div>
            )}
            {ptAmt > 0 && (
              <div className="flex justify-between text-primary">
                <span>PT Charges:</span>
                <span className="font-medium">+₹{ptAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-text-main pt-2 border-t border-primary/20">
              <span>Total Amount:</span>
              <span>₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="total_amount" className="block text-sm font-medium text-text-main mb-1.5">
                Total Amount (auto-calculated)
              </label>
              <input
                id="total_amount"
                type="number"
                step="0.01"
                name="total_amount"
                value={formData.total_amount}
                readOnly
                className="w-full h-12 px-4 rounded-lg border border-border bg-gray-100 text-base"
              />
            </div>

            <div>
              <label htmlFor="amount_paid" className="block text-sm font-medium text-text-main mb-1.5">
                Amount Paid Now
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
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-border">
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
