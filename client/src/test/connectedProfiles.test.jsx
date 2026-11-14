import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Live-mode behaviour with the API mocked; demo mode is covered by the
// profile page test in ui.test.jsx.
vi.mock('../api/resources.js', () => ({
  demoMode: false,
  api: {
    integrations: vi.fn(),
    githubAuthorizeUrl: vi.fn(),
    githubSync: vi.fn(),
    updateReviewedSkills: vi.fn(),
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
const reviewId = '11111111-1111-4111-8111-111111111111';
const overview = (skills, id = reviewId) => ({
  github: { configured: true, connection: { username: 'asha', profileUrl: 'https://github.com/asha', status: 'active', lastSyncedAt: '2026-10-30T00:00:00Z' } },
  linkedin: { connection: null },
  skills,
  reviewIds: skills.length ? [id] : []
});
const fastapi = { skillId: 14, name: 'FastAPI', confidence: 0.68, evidenceClass: 'github_detected', sources: ['github'], status: 'pending', selectedByDefault: true, items: [item(1), item(2, { detectionMethod: 'readme_mention', evidence: 'Mentioned in the README ("fastapi")', confidence: 0.2 })] };
const react = { skillId: 3, name: 'React', confidence: 0.6, evidenceClass: 'github_detected', sources: ['github'], status: 'on_profile', items: [item(3, { sourceRef: 'asha/web' })] };
const elixir = { skillId: null, name: 'Elixir', confidence: 0.5, evidenceClass: 'github_detected', sources: ['github'], status: 'unmatched', items: [item(4)] };

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('Connected profiles', () => {
  it('shows only Disconnect for completed LinkedIn details, including a later customized name', async () => {
    api.integrations.mockResolvedValue({ ...overview([]), linkedin: { configured: true, connection: null, account: { name: 'Provider Name', pictureUrl: 'https://media.licdn.com/photo', nameApplied: true, photoApplied: true } } });
    render(<ConnectedProfiles profile={{ name: 'My preferred name', avatar_url: 'https://media.licdn.com/photo' }} />);
    await screen.findByText('Profile details up to date');
    const card = within(screen.getByRole('heading', { name: 'LinkedIn' }).closest('article'));
    expect(card.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(card.getAllByRole('button')).toHaveLength(1);
    expect(card.getByRole('button', { name: 'Disconnect account' })).toBeEnabled();
    expect(card.queryByText(/Connect for your account name/)).not.toBeInTheDocument();
    expect(screen.getByText('Import LinkedIn evidence').closest('details')).not.toHaveAttribute('open');
  });

  it('recognizes existing matching name and photo before completion flags are available', async () => {
    api.integrations.mockResolvedValue({ ...overview([]), linkedin: { configured: true, connection: null, account: { name: 'Account Name', pictureUrl: 'https://media.licdn.com/photo' } } });
    render(<ConnectedProfiles profile={{ name: 'Account Name', avatar_url: 'https://media.licdn.com/photo' }} />);
    expect(await screen.findByText('Profile details up to date')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Use selected details' })).not.toBeInTheDocument();
  });

  it('offers only an unapplied photo and collapses setup after a successful apply', async () => {
    api.integrations.mockResolvedValue({ ...overview([]), linkedin: { configured: true, connection: null, account: { name: 'Account Name', pictureUrl: 'https://media.licdn.com/photo', nameApplied: true, photoApplied: false } } });
    api.linkedinUseDetails.mockResolvedValue({ student: { name: 'Account Name', avatar_url: 'https://media.licdn.com/photo' } });
    render(<ConnectedProfiles />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Use photo on my college profile' }));
    expect(screen.queryByRole('checkbox', { name: 'Use name: Account Name' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use selected details' }));
    expect(await screen.findByText('Profile details up to date')).toBeVisible();
    expect(api.linkedinUseDetails).toHaveBeenCalledWith(['photo']);
    expect(screen.queryByRole('button', { name: 'Use selected details' })).not.toBeInTheDocument();
  });

  it('keeps unapplied controls available after a failed save', async () => {
    api.integrations.mockResolvedValue({ ...overview([]), linkedin: { configured: true, connection: null, account: { name: 'Account Name', pictureUrl: 'https://media.licdn.com/photo', nameApplied: true, photoApplied: false } } });
    api.linkedinUseDetails.mockRejectedValueOnce(new Error('Could not save the photo.'));
    render(<ConnectedProfiles />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Use photo on my college profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use selected details' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the photo.');
    expect(screen.queryByText('Profile details up to date')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Use photo on my college profile' })).toBeEnabled();
  });

  it('does not submit a stale field selection when that field becomes applied', async () => {
    api.integrations.mockResolvedValue({ ...overview([]), linkedin: { configured: true, connection: null, account: { name: 'Account Name', pictureUrl: 'https://media.licdn.com/photo' } } });
    const view = render(<ConnectedProfiles profile={{ name: 'Old Name', avatar_url: null }} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Use name: Account Name' }));
    view.rerender(<ConnectedProfiles profile={{ name: 'Account Name', avatar_url: null }} />);
    expect(screen.queryByRole('checkbox', { name: 'Use name: Account Name' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use selected details' })).toBeDisabled();
  });

  it('finishes setup when the account has no photo to offer and the name is already applied', async () => {
    api.integrations.mockResolvedValue({ ...overview([]), linkedin: { configured: true, connection: null, account: { name: 'Account Name', pictureUrl: null, nameApplied: true } } });
    render(<ConnectedProfiles />);
    expect(await screen.findByText('Profile details up to date')).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('previews selected ZIP sections, then shows and clears the LinkedIn skill review', async () => {
    api.integrations.mockResolvedValue(overview([]));
    api.linkedinPreview.mockResolvedValue({ sections: [
      { name: 'skills.csv', evidenceCount: 1, skills: ['Python'], profileText: '' },
      { name: 'profile.csv', evidenceCount: 0, skills: [], profileText: 'Headline preview' }
    ] });
    const python = {
      skillId: 12, name: 'Python', confidence: 0.3, evidenceClass: 'self_declared', sources: ['linkedin_export'],
      status: 'pending', selectedByDefault: true, items: [item(5, { source: 'linkedin_export', sourceRef: 'Skills.csv' })]
    };
    api.linkedinImport.mockResolvedValue(overview([python]));
    api.updateReviewedSkills.mockResolvedValue({ ...overview([]), addedSkillIds: [12], profileSkills: [{ id: 12, name: 'Python' }] });
    render(<ConnectedProfiles />);
    const file = new File(['fixture'], 'linkedin.zip', { type: 'application/zip' });
    fireEvent.click(await screen.findByText('Import LinkedIn evidence'));
    fireEvent.change(await screen.findByLabelText('LinkedIn export file'), { target: { files: [file] } });
    expect(await screen.findByText('Review linkedin.zip')).toBeVisible();
    expect(api.linkedinImport).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Skill evidence' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /profile.csv/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm selected sections' }));
    await waitFor(() => expect(api.linkedinImport).toHaveBeenCalledWith(file, ['skills.csv']));
    expect(await screen.findByRole('checkbox', { name: 'Python' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Update skills' }));
    expect(await screen.findByText('Added 1 skill to your profile.')).toBeVisible();
    expect(api.updateReviewedSkills).toHaveBeenCalledWith([reviewId], [12]);
    expect(screen.queryByRole('heading', { name: 'Skill evidence' })).not.toBeInTheDocument();
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
  it('adds selected skills in one update and hides the completed review', async () => {
    api.integrations.mockResolvedValue(overview([fastapi, react, elixir]));
    const profileSkills = [{ id: 14, name: 'FastAPI' }];
    api.updateReviewedSkills.mockResolvedValue({ ...overview([]), addedSkillIds: [14], profileSkills });
    const onSkillsChanged = vi.fn();
    render(<ConnectedProfiles onSkillsChanged={onSkillsChanged} />);

    const choice = await screen.findByRole('checkbox', { name: 'FastAPI' });
    expect(choice).toBeChecked();
    fireEvent.click(within(choice.closest('.evidence-review__row')).getByText('Detected on GitHub'));
    expect(screen.getByText('68% evidence')).toBeVisible();
    expect(screen.getByText('2 pieces of evidence')).toBeInTheDocument();
    expect(screen.getByText('Not in the skill list')).toBeVisible();

    const approve = screen.getByRole('button', { name: 'Update skills' });
    expect(approve).toBeEnabled();
    expect(screen.queryByRole('combobox', { name: /proficiency/i })).not.toBeInTheDocument();
    fireEvent.click(approve);
    await waitFor(() => expect(api.updateReviewedSkills).toHaveBeenCalledWith([reviewId], [14]));
    expect(await screen.findByText('Added 1 skill to your profile.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Skill evidence' })).not.toBeInTheDocument();
    expect(onSkillsChanged).toHaveBeenCalledWith(profileSkills);
  });

  it('keeps skill selections after updating evidence visibility and a failed save', async () => {
    api.integrations.mockResolvedValue(overview([fastapi, react]));
    api.setEvidenceVisibility.mockResolvedValue(overview([{ ...fastapi, items: fastapi.items.map((row) => ({ ...row, visibility: 'team' })) }, react]));
    api.updateReviewedSkills.mockRejectedValueOnce(new Error('Could not update skills.'));
    render(<ConnectedProfiles />);

    const choice = await screen.findByRole('checkbox', { name: 'FastAPI' });
    fireEvent.click(choice);
    fireEvent.click(within(choice.closest('.evidence-review__row')).getByText('Detected on GitHub'));
    const visibility = screen.getByRole('combobox', { name: 'FastAPI evidence visibility' });
    expect(visibility).toHaveValue('private');
    fireEvent.change(visibility, { target: { value: 'team' } });
    await waitFor(() => expect(visibility).toHaveValue('team'));
    expect(api.setEvidenceVisibility).toHaveBeenCalledWith([1, 2], 'team');
    expect(choice).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Update skills' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update skills.');
    expect(api.updateReviewedSkills).toHaveBeenCalledWith([reviewId], []);
    expect(choice).not.toBeChecked();
  });

  it('explains what GitHub access means before connecting', async () => {
    api.integrations.mockResolvedValue({ github: { configured: true, connection: null }, linkedin: { connection: null }, skills: [] });
    render(<ConnectedProfiles />);
    expect(await screen.findByText(/Nothing is posted to GitHub/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Connect GitHub' })).toBeEnabled();
    fireEvent.click(screen.getByText('What does this share?'));
    expect(screen.getByText(/Add your LinkedIn profile URL/)).toBeVisible();
  });

  it('reports an unconfigured server honestly instead of offering a broken button', async () => {
    api.integrations.mockResolvedValue({ github: { configured: false, connection: null }, linkedin: { connection: null }, skills: [] });
    render(<ConnectedProfiles />);
    expect(await screen.findByText('GitHub connection is unavailable right now.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Connect GitHub' })).not.toBeInTheDocument();
  });

  it('shows evidence after syncing and leaves profile skills alone until Update skills', async () => {
    api.integrations.mockResolvedValue(overview([]));
    api.githubSync.mockResolvedValue(overview([fastapi]));
    const refresh = vi.fn();
    render(<ConnectedProfiles onSkillsChanged={refresh} />);
    const sync = await screen.findByRole('button', { name: 'Sync now' });
    expect(screen.queryByRole('heading', { name: 'Skill evidence' })).not.toBeInTheDocument();
    fireEvent.click(sync);
    expect(await screen.findByRole('heading', { name: 'Skill evidence' })).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });
});
