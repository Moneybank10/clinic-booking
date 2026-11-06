import { useState } from 'react';

export default function CancelModal({ onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please give a reason for cancelling');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Cancel appointment</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>

            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <label htmlFor="reason" className="form-label">Reason for cancelling</label>
              <textarea
                id="reason"
                className="form-control"
                rows="3"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Keep appointment
              </button>
              <button type="submit" className="btn btn-danger" disabled={submitting}>
                {submitting ? 'Cancelling...' : 'Cancel appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}