import { useState } from 'react';
import { api } from '../api/api';
import { useFetch } from '../hooks/useFetch';
import CancelModal from '../components/CancelModal.jsx';
import { formatDate, formatTime } from '../utils/format';

export default function MyAppointmentsPage() {
  const { data, loading, error, reload } = useFetch('/appointments/mine');
  const [cancelTarget, setCancelTarget] = useState(null);

  async function confirmCancel(reason) {
    await api(`/appointments/${cancelTarget.id}/cancel`, {
      method: 'PATCH',
      body: { reason },
    });
    setCancelTarget(null);
    reload();
  }

  if (loading) return <p>Loading your appointments...</p>;

  return (
    <div>
      <h2 className="h4 mb-3">My appointments</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {data && data.appointments.length === 0 && (
        <p className="text-muted">You have no appointments yet. Book one from Open Slots.</p>
      )}

      {data && data.appointments.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Details</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.appointments.map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.start_time)}</td>
                  <td>
                    {formatTime(a.start_time)} – {formatTime(a.end_time)}
                  </td>
                  <td>
                    {a.status === 'booked' ? (
                      <span className="badge text-bg-success">Booked</span>
                    ) : (
                      <span className="badge text-bg-secondary">Cancelled</span>
                    )}
                  </td>
                  <td>
                    {a.status === 'cancelled' && (
                      <small className="text-muted">
                        {a.cancelled_by_clinic ? 'Cancelled by the clinic' : 'Cancelled by you'}
                        {a.cancel_reason && `: ${a.cancel_reason}`}
                      </small>
                    )}
                  </td>
                  <td className="text-end">
                    {a.status === 'booked' && (
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => setCancelTarget(a)}
                      >
                        Cancel
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