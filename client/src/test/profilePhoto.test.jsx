import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';
import { ProfileEdit } from '../pages/ProfileEdit.jsx';
import { api } from '../api/resources.js';

vi.mock('../api/resources.js', () => ({ demoMode: false, api: {
  getMe: vi.fn(), listSkills: vi.fn(), listTeams: vi.fn(), notifications: vi.fn(),
  integrations: vi.fn(), linkedinUseDetails: vi.fn(), linkedinDisconnect: vi.fn()
} }));

const photo = 'https://media.licdn.com/dms/fixture-photo';
let student, connected;
const overview = () => ({ github: { configured: false, connection: null }, linkedin: { configured: true, connection: null, account: connected ? { name: 'LinkedIn Name', pictureUrl: photo } : null }, skills: [] });
const show = () => render(<MemoryRouter><AuthProvider><ProfileEdit /></AuthProvider></MemoryRouter>);
const account = () => within(document.querySelector('.sidebar__account'));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  student = { id: 1, user_id: 1, name: 'Isha Mehta', department: 'Computer Science', year: 3, bio: 'Saved bio', interests: [], availability_hours_per_week: 12, avatar_url: null, avatar_source: null, skills: [] };
  connected = true;
  localStorage.setItem('syncspace-token', 'test-session');
  localStorage.setItem('syncspace-user', JSON.stringify({ id: 1, role: 'student', email: 'isha@northstar.edu', isAdmin: false, profile: { id: 1, name: 'Isha Mehta' } }));
  api.getMe.mockImplementation(async () => ({ student: { ...student } }));
  api.listSkills.mockResolvedValue({ skills: [] });
  api.listTeams.mockResolvedValue({ teams: [] });
  api.notifications.mockResolvedValue({ notifications: [] });
  api.integrations.mockImplementation(async () => overview());
  api.linkedinUseDetails.mockImplementation(async (fields) => {
    student = { ...student, ...(fields.includes('photo') ? { avatar_url: photo, avatar_source: 'linkedin' } : {}), ...(fields.includes('name') ? { name: 'LinkedIn Name' } : {}) };
    return { student: { ...student } };
  });
  api.linkedinDisconnect.mockImplementation(async () => { student = { ...student, avatar_url: null, avatar_source: null }; connected = false; return overview(); });
});
afterEach(() => { cleanup(); localStorage.clear(); });

it('shows an already saved photo in the sidebar and own profile when the page loads', async () => {
  student.avatar_url = photo;
  student.avatar_source = 'linkedin';
  show();
  expect(await account().findByRole('img', { name: "Isha Mehta's profile photo" })).toHaveAttribute('src', photo);
  expect(screen.getByRole('img', { name: 'Your profile photo' })).toHaveAttribute('src', photo);
});

it('applies only the selected photo immediately, preserves college identity and keeps it after remount', async () => {
  show();
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Use photo on my college profile' }));
  fireEvent.click(screen.getByRole('button', { name: 'Use selected details' }));
  expect(await account().findByRole('img', { name: "Isha Mehta's profile photo" })).toHaveAttribute('src', photo);
  expect(api.linkedinUseDetails).toHaveBeenCalledWith(['photo']);
  await waitFor(() => expect(JSON.parse(localStorage.getItem('syncspace-user')).profile.avatar_url).toBe(photo));
  expect(JSON.parse(localStorage.getItem('syncspace-user'))).toMatchObject({ id: 1, email: 'isha@northstar.edu', isAdmin: false, profile: { name: 'Isha Mehta' } });
  expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Isha Mehta');
  cleanup();
  show();
  expect(await account().findByRole('img', { name: "Isha Mehta's profile photo" })).toHaveAttribute('src', photo);
});

it('removes a disconnected photo immediately without losing unsaved about-you edits', async () => {
  student.avatar_url = photo;
  student.avatar_source = 'linkedin';
  show();
  await screen.findByRole('button', { name: 'Disconnect account' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Bio' }), { target: { value: 'Unsaved bio' } });
  fireEvent.click(screen.getByRole('button', { name: 'Disconnect account' }));
  await waitFor(() => expect(account().queryByRole('img')).not.toBeInTheDocument());
  expect(screen.queryByRole('img', { name: 'Your profile photo' })).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Bio' })).toHaveValue('Unsaved bio');
  expect(account().getByText('IM')).toBeVisible();
  await waitFor(() => expect(JSON.parse(localStorage.getItem('syncspace-user')).profile.avatar_url).toBeNull());
});

it('falls back to initials for a failed image and tries a changed photo URL', () => {
  const view = render(<ProfileAvatar name="Isha Mehta" photoUrl={photo} />);
  const image = screen.getByRole('img', { name: "Isha Mehta's profile photo" });
  expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
  fireEvent.error(image);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByText('IM')).toBeVisible();
  view.rerender(<ProfileAvatar name="Isha Mehta" photoUrl={`${photo}-new`} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', `${photo}-new`);
});

it('keeps a freshly saved photo when an older session refresh response arrives late', async () => {
  let finishRefresh;
  api.getMe.mockImplementation(() => new Promise((resolve) => { finishRefresh = resolve; }));
  function ProfileProbe() {
    const { user, syncProfile } = useAuth();
    return <><button onClick={() => syncProfile({ ...student, avatar_url: photo })}>Save photo</button><ProfileAvatar name={user.profile.name} photoUrl={user.profile.avatar_url} /></>;
  }
  render(<AuthProvider><ProfileProbe /></AuthProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  expect(screen.getByRole('img')).toHaveAttribute('src', photo);
  await act(async () => { finishRefresh({ student: { ...student, avatar_url: null } }); });
  expect(screen.getByRole('img')).toHaveAttribute('src', photo);
  expect(JSON.parse(localStorage.getItem('syncspace-user')).profile.avatar_url).toBe(photo);
});
