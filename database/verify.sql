SELECT 'users' AS table_name, COUNT(*) AS total FROM "User"
UNION ALL SELECT 'patients', COUNT(*) FROM "Patient"
UNION ALL SELECT 'doctors', COUNT(*) FROM "Doctor"
UNION ALL SELECT 'visits', COUNT(*) FROM "Visit"
UNION ALL SELECT 'diagnoses', COUNT(*) FROM "Diagnosis"
UNION ALL SELECT 'medicines', COUNT(*) FROM "Medicine"
UNION ALL SELECT 'prescriptions', COUNT(*) FROM "Prescription"
UNION ALL SELECT 'invoices', COUNT(*) FROM "Invoice"
UNION ALL SELECT 'payments', COUNT(*) FROM "Payment"
ORDER BY table_name;

SELECT "email", "role" FROM "User" ORDER BY "id";

SELECT
  v."id",
  p."name" AS patient,
  d."name" AS doctor,
  v."visitDate",
  v."status"
FROM "Visit" v
JOIN "Patient" p ON p."id" = v."patientId"
JOIN "Doctor" d ON d."id" = v."doctorId"
ORDER BY v."visitDate";
