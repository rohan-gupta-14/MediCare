import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { navbarStyles } from '../assets/dummyStyles';
import logo from '../assets/logo.png';
import { useClerk } from '@clerk/react';

const STORAGE_KEY = "doctorToken_v1";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDoctorLoggedIn, setIsDoctorLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const navRef = useRef(null);
  const clerk = useClerk();
  const navigate = useNavigate();
  
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Doctors", href: "/doctors" },
    { label: "Services", href: "/services" },
    { label: "Appointments", href: "/appointments" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      <div className={navbarStyles.navbarBorder}></div>
      <nav
        className={`${navbarStyles.navbarContainer} ${showNavbar ? navbarStyles.navbarVisible : navbarStyles.navbarHidden}`}
      >
        <div className={navbarStyles.contentWrapper}>
          <div className={navbarStyles.flexContainer}>
            <Link to="/" className={navbarStyles.logoLink}>
              <div className={navbarStyles.logoContainer}>
                <div className={navbarStyles.logoImageWrapper}>
                  <img src={logo} alt="Logo" className={navbarStyles.logoImage} />
                </div>
              </div>
              <div className={navbarStyles.logoTextContainer}>
                <h1 className={navbarStyles.logoTitle}>MediCare</h1>
                <p className={navbarStyles.logoSubtitle}>
                  Healthcare Solutions
                </p>

              </div>
            </Link>
            <div className={navbarStyles.desktopNav}>
              <div className={navbarStyles.navItemsContainer}>
                {navItems.map((item)=> {
                  const isActive = location.pathname === item.href;
                  return(
                    <Link key={item.href} to={item.href}
                    className={`${navbarStyles.navItem} ${
                      isActive ? navbarStyles.navItemActive : navbarStyles.navItemInactive
                    }`}>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;