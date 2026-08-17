import { ArrowRight, Clock3, Compass, LayoutDashboard, Search, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../landing/hybrid.css';

const suggestedSkills = ['React', 'Figma', 'Machine Learning', 'PostgreSQL', 'Video Editing'];

function NetworkCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const pointer = { x: -9999, y: -9999 };
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let nodes = [];
    let frame;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * density));
      canvas.height = Math.max(1, Math.round(height * density));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(density, 0, 0, density, 0, 0);
      const count = Math.min(64, Math.max(26, Math.floor((width * height) / 17000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.3 + 0.8
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      nodes.forEach((node) => {
        if (!reduceMotion) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
          const pointerDistance = Math.hypot(pointer.x - node.x, pointer.y - node.y);
          if (pointerDistance < 140) {
            node.x += (pointer.x - node.x) * 0.0035;
            node.y += (pointer.y - node.y) * 0.0035;
          }
        }
      });

      for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
          const distance = Math.hypot(nodes[first].x - nodes[second].x, nodes[first].y - nodes[second].y);
          if (distance < 125) {
            context.strokeStyle = `rgba(228, 242, 34, ${0.11 * (1 - distance / 125)})`;
            context.beginPath();
            context.moveTo(nodes[first].x, nodes[first].y);
            context.lineTo(nodes[second].x, nodes[second].y);
            context.stroke();
          }
        }
        const pointerDistance = Math.hypot(nodes[first].x - pointer.x, nodes[first].y - pointer.y);
        if (pointerDistance < 160) {
          context.strokeStyle = `rgba(228, 242, 34, ${0.28 * (1 - pointerDistance / 160)})`;
          context.beginPath();
          context.moveTo(nodes[first].x, nodes[first].y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      }

      nodes.forEach((node) => {
        context.beginPath();
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context.fillStyle = 'rgba(208, 214, 224, 0.56)';
        context.fill();
      });
      if (!reduceMotion) frame = window.requestAnimationFrame(draw);
    };

    const move = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const leave = () => { pointer.x = -9999; pointer.y = -9999; };
    resize();
    draw();
    window.addEventListener('resize', resize);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, []);

  return <canvas className="hybrid-network" ref={canvasRef} aria-hidden="true" />;
}

function ProjectSearch({ user }) {
  const [skill, setSkill] = useState('');
  const [projects, setProjects] = useState([]);
  const [openCount, setOpenCount] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.publicProjectSearch('').then(({ count, projects: rows }) => {
      setOpenCount(count ?? rows.length);
    }).catch(() => setOpenCount(null));
  }, []);

  const search = useCallback(async (requestedSkill = skill) => {
    const normalized = requestedSkill.trim();
    setSkill(requestedSkill);
    setSearched(true);
    setError('');
    if (!normalized) {
      setProjects([]);
      setError('Enter a skill or choose one of the suggestions below.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.publicProjectSearch(normalized);
      setProjects(result.projects);
    } catch {
      setProjects([]);
      setError('Project matching is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [skill]);

  return <div className="hybrid-matcher">
    <div className="hybrid-status"><span />{openCount === null ? 'Live project matching' : `${openCount} projects open now`}</div>
    <form className="hybrid-search" onSubmit={(event) => { event.preventDefault(); search(); }}>
      <Search aria-hidden="true" />
      <input aria-label="Search projects by skill" value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="React, Figma, ML, PostgreSQL…" />
      <button type="submit">{loading ? 'Searching…' : 'Find match'}</button>
    </form>
    <div className="hybrid-chips" aria-label="Suggested skills">
      {suggestedSkills.map((item) => <button type="button" key={item} onClick={() => search(item)}>{item}</button>)}
    </div>
    <div className="hybrid-results" aria-live="polite">
      {error && <p className="hybrid-search-message">{error}</p>}
      {searched && !loading && !error && projects.length === 0 && <p className="hybrid-search-message">No open project currently lists that skill. Try a related skill.</p>}
      {projects.map((project) => <Link className="hybrid-result" key={project.id} to={user ? `/projects/${project.id}` : `/register?intent=join&project=${project.id}`}>
        <span><small>{project.domain}</small><strong>{project.title}</strong></span>
        <span className="hybrid-result__skills">{project.skills.slice(0, 3).map((item) => item.name).join(' · ')}</span>
        <ArrowRight aria-hidden="true" />
      </Link>)}
    </div>
  </div>;
}

const services = [
  { icon: Compass, title: 'Skill-first ranking', copy: 'Discover ranks by what you know and how much time you have—not popularity.' },
  { icon: LayoutDashboard, title: 'One dashboard', copy: 'Track applications, projects, queries, teams, and deadlines in one consistent workspace.' },
  { icon: UsersRound, title: 'Project queries', copy: 'Ask the owner a question before applying, then keep the answer attached to the project.' },
  { icon: Clock3, title: 'Live availability', copy: 'Matches respect your actual weekly bandwidth, not just your interests.' }
];

export function Landing() {
  const { user } = useAuth();
  const rootRef = useRef(null);
  const discoverTarget = user ? '/dashboard' : '/register?intent=join';
  const postTarget = user ? '/projects/new' : '/register?intent=post';

  useEffect(() => {
    const targets = [...rootRef.current.querySelectorAll('[data-hybrid-reveal]')];
    if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((target) => { target.dataset.revealState = 'visible'; });
      return undefined;
    }
    targets.forEach((target) => { target.dataset.revealState = 'waiting'; });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.revealState = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return <div className="hybrid-landing" ref={rootRef}>
    <header className="hybrid-nav">
      <Link className="hybrid-brand" to="/"><span aria-hidden="true" />SyncSpace</Link>
      <nav aria-label="Primary navigation"><a href="#process">Process</a><a href="#services">Services</a><a href="#search">Discover</a>{user ? <Link to="/dashboard">Dashboard</Link> : <Link to="/login">Sign in</Link>}</nav>
      <Link className="hybrid-pill" to={postTarget}>Post a project</Link>
    </header>

    <main>
      <section className="hybrid-hero" id="search" aria-labelledby="hybrid-title">
        <NetworkCanvas />
        <div className="hybrid-glow" aria-hidden="true" />
        <div className="hybrid-hero__content">
          <p className="hybrid-eyebrow">INDEX[0]</p>
          <h1 id="hybrid-title">Your skills already have<br />a project waiting. <span>Just ask.</span></h1>
          <p className="hybrid-subhead">SyncSpace matches students to real project teams by what they can actually do—not who they know.</p>
          <ProjectSearch user={user} />
          <p className="hybrid-caption">— Search live projects by the skill you want to use</p>
        </div>
      </section>

      <section className="hybrid-band" id="process">
        <div className="hybrid-wrap hybrid-band__inner">
          <p className="hybrid-label">Process</p>
          <h2>Three steps, no cold DMs.</h2>
          <div className="hybrid-steps">
            {[
              ['01', 'Add your skills, not a résumé', 'Tag what you can actually build. SyncSpace ranks projects against that, not a GPA.'],
              ['02', 'Get ranked matches by fit and time', 'Every project is scored against your skills and the hours you can reliably contribute.'],
              ['03', 'Apply—or ask before you do', 'Raise a project query, get the owner’s answer, and track your application in one place.']
            ].map(([number, title, copy]) => <article key={number} data-hybrid-reveal><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="hybrid-band" id="services">
        <div className="hybrid-wrap hybrid-band__inner">
          <p className="hybrid-label">Services</p>
          <h2>Built for how student teams actually form.</h2>
          <div className="hybrid-service-grid">
            {services.map(({ icon: Icon, title, copy }) => <article key={title} data-hybrid-reveal><span><Icon /></span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="hybrid-band">
        <div className="hybrid-wrap hybrid-manifesto" data-hybrid-reveal>
          <p className="hybrid-label">Why SyncSpace</p>
          <h2>Building a project shouldn’t start with a cold DM.</h2>
          <p>Skills should be the introduction. Find a team that needs what you can build, ask the project owner a question, or lead the project you want to see on campus.</p>
          <div><Link className="hybrid-pill" to={discoverTarget}>Explore projects</Link><Link className="hybrid-pill hybrid-pill--ghost" to={postTarget}>Post a project</Link></div>
        </div>
      </section>
    </main>

    <footer className="hybrid-footer"><span>© 2026 SyncSpace</span><span>UCS503 · INDEX[0]</span></footer>
  </div>;
}
