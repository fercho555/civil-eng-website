import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';  // adjust path if needed


function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const Navigate = useNavigate();
  // Show Start tab only if user is logged in and NOT already on /start page
  const showStart = user && location.pathname !== '/start';
 // console.log('Current user in Navbar:', user);

 const handleLogout = () => {
    logout();
    Navigate('/login');
    setMenuOpen(false);
 };

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">CiviSpec</h1>

        {/* Desktop Menu */}
        <ul className="hidden md:flex space-x-6">
          <li><Link to="/" className="hover:underline">Home</Link></li>
          <li><Link to="/about" className="hover:underline">About</Link></li>
          <li><Link to="/services" className="hover:underline">Services</Link></li>
          <li><Link to="/contact" className="hover:underline">Contact</Link></li>
          <li><Link to="/pricing" className="hover:underline">Pricing</Link></li>
          {user?.role === 'admin' && (
            <li><Link to="/admin" className="hover:underline">Admin</Link></li>
          )}

          {showStart && (
            <li>
              <Link to="/start" className="hover:underline text-yellow-300 font-semibold">Start</Link>
            </li>
          )}

           {user ? (
            <li>
              <button
                onClick={handleLogout}
                className="ml-4 px-3 py-1 bg-red-600 rounded hover:bg-red-700"
              >
                Logout ({user.username})
              </button>
            </li>
          ) : (
            <>
              <li>
                <Link
                  to="/login"
                  className="ml-4 px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-white"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="ml-4 px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-700 text-white"
                >
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
                

        {/* Mobile Menu Toggle Button */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu Items */}
      {menuOpen && (
        <>
          <ul className="md:hidden px-4 pb-4 space-y-2 bg-gray-700">
            <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
            <li><Link to="/about" onClick={() => setMenuOpen(false)}>About</Link></li>
            <li><Link to="/services" onClick={() => setMenuOpen(false)}>Services</Link></li>
            <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link></li>
            <li><Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link></li>
            {user?.role === 'admin' && (
              <li><Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link></li>
            )}

            {showStart && (
              <li>
                <Link to="/start" onClick={() => setMenuOpen(false)} className="text-yellow-300 font-semibold">Start</Link>
              </li>
            )}
          </ul>

          {!user && (
            <Link
              to="/login"
              className="ml-4 px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-white"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          )}

          {user && (
            <button
              onClick={handleLogout}
              className="ml-4 px-3 py-1 bg-red-600 rounded hover:bg-red-700"
            >
              Logout ({user.username})
            </button>
          )}

          {/* LOGIN/LOGOUT buttons for mobile here */}
          <div className="md:hidden px-4 pb-4">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-white"
              >
                Logout ({user.username})
              </button>
            ) : (
              <Link
                to="/login"
                className="w-full px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-white block text-center"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </>
      )}
    </nav>
  );
}

export default Navbar;