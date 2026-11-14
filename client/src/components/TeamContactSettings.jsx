import { useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { Button } from './Button.jsx';

const fields = [
  ['whatsappNumber', 'WhatsApp number', 'tel', '+91 98765 43210', 40],
  ['discordUsername', 'Discord username', 'text', 'campus.builder', 32],
  ['contactEmail', 'Contact email', 'email', 'you@example.com', 254]
];
const asDraft = (contacts) => Object.fromEntries(fields.map(([key]) => [key, contacts[key] ?? '']));

export function TeamContactSettings() {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.getMyTeamContacts().then(({ contacts }) => {
      if (!active) return;
      const values = asDraft(contacts);
      setDraft(values);
      setSaved(values);
    }).catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { contacts } = await api.saveMyTeamContacts(draft);
      const values = asDraft(contacts);
      setDraft(values);
      setSaved(values);
      setMessage('Team contact details saved.');
    } catch (reason) {
      const errors = reason.details?.fieldErrors;
      setError(errors?.whatsappNumber ? 'Enter a WhatsApp number with its country code.'
        : errors?.discordUsername ? 'Enter a Discord username using 2–32 letters, numbers, underscores, or periods.'
        : errors?.contactEmail ? 'Enter a valid contact email.' : reason.message);
    } finally {
      setSaving(false);
    }
  };

  return <form className="profile-form team-contact-settings" id="team-contact-details" onSubmit={save}>
    <section>
      <div className="section-title"><div><h2>Team contact details</h2>
        <p>These details are visible to your accepted teammates. Leave any field blank to keep it private.</p>
      </div></div>
      {draft ? <fieldset disabled={saving}>
        <div className="form-grid">
          {fields.map(([key, label, type, placeholder, maxLength]) => <label key={key}>
            {label}
            <input type={type} placeholder={placeholder} maxLength={maxLength} value={draft[key]}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((current) => ({ ...current, [key]: value }));
                setMessage('');
              }} />
          </label>)}
        </div>
        <Button type="submit" disabled={saving || fields.every(([key]) => draft[key] === saved[key])}>
          {saving ? 'Saving…' : 'Save contact details'}
        </Button>
      </fieldset> : !error && <p>Loading contact details…</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  </form>;
}
