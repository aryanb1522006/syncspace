import { animate, stagger } from 'animejs';
import { ArrowRight, LockKeyhole, PencilLine, UsersRound } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createConstellationScene } from '../landing/constellationScene.js';
import '../landing/landingCore.css';
import '../landing/immersiveBase.css';
import '../landing/joinFirst.css';

const projectExamples = [
  { key: 'greenGrid', name: 'GreenGrid', domain: 'Climate Tech', tone: 'lime' },
  { key: 'studyCircle', name: 'StudyCircle', domain: 'EdTech', tone: 'lavender' },
  { key: 'campusMobility', name: 'Campus Mobility', domain: 'Mobility', tone: 'coral' },
  { key: 'openLab', name: 'OpenLab', domain: 'Research', tone: 'lavender' },
  { key: 'localLens', name: 'LocalLens', domain: 'Community', tone: 'mint' }
];

function Brand() {
  return <Link className="brand brand--landing" to="/" aria-label="SyncSpace home">
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="19" cy="24" r="14" /><circle cx="29" cy="24" r="14" /></svg>
    <span>SyncSpace</span>
  </Link>;
}

function LandingConstellation({ joinTarget }) {
  const shellRef = useRef(null);
  const canvasRef = useRef(null);
  const labelsRef = useRef({});

  useEffect(() => {
    const scene = createConstellationScene(canvasRef.current, labelsRef.current);
    const syncSceneToScroll = () => {
      const hero = shellRef.current?.closest('.hero');
      scene.setScrollProgress(window.scrollY / Math.max((hero?.offsetHeight ?? 1) * 0.82, 1));
    };
    window.addEventListener('scroll', syncSceneToScroll, { passive: true });
    syncSceneToScroll();
    return () => {
      window.removeEventListener('scroll', syncSceneToScroll);
      scene.dispose?.();
    };
  }, []);

  const saveLabel = (key) => (node) => {
    labelsRef.current[key] = node;
  };

  return <div className="constellation-shell" id="project-examples" ref={shellRef} aria-label="Interactive map of example projects leading toward Join">
    <canvas id="constellation-canvas" ref={canvasRef} aria-hidden="true" />
    <p className="interaction-hint"><span aria-hidden="true">↔</span> Move to explore project paths</p>
    <Link className="node-label node-label--you" ref={saveLabel('you')} to={joinTarget}>You</Link>
    <Link className="node-label node-label--join" ref={saveLabel('join')} to={joinTarget}>Join</Link>
    {projectExamples.map((project) => <Link
      className={`project-label project-label--${project.tone}`}
      key={project.key}
      ref={saveLabel(project.key)}
      to={`${joinTarget}${joinTarget.includes('?') ? '&' : '?'}project=${project.key}`}
    >
      <strong>{project.name}</strong><small>{project.domain}</small>
    </Link>)}
  </div>;
}

export function Landing() {
  const { user } = useAuth();
  const rootRef = useRef(null);
  const joinTarget = user ? '/dashboard' : '/register?intent=join';
  const postTarget = user ? '/projects/new' : '/register?intent=post';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = [...root.querySelectorAll('[data-scroll-reveal]')];
    const running = [];

    if (!reduceMotion) {
      running.push(animate(root.querySelector('[data-animate="header"]'), {
        opacity: { from: 0 }, y: { from: -14 }, duration: 550, ease: 'out(3)'
      }));
      running.push(animate(root.querySelectorAll('.hero-copy > *'), {
        opacity: { from: 0 }, y: { from: 26 }, delay: stagger(90), duration: 720, ease: 'out(4)'
      }));
      running.push(animate(root.querySelector('.constellation-shell'), {
        opacity: { from: 0 }, scale: { from: 0.96 }, delay: 150, duration: 1000, ease: 'out(4)'
      }));
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => { target.dataset.revealState = 'visible'; });
      return () => running.forEach((animation) => animation?.cancel?.());
    }

    targets.forEach((target) => { target.style.opacity = '0'; });
    const offsets = { left: { x: -54, y: 0 }, right: { x: 54, y: 0 }, up: { x: 0, y: 48 } };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const offset = offsets[entry.target.dataset.scrollReveal] ?? offsets.up;
        entry.target.dataset.revealState = 'visible';
        running.push(animate(entry.target, {
          opacity: 1, x: { from: offset.x }, y: { from: offset.y }, duration: 880, ease: 'out(4)'
        }));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' });
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      running.forEach((animation) => animation?.cancel?.());
    };
  }, []);

  return <div className="immersive-landing" ref={rootRef}>
    <div className="ambient-grid" aria-hidden="true" />
    <header className="site-header" data-animate="header">
      <Brand />
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#project-examples">Explore</a>
        <a href="#how-it-works">How it works</a>
        {user ? <Link to="/dashboard">Dashboard</Link> : <Link to="/login">Sign in</Link>}
        <Link className="button button--quiet button--dark" to={joinTarget}>{user ? 'Open SyncSpace' : 'Sign up now'}</Link>
      </nav>
    </header>

    <main id="top">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">Find the project that makes you want to show up.</h1>
          <p>Meet Thapar student builders, explore work that matches your skills, or start the idea you wish already existed.</p>
          <div className="hero-actions">
            <Link className="button button--primary button--landing-primary" to={joinTarget}>Explore projects <ArrowRight /></Link>
            <Link className="button button--outline button--dark" to={postTarget}>Post your idea <ArrowRight /></Link>
          </div>
        </div>
        <LandingConstellation joinTarget={joinTarget} />
        <a className="scroll-cue" href="#how-it-works">Scroll to see how it works <span aria-hidden="true">↓</span></a>
      </section>

      <section className="action-switchboard" id="how-it-works" aria-labelledby="switchboard-title">
        <div className="path-origin" aria-hidden="true"><span /><i /></div>
        <div className="section-heading" data-scroll-reveal="up">
          <h2 id="switchboard-title">Join something promising—or start what’s missing.</h2>
          <p>One verified account gives you both paths.</p>
        </div>
        <div className="route-list" data-scroll-reveal="up">
          <Link className="route route--mint" to={joinTarget}>
            <span className="route-icon" aria-hidden="true"><UsersRound /></span>
            <span className="route-copy"><strong>Join a project</strong><span>Explore real ideas, apply, and track every decision from your dashboard.</span></span>
            <ArrowRight className="route-arrow" />
          </Link>
          <Link className="route route--lime" to={postTarget}>
            <span className="route-icon" aria-hidden="true"><PencilLine /></span>
            <span className="route-copy"><strong>Post your idea</strong><span>Create a project, review applicants, and assemble your team.</span></span>
            <ArrowRight className="route-arrow" />
          </Link>
        </div>
      </section>

      <section className="privacy-band" id="contact-privacy" aria-labelledby="privacy-title">
        <div className="privacy-copy" data-scroll-reveal="left">
          <h2 id="privacy-title">Meet the people behind the project.</h2>
          <p>After an application is accepted, the project creator and collaborators can see one another’s verified Thapar email address. Pending applicants never see private team contacts.</p>
          <Link className="text-link text-link--landing" to={joinTarget}>{user ? 'Open your dashboard' : 'Sign up with Thapar'} <ArrowRight /></Link>
        </div>
        <div className="contact-stage" data-scroll-reveal="right">
          <div className="contact-branches" aria-hidden="true"><span /><span /><span /></div>
          <div className="contact-example" aria-label="Example accepted team contacts">
            <p className="contact-kicker">Verified team-only contacts</p>
            <div className="contact-team"><span className="team-mark">GG</span><span><strong>GreenGrid</strong><small>Accepted team</small></span></div>
            <div className="contact-person"><span className="avatar avatar--lavender">AR</span><span><strong>Arjun Rao · Creator</strong><small>arjun@thapar.edu</small></span></div>
            <div className="contact-person"><span className="avatar avatar--coral">IM</span><span><strong>Isha Mehta · Collaborator</strong><small>isha@thapar.edu</small></span></div>
            <p className="contact-note"><LockKeyhole /> Accepted teammates only</p>
          </div>
        </div>
      </section>
    </main>

    <footer className="site-footer">
      <Brand />
      <p>Verified collaboration for Thapar student builders.</p>
    </footer>
  </div>;
}
