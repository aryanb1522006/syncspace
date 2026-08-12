import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { Landing } from '../pages/ImmersiveLanding.jsx';
import { ProjectRow } from '../components/ProjectRow.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';

const project = {
  id: 1, title: 'GreenGrid', domain: 'Climate Tech', description: 'Turn live campus energy data into actions students can see.',
  deadline: '2026-09-12', teamSize: 4, memberCount: 2,
  skills: [{ id: 1, name: 'React', importance: 'required' }],
  match: { score: 92, breakdown: { contributions: { requiredSkills: 45, preferredSkills: 17, domainInterest: 15, availability: 15 } } }
};

beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });
afterEach(() => { cleanup(); localStorage.clear(); delete document.documentElement.dataset.theme; });

function renderApp(path, user) {
  localStorage.setItem('syncspace-user', JSON.stringify(user));
  localStorage.setItem('syncspace-token', `demo-token-${user.role}`);
  return render(<MemoryRouter initialEntries={[path]}><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></MemoryRouter>);
}

describe('SyncSpace UI', () => {
  it('renders the exact landing offer and primary action', () => {
    render(<MemoryRouter><AuthProvider><Landing /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /Find the project that makes you want to show up\./i })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /explore projects/i })[0]).toHaveAttribute('href', '/register?intent=join');
    expect(screen.getByRole('heading', { level: 2, name: /From idea to working team/i })).toBeVisible();
    expect(screen.getByText('Verified Thapar access')).toBeVisible();
    expect(screen.getByText('Live application status')).toBeVisible();
  });

  it('never hides critical landing content when optional motion APIs are unavailable', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const view = render(<MemoryRouter><AuthProvider><Landing /></AuthProvider></MemoryRouter>);

    try {
      expect(screen.getByRole('banner')).not.toHaveStyle({ opacity: '0' });
      expect(screen.getByRole('heading', { level: 1 })).not.toHaveStyle({ opacity: '0' });
      expect(view.container.querySelector('.constellation-shell')).not.toHaveStyle({ opacity: '0' });
    } finally {
      view.unmount();
      window.matchMedia = originalMatchMedia;
    }
  });

  it('renders a transparent match breakdown', () => {
    render(<MemoryRouter><ProjectRow project={project} defaultOpen /></MemoryRouter>);
    expect(screen.getByText('Why this match')).toBeVisible();
    expect(screen.getByText('Climate Tech interest')).toBeVisible();
    expect(screen.getByText('45/50')).toBeVisible();
  });

  it('shows any authenticated creator their live project management surface', async () => {
    renderApp('/projects/mine', { id: 4, email: 'arjun@northstar.edu', role: 'owner', profile: { id: 4, name: 'Arjun Rao' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Build the right team' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /create project/i }).length).toBeGreaterThan(0);
    expect(await screen.findAllByRole('link', { name: /review applications/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('link', { name: 'Discover' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Applications' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Post a project/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Profile', exact: true })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Arjun Rao arjun@northstar.edu/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Create a project' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Edit' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Delete GreenGrid' })).toBeVisible();
  });

  it('lets students set proficiency and add a skill manually alongside resume import', async () => {
    renderApp('/profile', { id: 1, email: 'isha@northstar.edu', role: 'student', profileId: 1, profile: { id: 1, name: 'Isha Mehta' } });
    const reactLevel = await screen.findByRole('combobox', { name: 'React proficiency' });
    expect(reactLevel).toHaveValue('5');
    fireEvent.change(reactLevel, { target: { value: '4' } });
    expect(await screen.findByText('Skill proficiency updated.')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'React proficiency' })).toHaveValue('4'));

    fireEvent.change(screen.getByRole('combobox', { name: 'Skill' }), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Proficiency' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    expect(await screen.findByText('Skill added manually.')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Node.js proficiency' })).toHaveValue('2');
    expect(screen.getByText('Read resume')).toBeVisible();
  });

  it('lets the project owner edit an existing project', async () => {
    renderApp('/projects/1/edit', { id: 4, email: 'arjun@northstar.edu', role: 'owner', profileId: 4, profile: { id: 4, name: 'Arjun Rao' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Keep the project brief current' })).toBeVisible();
    const name = screen.getByRole('textbox', { name: 'Project name' });
    expect(name).toHaveValue('GreenGrid');
    fireEvent.change(name, { target: { value: 'GreenGrid Campus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'GreenGrid Campus' })).toBeVisible();
  });

  it('blocks non-owners from the project edit form', async () => {
    renderApp('/projects/1/edit', { id: 1, email: 'isha@northstar.edu', role: 'student', profileId: 1, profile: { id: 1, name: 'Isha Mehta' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Project cannot be edited' })).toBeVisible();
    expect(screen.getByText('Only the project owner can edit this project.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('requires confirmation before an owner deletes a project', async () => {
    renderApp('/projects/mine', { id: 4, email: 'arjun@northstar.edu', role: 'owner', profileId: 4, profile: { id: 4, name: 'Arjun Rao' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete GreenGrid' }));
    expect(screen.getByRole('dialog', { name: 'Delete GreenGrid?' })).toBeVisible();
    expect(screen.getByText('This action cannot be undone.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }));
    await waitFor(() => expect(screen.queryByText('GreenGrid')).not.toBeInTheDocument());
  });
  it('shows the personal admin control only to an allowlisted administrator', async () => {
    renderApp('/admin/projects', { id: 11, email: 'abansal6_be24@thapar.edu', role: 'student', profileId: 11, name: 'Aryan Bansal', isAdmin: true });
    expect(await screen.findByRole('heading', { level: 1, name: 'Project control' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Admin control' }).length).toBeGreaterThan(0);
    expect(await screen.findByText('CampusCart')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Admin delete CampusCart' })).toBeVisible();
  });

  it('requires the exact title and a reason before an admin deletes another owner project', async () => {
    renderApp('/admin/projects', { id: 11, email: 'abansal6_be24@thapar.edu', role: 'student', profileId: 11, name: 'Aryan Bansal', isAdmin: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Admin delete CampusCart' }));
    expect(screen.getByRole('dialog', { name: 'Delete project' })).toBeVisible();
    const destructive = screen.getByRole('button', { name: 'Delete permanently' });
    expect(destructive).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Type the project title to confirm' }), { target: { value: 'CampusCart' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason for deletion' }), { target: { value: 'Duplicate pilot listing' } });
    expect(destructive).toBeEnabled();
    fireEvent.click(destructive);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Admin delete CampusCart' })).not.toBeInTheDocument());
    expect(await screen.findByText('Deleted project')).toBeVisible();
  });

  it('does not expose the admin control to an ordinary user', async () => {
    renderApp('/dashboard', { id: 1, email: 'isha@northstar.edu', role: 'student', profileId: 1, profile: { id: 1, name: 'Isha Mehta' }, isAdmin: false });
    expect(await screen.findByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Admin control' })).not.toBeInTheDocument();
  });
  it('persists dark mode from the signed-in navigation', async () => {
    localStorage.setItem('syncspace-theme:v1', 'light');
    renderApp('/dashboard', { id: 1, email: 'isha@northstar.edu', role: 'student', profileId: 1, profile: { id: 1, name: 'Isha Mehta' } });
    fireEvent.click((await screen.findAllByRole('button', { name: /Dark mode/i }))[0]);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('syncspace-theme:v1')).toBe('dark');
  });

  it('shows accepted teammates as authorized project contacts with profile links', async () => {
    renderApp('/projects/1', { id: 1, email: 'isha@northstar.edu', role: 'student', profileId: 1, profile: { id: 1, name: 'Isha Mehta' } });
    expect(await screen.findByRole('heading', { level: 2, name: 'Project contacts' })).toBeVisible();
    expect(screen.getByText('arjun@northstar.edu')).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'View profile' })[0]).toHaveAttribute('href', '/profiles/users/4');
  });

  it('shows authorized contact details and member profile links in the shared workspace', async () => {
    renderApp('/team/1', { id: 1, email: 'isha@northstar.edu', role: 'student', profileId: 1, profile: { id: 1, name: 'Isha Mehta' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'GreenGrid workspace' })).toBeVisible();
    expect(screen.getByText(/arjun@northstar.edu/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /View Arjun Rao's profile/i })).toHaveAttribute('href', '/profiles/users/4');
    expect(screen.getByRole('link', { name: /View Kabir Shah's profile/i })).toHaveAttribute('href', '/profiles/users/2');
  });

  it('opens another accepted teammate profile by stable user id', async () => {
    renderApp('/profiles/users/2', { id: 1, email: 'isha@northstar.edu', role: 'student', profileId: 1, profile: { id: 1, name: 'Isha Mehta' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Kabir Shah' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'kabir@northstar.edu' })).toHaveAttribute('href', 'mailto:kabir@northstar.edu');
    expect(screen.getByText('ML and data collaborator interested in useful campus systems.')).toBeVisible();
    expect(screen.getAllByText('Machine Learning').length).toBeGreaterThan(0);
    expect(screen.queryByText('Profile could not be loaded')).not.toBeInTheDocument();
  });

  it('shows students a live application status and accepted-team navigation', async () => {
    renderApp('/applications', { id: 1, email: 'isha@northstar.edu', role: 'student', profile: { id: 1, name: 'Isha Mehta' } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Your applications' })).toBeVisible();
    expect(await screen.findByText('StudyCircle')).toBeVisible();
    expect(screen.getByText('pending')).toBeVisible();
  });
});
