import { Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { Button } from './Button.jsx';

export function PublicHeader() {
  return <header className="public-header wrap">
    <Logo />
    <nav aria-label="Public navigation">
      <a href="/#explore">Explore</a>
      <a href="/#how-it-works">How it works</a>
      <Link to="/login">Sign in</Link>
    </nav>
    <Button to="/register">Find your team</Button>
  </header>;
}
