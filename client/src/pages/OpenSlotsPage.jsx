import { useState } from 'react';
import { api } from '../api/api';
import { useFetch } from '../hooks/useFetch';
import { formatDate, formatTime } from '../utils/format';

export default function OpenSlotsPage() {
  const { data, loading, error, reload } = useFetch('/slots');
  const [bookingId, setBookingId] = useState(null);
  const [message, setMessage] = useState(null);

  async function handleBook(slotId) {
    setBookingId(slotId);
    setMessage(null);
    try {
      await api('/appointments', { method: 'POST', body: { slot_id: slotId } });
      setMessage({ type: 'success', text: 'Appointment booked! You can see it under My Appointments.' });
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setBookingId(null);
      reload();
    }
  }

  if (loading) return <p>Loading slots...</p>;

  return (
    <div>
      <h2 className="h4 mb-3">Open slots</h2>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {data && data.slots.length === 0 && (
        <p className="text-muted">No open slots right now. Please check back later.</p>
      )}

      {data && data.slots.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
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
                  <td className="text-end">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={bookingId === slot.id}
                      onClick={() => handleBook(slot.id)}
                    >
                      {bookingId === slot.id ? 'Booking...' : 'Book'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}