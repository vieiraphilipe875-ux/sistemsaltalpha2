INSERT INTO members (id, email, name, role, agency_owner_id, status, password_hash, created_at)
VALUES ('manager-saude', 'admin@saude.com.br', 'Gerente da Agência', 'manager', 'manager-saude', 'active', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '2026-09-02T00:00:00.000Z')
ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, agency_owner_id = excluded.agency_owner_id, status = 'active', password_hash = excluded.password_hash;

INSERT INTO members (id, email, name, role, agency_owner_id, status, password_hash, created_at)
VALUES ('developer-ph', 'ph@gmail.com', 'PH', 'admin', NULL, 'active', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', '2026-09-02T00:00:00.000Z')
ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, agency_owner_id = NULL, status = 'active', password_hash = excluded.password_hash;
