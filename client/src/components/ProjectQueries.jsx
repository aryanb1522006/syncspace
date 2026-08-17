import { HelpCircle, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/resources.js';
import { Button } from './Button.jsx';

const formatDate = (value) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function ProjectQueries({ projectId, isOwner }) {
  const [queries, setQueries] = useState([]);
  const [question, setQuestion] = useState('');
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.listProjectQueries(projectId)
      .then(({ queries: rows }) => { if (active) setQueries(rows); })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const raiseQuery = async (event) => {
    event.preventDefault();
    setBusyId('new'); setError(''); setMessage('');
    try {
      const { query: created } = await api.createProjectQuery(projectId, question);
      setQueries((current) => [created, ...current]);
      setQuestion('');
      setMessage('Query sent to the project owner.');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyId(null);
    }
  };

  const answer = async (event, projectQuery) => {
    event.preventDefault();
    setBusyId(projectQuery.id); setError(''); setMessage('');
    try {
      const { query: answered } = await api.answerProjectQuery(projectId, projectQuery.id, responses[projectQuery.id] ?? '');
      setQueries((current) => current.map((item) => Number(item.id) === Number(answered.id) ? answered : item));
      setResponses((current) => ({ ...current, [projectQuery.id]: '' }));
      setMessage('Response published to the student who raised the query.');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusyId(null);
    }
  };

  return <section className="project-queries" aria-labelledby="project-queries-title">
    <div className="project-queries__heading">
      <span><HelpCircle /></span>
      <div><h2 id="project-queries-title">Project queries</h2><p>{isOwner ? 'Answer questions from students considering this project.' : 'Ask the project owner a question before applying. This is not a live chat.'}</p></div>
    </div>

    {!isOwner && <form className="query-form" onSubmit={raiseQuery}>
      <label htmlFor="project-query">Your question</label>
      <textarea id="project-query" value={question} onChange={(event) => setQuestion(event.target.value)} minLength="10" maxLength="800" required placeholder="Ask the project owner your question." />
      <div><Button type="submit" disabled={busyId === 'new'}><Send />{busyId === 'new' ? 'Sending…' : 'Raise query'}</Button></div>
    </form>}

    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="loading">Loading project queries…</div> : <div className="query-list">
      {queries.map((projectQuery) => <article className="query-record" key={projectQuery.id}>
        <header><span>{isOwner ? projectQuery.askerName : 'Your query'}</span><time dateTime={projectQuery.createdAt}>{formatDate(projectQuery.createdAt)}</time><strong className={`status status--${projectQuery.status}`}>{projectQuery.status}</strong></header>
        <p>{projectQuery.question}</p>
        {projectQuery.response ? <div className="query-response"><span>Project owner’s response</span><p>{projectQuery.response}</p></div> : isOwner ? <form onSubmit={(event) => answer(event, projectQuery)}>
          <label htmlFor={`query-response-${projectQuery.id}`}>Your response</label>
          <textarea id={`query-response-${projectQuery.id}`} value={responses[projectQuery.id] ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [projectQuery.id]: event.target.value }))} minLength="2" maxLength="800" required placeholder="Write your response." />
          <Button type="submit" disabled={busyId === projectQuery.id}>{busyId === projectQuery.id ? 'Publishing…' : 'Publish response'}</Button>
        </form> : <small>Waiting for the project owner’s response.</small>}
      </article>)}
      {queries.length === 0 && <div className="empty-inline"><h3>{isOwner ? 'No queries to review' : 'No queries raised yet'}</h3><p>{isOwner ? 'New questions will appear here.' : 'Use the form above when you need information before applying.'}</p></div>}
    </div>}
  </section>;
}
