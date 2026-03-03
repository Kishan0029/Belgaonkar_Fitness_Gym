import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import nextverseLogo from '../assets/nextverse_horizontal.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://customer-assets.emergentagent.com/job_870dffc5-d23e-4d9b-9a17-fd80e664523e/artifacts/bpacos33_Belgaonkar%20Fitness%20Gym.png"
            alt="Belgaonkar Fitness"
            className="h-20 mx-auto mb-6 object-contain"
          />
          <h1 className="text-3xl font-bold text-text-main font-heading mb-2">Welcome Back</h1>
          <p className="text-text-muted">Sign in to manage your gym</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="email-input"
                  className="w-full h-12 pl-12 pr-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-main mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="password-input"
                  className="w-full h-12 pl-12 pr-12 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="w-full bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col items-center justify-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Developed By</p>
          <a href="https://gonextverse.in" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center space-y-2.5 transition-transform hover:scale-105">
            <img src={nextverseLogo} alt="Nextverse" className="h-9 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
            <span className="text-sm font-medium text-primary opacity-80 group-hover:opacity-100 transition-all group-hover:underline">gonextverse.in</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
