import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

function App() {
  const { user, token } = useAuthStore();

  const PrivateRoute = ({ children, allowedRole }) => {
    if (!token || !user) {
      return <Navigate to="/login" />;
    }

    if (allowedRole && user.role !== allowedRole) {
      return <Navigate to={user.role === 'doctor' ? '/doctor' : '/patient'} />;
    }

    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={
            token ? (
              <Navigate to={user?.role === 'doctor' ? '/doctor' : '/patient'} />
            ) : (
              <Login />
            )
          } />
          <Route path="/register" element={
            token ? (
              <Navigate to={user?.role === 'doctor' ? '/doctor' : '/patient'} />
            ) : (
              <Register />
            )
          } />
          <Route path="/patient" element={
            <PrivateRoute allowedRole="patient">
              <PatientDashboard />
            </PrivateRoute>
          } />
          <Route path="/doctor" element={
            <PrivateRoute allowedRole="doctor">
              <DoctorDashboard />
            </PrivateRoute>
          } />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
