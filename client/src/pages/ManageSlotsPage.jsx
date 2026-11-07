import { useState } from 'react';
import { api } from '../api/api';
import { useFetch } from '../hooks/useFetch';
import CancelModal from '../components/CancelModal.jsx';
import { formatDate, formatTime } from '../utils/format';

export default function ManageSlotsPage() {
  const { data, loading, error, reload } = useFetch('/slots/all');

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      await api('/slots', {
        method: 'POST',
        body: { start_time: start.toISOString(), end_time: end.toISOString() },
      });
      setMessage({ type: 'success', text: 'Slot created.' });
      reload();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slot) {
    if (!window.confirm('Delete this slot?')) return;
    setMessage(null);
    try {
      await api(`/slots/${slot.id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  }

  async function confirmCancel(reason) {
    await api(`/appointments/${cancelTarget.appointment_id}/cancel`, {
      method: 'PATCH',
      body: { reason },
    });
    setCancelTarget(null);
    reload();
  }

  return (
    <div>
      <h2 className="h4 mb-3">Manage slots</h2>

      <div className="card mb-4">
        <div className="card-body">
          <h3 className="h6 mb-3">Create a slot</h3>
          <form className="row g-2 align-items-end" onSubmit={handleCreate}>
            <div className="col-md-4">
              <label htmlFor="slot-date" className="form-label">Date</label>
              <input
                id="slot-date"
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="col-6 col-md-3">
              <label htmlFor="slot-start" className="form-label">Start</label>
              <input
                id="slot-start"
                type="time"
                className="form-control"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="col-6 col-md-3">
              <label htmlFor="slot-end" className="form-label">End</label>
              <input
                id="slot-end"
                type="time"
                className="form-control"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <h3 className="h6 mb-3">Upcoming slots</h3>

      {loading && <p>Loading slots...</p>}

      {data && data.slots.length === 0 && (
        <p className="text-muted">No upcoming slots yet. Create one above.</p>
      )}

      {data && data.slots.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.slots.map((slot) => (
                <tr key={slot.id}>
                  <td>{formatDate(slot.start_time)}</td>
                  <td>
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </td>
                  <td>
                    {slot.appointment_id ? (
                      <span className="badge text-bg-warning">Booked by {slot.patient_name}</span>
                    ) : (
                      <span className="badge text-bg-success">Open</span>
                    )}
                  </td>
                  <td className="text-end">
                    {slot.appointment_id ? (
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => setCancelTarget(slot)}
                      >
                        Cancel booking
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handleDelete(slot)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cancelTarget && (
        <CancelModal onConfirm={confirmCancel} onClose={() => setCancelTarget(null)} />
      )}
    </div>
  );
}