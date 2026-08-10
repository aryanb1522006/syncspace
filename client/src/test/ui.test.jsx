import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { Landing } from '../pages/Landing.jsx';
import { ProjectRow } from '../components/ProjectRow.jsx';

const project = {
  id: 1, title: 'GreenGrid', domain: 'Climate Tech', description: 'Turn live campus energy data into actions students can see.',
  deadline: '2026-09-12', teamSize: 4, memberCount: 2,
  skills: [{ id: 1, name: 'React', importance: 'required' }],
  match: { score: 92, breakdown: { contributions: { requiredSkills: 45, preferredSkills: 17, domainInterest: 15, availability: 15 } } }
};

afterEach(cleanup);

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
});
