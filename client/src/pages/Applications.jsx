import { Clock3, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../components/AppShell.jsx';
import { Button } from '../components/Button.jsx';

export function Applications() {
  return <AppShell><header className="page-header"><div><h1>Your applications</h1><p>Keep track of the projects you’ve raised your hand for.</p></div></header><div className="application-list"><article><span className="project-emblem project-emblem--lavender">SC</span><div><h2>StudyCircle</h2><p>EdTech · Applied 10 Aug</p></div><span className="status status--pending"><Clock3 />Pending</span><Button to="/projects/2" variant="secondary">View project</Button></article><div className="empty-inline"><CheckCircle2 /><div><h3>You’re all caught up</h3><p>When you apply to another project, its status will appear here.</p></div></div></div></AppShell>;
}
