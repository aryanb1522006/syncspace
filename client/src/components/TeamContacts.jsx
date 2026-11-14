import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/resources.js';
import { Button } from './Button.jsx';

export function TeamContacts({ team, isOwner, onInviteChanged }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const invite = team.groupInviteUrl;
  const contacts = team.contacts ?? [];
  const provider = invite?.startsWith('https://chat.whatsapp.com/') ? 'WhatsApp' : 'Discord';

  const saveInvite = async (value) => {
    setSaving(true);
    setError('');
    try {
      const { groupInviteUrl } = await api.saveGroupInvite(team.id, value);
      onInviteChanged(groupInviteUrl);
      setEditing(false);
    } catch (reason) {
      setError(reason.status === 400 ? 'Paste a WhatsApp group or Discord server invite link.' : reason.message);
    } finally {
      setSaving(false);
    }
  };

  return <section className="team-contacts" aria-labelledby="team-contacts-title">
    <div className="team-contacts__head">
      <h2 id="team-contacts-title">Team contacts</h2>
      <div className="team-contacts__actions">
        {invite && <a className="button button--primary" href={invite} target="_blank" rel="noopener noreferrer">
          <ExternalLink />Join team group <span>· {provider}</span>
        </a>}
        {isOwner && !editing && <Button variant="secondary" onClick={() => {
          setDraft(invite ?? '');
          setEditing(true);
        }}>{invite ? 'Edit group invite' : 'Add group invite'}</Button>}
      </div>
    </div>
    {!invite && !editing && <p>{isOwner ? 'Share a WhatsApp or Discord invite with your team.' : 'The team leader hasn’t added a group invite yet.'}</p>}
    {editing && <form className="modal-form" onSubmit={(event) => {
      event.preventDefault();
      saveInvite(draft);
    }}>
      <label>Group invite URL<input type="url" required maxLength={250} disabled={saving}
        placeholder="https://discord.gg/…" value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
      <p>Only teammates can see this link in SyncSpace. Manage group members and revoke old links in WhatsApp or Discord.</p>
      <div className="team-contacts__actions">
        <Button type="submit" disabled={saving || !draft.trim()}>{saving ? 'Saving…' : 'Save invite'}</Button>
        {invite && <Button type="button" variant="secondary" disabled={saving} onClick={() => saveInvite('')}>Remove invite</Button>}
        <Button type="button" variant="secondary" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Cancel</Button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>}
    {contacts.length > 0 && <ul className="team-contacts__list">{contacts.map((contact) => <li key={contact.studentId}>
      <div><strong>{contact.name}</strong><small>{contact.role}</small></div>
      <div className="team-contacts__methods">
        {contact.whatsappNumber && <a href={`https://wa.me/${contact.whatsappNumber.slice(1)}`} target="_blank" rel="noopener noreferrer"
          aria-label={`WhatsApp ${contact.name}`}>WhatsApp</a>}
        {contact.contactEmail && <a href={`mailto:${encodeURIComponent(contact.contactEmail).replace('%40', '@')}`}
          aria-label={`Email ${contact.name}`}>Email</a>}
        {contact.discordUsername && <span>Discord · <strong>{contact.discordUsername}</strong></span>}
      </div>
    </li>)}</ul>}
    <Button variant="secondary" to="/profile#team-contact-details">My contact details</Button>
  </section>;
}
