import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Applications } from './pages/Applications.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Landing } from './pages/Landing.jsx';
import { Login } from './pages/Login.jsx';
import { ProfileEdit } from './pages/ProfileEdit.jsx';
import { ProjectDetail } from './pages/ProjectDetail.jsx';
import { Register } from './pages/Register.jsx';
import { TeamWorkspace } from './pages/TeamWorkspace.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
    <Route path="/applications" element={<Protected><Applications /></Protected>} />
    <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
    <Route path="/profile" element={<Protected><ProfileEdit /></Protected>} />
    <Route path="/team/:id" element={<Protected><TeamWorkspace /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
