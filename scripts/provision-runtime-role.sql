-- Infraestrutura Supabase: executar uma vez como administrador, após as migrações.
-- A senha é provisionada separadamente e nunca deve ser incluída neste arquivo.
-- Papel exclusivo do backend; a aplicação autoriza cada usuário/agência.
CREATE ROLE postito_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;

GRANT CONNECT ON DATABASE postgres TO postito_runtime;
GRANT USAGE ON SCHEMA postito TO postito_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA postito TO postito_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA postito TO postito_runtime;
ALTER ROLE postito_runtime SET search_path = pg_catalog, postito;
ALTER ROLE postito_runtime SET statement_timeout = '30s';
ALTER ROLE postito_runtime SET idle_in_transaction_session_timeout = '30s';

DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'postito' AND c.relkind = 'r'
  LOOP
    EXECUTE format(
      'CREATE POLICY postito_backend_access ON postito.%I FOR ALL TO postito_runtime USING (true) WITH CHECK (true)',
      target.relname
    );
  END LOOP;
END $$;

-- Não conceder este papel a anon, authenticated ou authenticator.
-- Não desativar RLS, conceder BYPASSRLS ou tornar o papel proprietário.
-- Tabelas futuras precisam de grants e políticas explícitos na mesma migração.
