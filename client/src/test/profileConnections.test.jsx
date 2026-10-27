import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { api } from '../api/resources.js';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function show(path = '/profile') {
  localStorage.setItem('syncspace-user', JSON.stringify({ id: 1, email: 'isha@northstar.edu', role: 'student', profile: { id: 1, name: 'Isha Mehta' } }));
  localStorage.setItem('syncspace-token', 'demo-token-student');
  return render(<MemoryRouter initialEntries={[path]}><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></MemoryRouter>);
}

it('saves optional profile links and an explicit audience, then displays them on the owner profile', async () => {
  const view = show();
  const github = await screen.findByLabelText('GitHub profile URL');
  expect(screen.getByLabelText('Who can see my links and portfolio')).toHaveValue('private');
  fireEvent.change(github, { target: { value: 'https://github.com/isha' } });
  fireEvent.change(screen.getByLabelText('LinkedIn profile URL'), { target: { value: 'https://www.linkedin.com/in/isha' } });
  fireEvent.change(screen.getByLabelText('Who can see my links and portfolio'), { target: { value: 'college' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(await screen.findByText('Profile saved.')).toBeVisible();
  view.unmount();
  show('/profiles/users/1');
  expect(await screen.findByRole('link', { name: /GitHub User-provided link/ })).toHaveAttribute('href', 'https://github.com/isha');
  expect(screen.getByRole('link', { name: /LinkedIn User-provided link/ })).toHaveAttribute('rel', 'noopener noreferrer');
});

it('requires review before sample data changes the profile and preserves unselected fields', async () => {
  show();
  const bio = await screen.findByLabelText('Bio');
  const originalBio = bio.value;
  fireEvent.click(await screen.findByRole('button', { name: 'Try sample GitHub import' }));
  expect(await screen.findByText('Import preview refreshed. Your saved profile has not changed.')).toBeVisible();
  expect(bio).toHaveValue(originalBio);
  fireEvent.click(screen.getByRole('button', { name: 'Review GitHub import' }));
  expect(screen.getByRole('region', { name: 'GitHub import review' })).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox', { name: /Use GitHub bio/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Hello-World Sample/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Python Seen in/ }));
  fireEvent.change(screen.getByLabelText('Python imported proficiency'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save reviewed import' }));
  expect(await screen.findByText('Your reviewed import was saved.')).toBeVisible();
  expect(screen.getByLabelText('Full name')).toHaveValue('Isha Mehta');
  expect(screen.getByLabelText('Bio')).toHaveValue('I build useful tools with TypeScript and Python.');
  expect(screen.getByLabelText('Python proficiency')).toHaveValue('2');
  expect(screen.getByLabelText('TypeScript proficiency')).toHaveValue('4');
  const { student } = await api.getMe();
  expect(student.portfolio).toHaveLength(1);
});

it('allows a preview to be cancelled and explains disabled provider setup', async () => {
  show();
  expect(await screen.findByRole('button', { name: 'Connect LinkedIn' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Try sample GitHub import' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Review GitHub import' }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Use GitHub name/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));
  expect(screen.queryByRole('region', { name: 'GitHub import review' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Full name')).toHaveValue('Isha Mehta');
});

it('protects unsaved edits and requires an explicit disconnect choice', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Try sample GitHub import' }));
  const disconnect = await screen.findByRole('button', { name: 'Disconnect GitHub' });
  fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'My unsaved bio' } });
  expect(disconnect).toBeDisabled();
  expect(screen.getByText(/Save your profile changes above/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() => expect(disconnect).toBeEnabled());
  fireEvent.click(disconnect);
  expect(screen.getByRole('dialog', { name: 'Disconnect GitHub?' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Keep connected' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(disconnect);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect' }));
  expect(await screen.findByText('Account disconnected.')).toBeVisible();
  expect(screen.getByLabelText('Bio')).toHaveValue('My unsaved bio');
});

it('shows failed refreshes without losing the saved profile', async () => {
  vi.spyOn(api, 'refreshConnection').mockRejectedValueOnce(new Error('The provider is limiting requests. Please try again later.'));
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Try sample GitHub import' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The provider is limiting requests.');
  expect(screen.getByLabelText('Full name')).toHaveValue('Isha Mehta');
});

it('rejects callback completion when the browser transaction is missing', async () => {
  const complete = vi.spyOn(api, 'completeConnection');
  show('/profile?connection=11111111-1111-4111-8111-111111111111');
  expect(await screen.findByRole('alert')).toHaveTextContent('expired or was started in another browser');
  expect(complete).not.toHaveBeenCalled();
});
