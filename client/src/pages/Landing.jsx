import { ArrowRight, CheckSquare2, Clock3, Code2, Leaf, Sparkles, UsersRound } from 'lucide-react';
import { Button } from '../components/Button.jsx';
import { PublicHeader } from '../components/PublicHeader.jsx';

export function Landing() {
  return <div className="landing">
    <PublicHeader />
    <main>
      <section className="hero wrap" id="explore">
        <div className="hero__copy">
          <h1>The right project.<br />The teammates<br />you’re missing.</h1>
          <p>Match with campus projects and people who complement your skills — then build together in one focused workspace.</p>
          <div className="hero__actions"><Button to="/register">Explore projects <ArrowRight /></Button><Button to="/register?role=owner" variant="link">Post a project</Button></div>
        </div>
        <div className="hero__visual" aria-label="GreenGrid recommendation preview">
          <div className="orbit orbit--one" /><div className="orbit orbit--two" /><div className="orbit orbit--three" />
          <span className="orbit-person orbit-person--one">KS</span><span className="orbit-person orbit-person--two">NB</span>
          <div className="hero-card">
            <div className="hero-card__title"><span className="project-emblem"><Leaf /></span><div><h2>GreenGrid</h2><p><strong>92%</strong> match</p></div></div>
            <div className="hero-card__body"><h3>Why recommended</h3>
              <div><span><i><Code2 /></i>Required skills</span><strong>45/50</strong></div>
              <div><span><i className="lavender"><Leaf /></i>Climate Tech interest</span><strong>15/15</strong></div>
              <div><span><i className="lime"><Clock3 /></i>Availability</span><strong>15/15</strong></div>
            </div>
          </div>
        </div>
      </section>
      <section className="how" id="how-it-works"><div className="wrap">
        <h2>Built for the moment an idea needs a team</h2>
        <div className="steps">
          <article><span>1</span><div className="step-art"><UsersRound /><b>Python</b><b>Design</b><b>Data Analysis</b></div><h3>Show what you know</h3><p>Highlight your skills, interests, and availability in a few minutes.</p></article>
          <article><span>2</span><div className="step-art matches"><Sparkles /><b>92%</b><b>86%</b><b>78%</b></div><h3>See your strongest matches</h3><p>We surface projects and teammates who complement your skills.</p></article>
          <article><span>3</span><div className="step-art board"><CheckSquare2 /><i /><i /><i /></div><h3>Build in one shared space</h3><p>Plan, assign, and track progress together without switching tools.</p></article>
        </div>
      </div></section>
    </main>
  </div>;
}
