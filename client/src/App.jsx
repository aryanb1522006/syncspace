import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Applications } from './pages/Applications.jsx';
import { CreateProject } from './pages/CreateProject.jsx';
import { EditProject } from './pages/EditProject.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Login } from './pages/Login.jsx';
import { MemberProfile } from './pages/MemberProfile.jsx';
import { OwnerDashboard } from './pages/OwnerDashboard.jsx';
import { OwnerApplications } from './pages/OwnerApplications.jsx';
import { ProfileEdit } from './pages/ProfileEdit.jsx';
import { ProjectDetail } from './pages/ProjectDetail.jsx';
import { Register } from './pages/Register.jsx';
import { Teams } from './pages/Teams.jsx';
import { TeamWorkspace } from './pages/TeamWorkspace.jsx';
const Landing = lazy(() => import('./pages/ImmersiveLanding.jsx').then((module) => ({ default: module.Landing })));


function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}


export default function App() {
  return <Routes>
    <Route path="/" element={<Suspense fallback={<div className="landing-loading">Loading SyncSpace...</div>}><Landing /></Suspense>} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
    <Route path="/applications" element={<Protected><Applications /></Protected>} />
    <Route path="/projects/mine" element={<Protected><OwnerDashboard /></Protected>} />
    <Route path="/projects/new" element={<Protected><CreateProject /></Protected>} />
    <Route path="/projects/:id/edit" element={<Protected><EditProject /></Protected>} />
    <Route path="/projects/:id/applications" element={<Protected><OwnerApplications /></Protected>} />
    <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
    <Route path="/profile" element={<Protected><ProfileEdit /></Protected>} />
    <Route path="/profiles/users/:userId" element={<Protected><MemberProfile /></Protected>} />
    <Route path="/profiles/:id" element={<Protected><MemberProfile /></Protected>} />
    <Route path="/teams" element={<Protected><Teams /></Protected>} />
    <Route path="/team/:id" element={<Protected><TeamWorkspace /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
