CREATE TABLE users (
  id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(10) NOT NULL CHECK (role IN ('patient', 'staff')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (LOWER(email));

CREATE TABLE slots (
  id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slots_time_order CHECK (end_time > start_time),
  CONSTRAINT slots_start_unique UNIQUE (start_time)
);

CREATE TABLE appointments (
  id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slot_id       INT NOT NULL REFERENCES slots(id),
  patient_id    INT NOT NULL REFERENCES users(id),
  status        VARCHAR(10) NOT NULL DEFAULT 'booked'
                CHECK (status IN ('booked', 'cancelled')),
  booked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at  TIMESTAMPTZ,
  cancelled_by  INT REFERENCES users(id),
  cancel_reason TEXT,
  CONSTRAINT cancel_fields_consistent CHECK (
    (status = 'booked'    AND cancelled_at IS NULL AND cancelled_by IS NULL)
    OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
  )
);

-- The key line: only ONE active booking per slot
CREATE UNIQUE INDEX one_active_booking_per_slot
  ON appointments (slot_id)
  WHERE status = 'booked';

CREATE INDEX appointments_patient_idx ON appointments (patient_id);