import { ArrowRight, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(() => api.listTeams()
    .then(({ teams: rows }) => { setTeams(rows); setError(''); })
    .catch((reason) => setError(reason.message))
    .finally(() => setLoading(false)), []);
  useEffect(() => { refresh(); }, [refresh]);

  return <AppShell>
    <header className="page-header"><div><span className="eyebrow">Collaboration</span><h1>{teams.length === 1 ? 'Your team workspace' : 'Your team workspaces'}</h1><p>Only teams you own or have joined appear here.</p></div></header>
    {loading ? <div className="loading">Finding your teams…</div> : error ? <div className="empty-panel"><h2>Teams could not be loaded</h2><p>{error}</p><Button onClick={refresh}>Try again</Button></div> : <div className="team-list">
      {teams.map((team) => <article className="team-card" key={team.id}><span className="project-emblem"><UsersRound /></span><div><span className="tag">{team.domain}</span><h2>{team.projectTitle}</h2><p>{team.memberCount} of {team.teamSize} members · {team.projectStatus}</p></div><Button to={`/team/${team.id}`}>Open workspace <ArrowRight /></Button></article>)}
      {teams.length === 0 && <div className="empty-panel"><UsersRound /><h2>No active team yet</h2><p>{user?.role === 'owner' ? 'A workspace appears as soon as you accept the first student application.' : 'A workspace appears here as soon as a project owner accepts your application.'}</p><Button to={user?.role === 'owner' ? '/dashboard' : '/applications'}>{user?.role === 'owner' ? 'View my projects' : 'Track applications'}</Button></div>}
    </div>}
  </AppShell>;
}
