import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Applications } from './pages/Applications.jsx';
import { CreateProject } from './pages/CreateProject.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Landing } from './pages/Landing.jsx';
import { Login } from './pages/Login.jsx';
import { OwnerApplications } from './pages/OwnerApplications.jsx';
import { ProfileEdit } from './pages/ProfileEdit.jsx';
import { ProjectDetail } from './pages/ProjectDetail.jsx';
import { Register } from './pages/Register.jsx';
import { Teams } from './pages/Teams.jsx';
import { TeamWorkspace } from './pages/TeamWorkspace.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RoleProtected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === role ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
    <Route path="/applications" element={<RoleProtected role="student"><Applications /></RoleProtected>} />
    <Route path="/projects/new" element={<RoleProtected role="owner"><CreateProject /></RoleProtected>} />
    <Route path="/projects/:id/applications" element={<RoleProtected role="owner"><OwnerApplications /></RoleProtected>} />
    <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
    <Route path="/profile" element={<Protected><ProfileEdit /></Protected>} />
    <Route path="/teams" element={<Protected><Teams /></Protected>} />
    <Route path="/team/:id" element={<Protected><TeamWorkspace /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
