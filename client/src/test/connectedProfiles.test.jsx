import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Live-mode behaviour with the API mocked; demo mode is covered by the
// profile page test in ui.test.jsx.
vi.mock('../api/resources.js', () => ({
  demoMode: false,
  api: {
    integrations: vi.fn(),
    githubAuthorizeUrl: vi.fn(),
    decideSkill: vi.fn(),
    setEvidenceVisibility: vi.fn(),
    linkedinPreview: vi.fn(), linkedinImport: vi.fn(), linkedinUseDetails: vi.fn(), linkedinAuthorizeUrl: vi.fn()
  }
}));

const { api } = await import('../api/resources.js');
const { ConnectedProfiles } = await import('../components/ConnectedProfiles.jsx');

const item = (id, overrides = {}) => ({
  id, source: 'github', sourceRef: 'asha/campus-api', evidence: '"fastapi" is a dependency in requirements.txt',
  detectionMethod: 'manifest_dependency', confidence: 0.6, visibility: 'private', lastVerifiedAt: '2026-10-30T00:00:00Z', ...overrides
});
const overview = (skills) => ({
  github: { configured: true, connection: { username: 'asha', profileUrl: 'https://github.com/asha', status: 'active', lastSyncedAt: '2026-10-30T00:00:00Z' } },
  linkedin: { connection: null },
  skills
});
const fastapi = { skillId: 14, name: 'FastAPI', confidence: 0.68, evidenceClass: 'github_detected', sources: ['github'], status: 'pending', items: [item(1), item(2, { detectionMethod: 'readme_mention', evidence: 'Mentioned in the README ("fastapi")', confidence: 0.2 })] };
const react = { skillId: 3, name: 'React', confidence: 0.6, evidenceClass: 'github_detected', sources: ['github'], status: 'on_profile', items: [item(3, { sourceRef: 'asha/web' })] };
const elixir = { skillId: null, name: 'Elixir', confidence: 0.5, evidenceClass: 'github_detected', sources: ['github'], status: 'unmatched', items: [item(4)] };

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Connected profiles', () => {
  it('previews without saving and confirms only selected ZIP sections', async () => {
    api.integrations.mockResolvedValue(overview([]));
    api.linkedinPreview.mockResolvedValue({ sections: [
      { name: 'skills.csv', evidenceCount: 1, skills: ['React'], profileText: '' },
      { name: 'profile.csv', evidenceCount: 0, skills: [], profileText: 'Headline preview' }
    ] });
    api.linkedinImport.mockResolvedValue(overview([]));
    render(<ConnectedProfiles />);
    const file = new File(['fixture'], 'linkedin.zip', { type: 'application/zip' });
    fireEvent.change(await screen.findByLabelText('LinkedIn export file'), { target: { files: [file] } });
    expect(await screen.findByText('Review linkedin.zip')).toBeVisible();
    expect(api.linkedinImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: /profile.csv/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm selected sections' }));
    await waitFor(() => expect(api.linkedinImport).toHaveBeenCalledWith(file, ['skills.csv']));
  });

  it('requires selected account details and protects unsaved profile edits', async () => {
    api.integrations.mockResolvedValue({ ...overview([]), linkedin: { configured: true, connection: null, account: { name: 'Account Name', pictureUrl: 'https://media.licdn.com/photo' } } });
    api.linkedinUseDetails.mockResolvedValue({ student: { name: 'Account Name' } });
    const updated = vi.fn();
    const view = render(<ConnectedProfiles onProfileUpdated={updated} profileDirty />);
    const save = await screen.findByRole('button', { name: 'Use selected details' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use name: Account Name' }));
    expect(save).toBeDisabled();
    view.rerender(<ConnectedProfiles onProfileUpdated={updated} profileDirty={false} />);
    fireEvent.click(save);
    await waitFor(() => expect(api.linkedinUseDetails).toHaveBeenCalledWith(['name']));
    expect(updated).toHaveBeenCalledWith({ name: 'Account Name' });
  });
  it('shows evidence and requires a student-chosen level before approving', async () => {
    api.integrations.mockResolvedValue(overview([fastapi, react, elixir]));
    api.decideSkill.mockResolvedValue(overview([{ ...fastapi, status: 'on_profile' }, react, elixir]));
    const onSkillsChanged = vi.fn();
    render(<ConnectedProfiles onSkillsChanged={onSkillsChanged} />);

    expect(await screen.findByText('Suggested skills · 1 to review')).toBeVisible();
    expect(screen.getByText('68% evidence')).toBeVisible();
    expect(screen.getByText('2 pieces of evidence')).toBeInTheDocument();
    expect(screen.getByText(/not in SyncSpace's skill list yet: Elixir/)).toBeVisible();

    const approve = screen.getByRole('button', { name: 'Approve' });
    expect(approve).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'FastAPI proficiency' }), { target: { value: '3' } });
    fireEvent.click(approve);
    await waitFor(() => expect(api.decideSkill).toHaveBeenCalledWith(14, 'approved', 3));
    expect(await screen.findByText('FastAPI added to your skills.')).toBeVisible();
    expect(onSkillsChanged).toHaveBeenCalled();
  });

  it('lets students reject inaccurate detections and choose who sees their evidence', async () => {
    api.integrations.mockResolvedValue(overview([fastapi, react]));
    api.decideSkill.mockResolvedValue(overview([{ ...fastapi, status: 'rejected' }, react]));
    api.setEvidenceVisibility.mockResolvedValue(overview([fastapi, { ...react, items: [item(3, { visibility: 'team' })] }]));
    render(<ConnectedProfiles />);

    fireEvent.click(await screen.findByRole('button', { name: 'Not accurate' }));
    await waitFor(() => expect(api.decideSkill).toHaveBeenCalledWith(14, 'rejected', undefined));
    expect(await screen.findByText('FastAPI will not be suggested again.')).toBeVisible();

    const visibility = screen.getByRole('combobox', { name: 'React evidence visibility' });
    expect(visibility).toHaveValue('private');
    fireEvent.change(visibility, { target: { value: 'team' } });
    await waitFor(() => expect(api.setEvidenceVisibility).toHaveBeenCalledWith([3], 'team'));
  });

  it('explains what GitHub access means before connecting', async () => {
    api.integrations.mockResolvedValue({ github: { configured: true, connection: null }, linkedin: { connection: null }, skills: [] });
    render(<ConnectedProfiles />);
    expect(await screen.findByText(/requests no GitHub permissions and never posts anything/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Connect GitHub' })).toBeEnabled();
    expect(screen.getByText(/Skills and experience come from an export you review separately/)).toBeVisible();
  });

  it('reports an unconfigured server honestly instead of offering a broken button', async () => {
    api.integrations.mockResolvedValue({ github: { configured: false, connection: null }, linkedin: { connection: null }, skills: [] });
    render(<ConnectedProfiles />);
    expect(await screen.findByText('GitHub connection is not configured on this server yet.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Connect GitHub' })).not.toBeInTheDocument();
  });
});
