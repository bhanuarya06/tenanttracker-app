import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'} size="sm">
      <div className="flex items-start gap-3 mb-6">
        <div className="flex-shrink-0 p-2 bg-rose-100 rounded-full">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
        </div>
        <p className="text-sm text-slate-600 pt-1.5">{message || 'Are you sure? This action cannot be undone.'}</p>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </div>
    </Modal>
  );
}
