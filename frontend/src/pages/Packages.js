import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Package as PackageIcon } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Packages = () => {
  const { token, isAdmin } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    package_name: '',
    duration_days: '',
    price: ''
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackages(response.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/packages`,
        {
          package_name: formData.package_name,
          duration_days: parseInt(formData.duration_days),
          price: parseFloat(formData.price)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Package created successfully');
      setShowModal(false);
      setFormData({ package_name: '', duration_days: '', price: '' });
      fetchPackages();
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error(error.response?.data?.detail || 'Failed to create package');
    }
  };

  const handleDelete = async (packageId) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;

    try {
      await axios.delete(`${API}/packages/${packageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Package deleted successfully');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete package');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-text-muted">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Packages</h1>
          <p className="text-text-muted mt-1">Manage gym membership packages</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            data-testid="add-package-button"
            className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Package
          </button>
        )}
      </div>

      {packages.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
          <PackageIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No packages found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              data-testid={`package-card-${pkg.id}`}
              className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center">
                  <PackageIcon className="w-6 h-6 text-primary" />
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    data-testid={`delete-package-${pkg.id}`}
                    className="p-2 text-text-muted hover:text-status-error hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <h3 className="text-xl font-bold text-text-main mb-2">{pkg.package_name}</h3>
              <p className="text-2xl font-bold text-primary mb-3">₹{pkg.price}</p>
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-text-muted">
                  Duration: <span className="font-medium text-text-main">{pkg.duration_days} days</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Package Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-text-main mb-4 font-heading">Add New Package</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Package Name *</label>
                <input
                  type="text"
                  value={formData.package_name}
                  onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                  required
                  data-testid="package-name-input"
                  className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. 1 Month, 3 Months"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Duration (days) *</label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  required
                  data-testid="duration-input"
                  className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  data-testid="price-input"
                  className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-package-button"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Packages;
