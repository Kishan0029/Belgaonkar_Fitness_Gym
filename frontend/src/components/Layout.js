import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  UserCheck,
  DollarSign,
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Packages', href: '/packages', icon: Package },
    { name: 'Attendance', href: '/attendance', icon: UserCheck },
    { name: 'Payments', href: '/payments', icon: DollarSign },
    { name: 'Reports', href: '/reports', icon: FileText }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background-subtle">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-border">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex items-center h-16 px-6 border-b border-border">
            <img
              src="https://customer-assets.emergentagent.com/job_870dffc5-d23e-4d9b-9a17-fd80e664523e/artifacts/bpacos33_Belgaonkar%20Fitness%20Gym.png"
              alt="Belgaonkar Fitness"
              className="h-10 object-contain"
            />
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`flex items-center px-4 h-12 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-muted hover:bg-secondary hover:text-text-main'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-border">
            <div className="mb-3">
              <p className="text-sm font-medium text-text-main">{user?.full_name}</p>
              <p className="text-xs text-text-muted capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="flex items-center w-full px-4 h-12 rounded-lg font-medium text-text-muted hover:bg-red-50 hover:text-status-error transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <img
            src="https://customer-assets.emergentagent.com/job_870dffc5-d23e-4d9b-9a17-fd80e664523e/artifacts/bpacos33_Belgaonkar%20Fitness%20Gym.png"
            alt="Belgaonkar Fitness"
            className="h-7 object-contain"
          />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
            className="p-2 rounded-lg hover:bg-secondary"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-border shadow-lg">
            <nav className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href ||
                                (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                    className={`flex items-center px-4 h-12 rounded-lg font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-text-muted hover:bg-secondary hover:text-text-main'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                data-testid="mobile-logout-button"
                className="flex items-center w-full px-4 h-12 rounded-lg font-medium text-text-muted hover:bg-red-50 hover:text-status-error transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
