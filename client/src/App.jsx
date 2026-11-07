import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import OpenSlotsPage from './pages/OpenSlotsPage.jsx';
import MyAppointmentsPage from './pages/MyAppointmentsPage.jsx';
import TodaySchedulePage from './pages/TodaySchedulePage.jsx';
import ManageSlotsPage from './pages/ManageSlotsPage.jsx';

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'staff' ? '/today' : '/slots'} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/slots"
            element={
              <ProtectedRoute roles={['patient']}>
                <OpenSlotsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <ProtectedRoute roles={['patient']}>
                <MyAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/today"
            element={
              <ProtectedRoute roles={['staff']}>
                <TodaySchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-slots"
            element={
              <ProtectedRoute roles={['staff']}>
                <ManageSlotsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<h2>Page not found</h2>} />
        </Routes>
      </div>
    </>
  );
}