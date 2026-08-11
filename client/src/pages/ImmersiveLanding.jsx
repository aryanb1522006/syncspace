import { animate, stagger } from 'animejs';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Compass,
  FileLock2,
  Flag,
  LayoutDashboard,
  LockKeyhole,
  PencilLine,
  Send,
  ShieldCheck,
  UserRoundCheck,
  UsersRound
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createConstellationScene } from '../landing/constellationScene.js';
import '../landing/landingCore.css';
import '../landing/immersiveBase.css';
import '../landing/joinFirst.css';
import '../landing/workflow.css';

const projectExamples = [
  { key: 'greenGrid', name: 'GreenGrid', domain: 'Climate Tech', tone: 'lime' },
  { key: 'studyCircle', name: 'StudyCircle', domain: 'EdTech', tone: 'lavender' },
  { key: 'campusMobility', name: 'Campus Mobility', domain: 'Mobility', tone: 'coral' },
  { key: 'openLab', name: 'OpenLab', domain: 'Research', tone: 'lavender' },
  { key: 'localLens', name: 'LocalLens', domain: 'Community', tone: 'mint' }
];

const workflowSteps = [
  { title: 'Discover', icon: Compass, details: ['Skill-based matching', 'Transparent match score'] },
  { title: 'Apply', icon: Send, details: ['Application tracking', 'Private resume sharing'] },
  { title: 'Review', icon: UserRoundCheck, details: ['Owner decisions', 'Accept or reject controls'] },
  { title: 'Build', icon: UsersRound, details: ['Team workspace', 'Tasks and notifications'] },
  { title: 'Deliver', icon: Flag, details: ['Shared progress', 'Verified team contacts'] }
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
    <Link className="node-label node-label--join" data-ambient-pulse ref={saveLabel('join')} to={joinTarget}>Join</Link>
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

function WorkflowSection({ joinTarget, postTarget }) {
  return <section className="workflow-journey" id="workflow" aria-labelledby="workflow-title">
    <div className="workflow-heading" data-scroll-reveal="up">
      <h2 id="workflow-title">From idea to working team.</h2>
      <p>One verified account keeps every step connected.</p>
    </div>

    <div className="workflow-track" data-scroll-reveal="up">
      <span className="workflow-track__rail" aria-hidden="true" />
      <span className="workflow-track__pulse" data-ambient-pulse aria-hidden="true" />
      {workflowSteps.map(({ title, icon: Icon, details }, index) => <article className="workflow-step" key={title}>
        <span className={`workflow-step__node workflow-step__node--${index + 1}`} aria-hidden="true"><Icon /></span>
        <p><span>{index + 1}</span>{title}</p>
        <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
      </article>)}
    </div>

    <div className="workflow-lanes" data-scroll-reveal="up">
      <Link className="workflow-lane workflow-lane--join" to={joinTarget}>
        <span className="workflow-lane__icon" aria-hidden="true"><UsersRound /></span>
        <span className="workflow-lane__copy"><strong>Join a project</strong><small>Find work matched to your skills and goals.</small></span>
        <span className="workflow-lane__signals"><span>90% match</span><span><CheckCircle2 /> Application accepted</span></span>
        <ArrowRight aria-hidden="true" />
      </Link>
      <Link className="workflow-lane workflow-lane--lead" to={postTarget}>
        <span className="workflow-lane__icon" aria-hidden="true"><Flag /></span>
        <span className="workflow-lane__copy"><strong>Lead a project</strong><small>Post your idea and choose the right collaborators.</small></span>
        <span className="workflow-lane__signals"><span>Review applicants</span><span><UserRoundCheck /> Accept or reject</span></span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>

    <div className="workflow-preview" data-scroll-reveal="up">
      <div className="workflow-preview__intro">
        <strong>Live workflow preview</strong>
        <span>Decisions and team activity stay in one place.</span>
      </div>
      <div className="workflow-preview__event">
        <span className="avatar avatar--lavender">AR</span>
        <span><small>Application accepted</small><strong>Arjun joined Campus Mobility</strong></span>
        <CheckCircle2 aria-hidden="true" />
      </div>
      <div className="workflow-preview__event">
        <span className="workflow-preview__event-icon"><LayoutDashboard /></span>
        <span><small>Task assigned</small><strong>Design route selection screen</strong></span>
        <BellRing aria-hidden="true" />
      </div>
    </div>
  </section>;
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
    const reveal = (target) => { target.dataset.revealState = 'visible'; };
    const running = [];

    if (!reduceMotion) {
      try {
        running.push(animate(root.querySelectorAll('[data-ambient-pulse]'), {
          scale: [0.96, 1.06, 0.96],
          opacity: [0.62, 1, 0.62],
          delay: stagger(220),
          duration: 2600,
          loop: true,
          ease: 'inOutSine'
        }));
      } catch {
        // Decorative motion must never control content visibility.
      }
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(reveal);
      return () => running.forEach((animation) => animation?.cancel?.());
    }

    targets.forEach((target) => { target.dataset.revealState = 'waiting'; });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' });
    targets.forEach((target) => observer.observe(target));
    const visibilitySafety = window.setTimeout(() => targets.forEach(reveal), 8000);

    return () => {
      window.clearTimeout(visibilitySafety);
      observer.disconnect();
      running.forEach((animation) => animation?.cancel?.());
    };
  }, []);

  return <div className="immersive-landing" ref={rootRef}>
    <div className="ambient-grid" aria-hidden="true" />
    <header className="site-header" data-animate="header">
      <Brand />
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#project-examples">Projects</a>
        <a href="#how-it-works">How it works</a>
        <a href="#workflow">Features</a>
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

      <WorkflowSection joinTarget={joinTarget} postTarget={postTarget} />

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
      <section className="landing-final" aria-labelledby="landing-final-title">
        <div className="landing-final__copy" data-scroll-reveal="left">
          <h2 id="landing-final-title">Your next working team can start here.</h2>
          <p>Discover a project worth joining or post the idea you want Thapar builders to help ship.</p>
          <div className="landing-final__actions">
            <Link className="button button--primary button--landing-primary" to={joinTarget}>Explore projects <ArrowRight /></Link>
            <Link className="button button--outline button--dark" to={postTarget}>Post your idea <ArrowRight /></Link>
          </div>
        </div>
        <div className="landing-trust" data-scroll-reveal="right">
          <div><ShieldCheck aria-hidden="true" /><span><strong>Verified Thapar access</strong><small>Restrict sign-in to approved campus accounts.</small></span></div>
          <div><FileLock2 aria-hidden="true" /><span><strong>Private resumes</strong><small>Files stay protected and are shared only when needed.</small></span></div>
          <div><BellRing aria-hidden="true" /><span><strong>Live application status</strong><small>Applicants and owners see each decision clearly.</small></span></div>
        </div>
      </section>

    </main>

    <footer className="site-footer">
      <Brand />
      <p>Verified collaboration for Thapar student builders.</p>
    </footer>
  </div>;
}
