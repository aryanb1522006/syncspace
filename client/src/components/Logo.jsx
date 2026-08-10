import { Link } from 'react-router-dom';

export function OrbitMark({ small = false }) {
  return <span className={`orbit-mark ${small ? 'orbit-mark--small' : ''}`} aria-hidden="true"><i /><i /></span>;
}

export function Logo({ to = '/' }) {
  return <Link className="logo" to={to} aria-label="SyncSpace home"><OrbitMark /><span>SyncSpace</span></Link>;
}
