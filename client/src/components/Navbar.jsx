import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar navbar-expand navbar-dark bg-primary mb-4">
      <div className="container">
        <Link className="navbar-brand" to="/">
          Clinic Booking
        </Link>

        <div className="navbar-nav me-auto">
          {user?.role === 'patient' && (
            <>
              <NavLink className="nav-link" to="/slots">Open Slots</NavLink>
              <NavLink className="nav-link" to="/my-appointments">My Appointments</NavLink>
            </>
          )}
          {user?.role === 'staff' && (
            <>
              <NavLink className="nav-link" to="/today">Today's Schedule</NavLink>
              <NavLink className="nav-link" to="/manage-slots">Manage Slots</NavLink>
            </>
          )}
        </div>

        <div className="navbar-nav align-items-center">
          {user ? (
            <>
              <span className="navbar-text me-3">{user.name}</span>
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink className="nav-link" to="/login">Login</NavLink>
              <NavLink className="nav-link" to="/register">Register</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}