import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App.jsx';
import { Landing } from '../pages/Landing.jsx';
import { ProjectRow } from '../components/ProjectRow.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

const project = {
  id: 1, title: 'GreenGrid', domain: 'Climate Tech', description: 'Turn live campus energy data into actions students can see.',
  deadline: '2026-09-12', teamSize: 4, memberCount: 2,
  skills: [{ id: 1, name: 'React', importance: 'required' }],
  match: { score: 92, breakdown: { contributions: { requiredSkills: 45, preferredSkills: 17, domainInterest: 15, availability: 15 } } }
};

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

function renderApp(path, user) {
  localStorage.setItem('syncspace-user', JSON.stringify(user));
  localStorage.setItem('syncspace-token', `demo-token-${user.role}`);
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
}

describe('SyncSpace UI', () => {
  it('renders the exact landing offer and primary action', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /The right project\. The teammates you’re missing\./i })).toBeVisible();
    expect(screen.getByRole('link', { name: /explore projects/i })).toHaveAttribute('href', '/register');
  });

  it('renders a transparent match breakdown', () => {
    render(<MemoryRouter><ProjectRow project={project} defaultOpen /></MemoryRouter>);
    expect(screen.getByText('Why this match')).toBeVisible();
    expect(screen.getByText('Climate Tech interest')).toBeVisible();
    expect(screen.getByText('45/50')).toBeVisible();
  });

  it('shows project owners their live project management surface', async () => {
    renderApp('/dashboard', { id: 4, email: 'arjun@northstar.edu', role: 'owner', profile: { id: 4, name: 'Arjun Rao' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Build the right team' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /create project/i }).length).toBeGreaterThan(0);
    expect(await screen.findAllByRole('link', { name: /review applications/i })).not.toHaveLength(0);
  });

  it('shows students a live application status and accepted-team navigation', async () => {
    renderApp('/applications', { id: 1, email: 'isha@northstar.edu', role: 'student', profile: { id: 1, name: 'Isha Mehta' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Your applications' })).toBeVisible();
    expect(await screen.findByText('StudyCircle')).toBeVisible();
    expect(screen.getByText('pending')).toBeVisible();
  });
});
