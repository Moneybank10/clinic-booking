import { useState } from 'react';
import { api } from '../api/api';
import { useFetch } from '../hooks/useFetch';
import CancelModal from '../components/CancelModal.jsx';
import { formatTime, isPast } from '../utils/format';

export default function TodaySchedulePage() {
  const { data, loading, error, reload } = useFetch('/appointments/today');
  const [cancelTarget, setCancelTarget] = useState(null);

  async function confirmCancel(reason) {
    await api(`/appointments/${cancelTarget.id}/cancel`, {
      method: 'PATCH',
      body: { reason },
    });
    setCancelTarget(null);
    reload();
  }

  if (loading) return <p>Loading today's schedule...</p>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Today's schedule</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={reload}>
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {data && data.appointments.length === 0 && (
        <p className="text-muted">No appointments booked for today.</p>
      )}

      {data && data.appointments.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Email</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.appointments.map((a) => (
                <tr key={a.id}>
                  <td>
                    {formatTime(a.start_time)} – {formatTime(a.end_time)}
                  </td>
                  <td>{a.patient_name}</td>
                  <td>{a.patient_email}</td>
                  <td className="text-end">
                    {isPast(a.end_time) ? (
  <span className="badge text-bg-dark">Past</span>
) : (
  <button className="btn btn-outline-danger btn-sm" onClick={() => setCancelTarget(a)}>
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