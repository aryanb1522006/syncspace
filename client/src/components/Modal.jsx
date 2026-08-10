import { X } from 'lucide-react';

export function Modal({ title, children, onClose }) {
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal__panel"><div className="modal__header"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>{children}</div>
  </div>;
}
