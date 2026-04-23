import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmVariant = 'danger' }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
};
