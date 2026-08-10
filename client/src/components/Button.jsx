import { Link } from 'react-router-dom';

export function Button({ to, variant = 'primary', className = '', children, ...props }) {
  const classes = `button button--${variant} ${className}`.trim();
  return to ? <Link className={classes} to={to} {...props}>{children}</Link> : <button className={classes} {...props}>{children}</button>;
}
