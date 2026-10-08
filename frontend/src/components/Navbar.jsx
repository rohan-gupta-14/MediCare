import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { User, Menu, X } from 'lucide-react';
import logo from '../assets/logo.png';

// navbarStyles defined locally since dummyStyles.js does not yet export them
const navbarStyles = {
  navbarBorder: 'fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-50',
  navbarContainer: 'fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-sm transition-all duration-300',
  navbarVisible: 'translate-y-0',
  navbarHidden: '-translate-y-full',
  contentWrapper: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  flexContainer: 'flex items-center justify-between h-16',
  logoLink: 'flex items-center gap-3 text-decoration-none',
  logoContainer: 'flex items-center gap-3',
  logoImageWrapper: 'w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-300 shadow-sm',
  logoImage: 'w-full h-full object-cover',
  logoTextContainer: 'flex flex-col leading-tight',
  logoTitle: 'text-xl font-bold text-emerald-700 tracking-tight',
  logoSubtitle: 'text-[10px] text-emerald-500 font-medium uppercase tracking-widest',
  desktopNav: 'hidden md:flex',
  navItemsContainer: 'flex items-center gap-1',
  navItem: 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
  navItemActive: 'bg-emerald-100 text-emerald-700',
  navItemInactive: 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700',
  rightContainer: 'flex items-center gap-3',
  loginButton: 'flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 shadow-sm hover:shadow-md',
  loginIcon: 'w-4 h-4',
  mobileToggle: 'md:hidden p-2 rounded-full text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all',
  toggleIcon: 'w-5 h-5',
  mobileMenu: 'md:hidden bg-white border-t border-emerald-100 px-4 py-4 space-y-1',
  mobileNavItem: 'block px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
  mobileNavItemActive: 'bg-emerald-100 text-emerald-700',
  mobileNavItemInactive: 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700',
  mobileLoginButton: 'mt-3 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200',
};

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Doctors', href: '/doctors' },
  { label: 'Services', href: '/services' },
  { label: 'Appointments', href: '/appointments' },
  { label: 'Contact', href: '/contact' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLoginClick = () => {
    // Will be wired to auth flow in Phase 07
    navigate('/login');
  };

  return (
    <>
      <div className={navbarStyles.navbarBorder}></div>
      <nav className={navbarStyles.navbarContainer}>
        <div className={navbarStyles.contentWrapper}>
          <div className={navbarStyles.flexContainer}>

            {/* Logo */}
            <Link to="/" className={navbarStyles.logoLink}>
              <div className={navbarStyles.logoContainer}>
                <div className={navbarStyles.logoImageWrapper}>
                  <img src={logo} alt="MediCare Logo" className={navbarStyles.logoImage} />
                </div>
              </div>
              <div className={navbarStyles.logoTextContainer}>
                <h1 className={navbarStyles.logoTitle}>MediCare</h1>
                <p className={navbarStyles.logoSubtitle}>Healthcare Solutions</p>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className={navbarStyles.desktopNav}>
              <div className={navbarStyles.navItemsContainer}>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`${navbarStyles.navItem} ${
                        isActive ? navbarStyles.navItemActive : navbarStyles.navItemInactive
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Side */}
            <div className={navbarStyles.rightContainer}>
              <button
                onClick={handleLoginClick}
                className={navbarStyles.loginButton}
              >
                <User className={navbarStyles.loginIcon} />
                Login
              </button>

              {/* Mobile Toggle */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={navbarStyles.mobileToggle}
                aria-label="Toggle mobile menu"
              >
                {isOpen ? (
                  <X className={navbarStyles.toggleIcon} />
                ) : (
                  <Menu className={navbarStyles.toggleIcon} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className={navbarStyles.mobileMenu}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`${navbarStyles.mobileNavItem} ${
                    isActive ? navbarStyles.mobileNavItemActive : navbarStyles.mobileNavItemInactive
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => { setIsOpen(false); handleLoginClick(); }}
              className={navbarStyles.mobileLoginButton}
            >
              <User className="w-4 h-4" />
              Login
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;