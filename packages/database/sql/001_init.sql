-- ============================================================================
-- Marketplace Growth Engine — Schema Postgres (DDL nativo)
--
-- Este é o schema de referência espelhado em prisma/schema.prisma. Foi escrito
-- em SQL puro porque a sandbox de execução não tinha acesso a registros de
-- pacotes (npm/PyPI/apt) no momento da construção, o que impediu instalar o
-- Prisma CLI. É Postgres padrão: aplica sem alterações em Neon/Supabase e o
-- prisma/schema.prisma pode ser usado depois para gerar migrações Prisma
-- equivalentes (`prisma db pull` a partir deste banco também funciona).
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'SDR' CHECK (role IN ('ADMIN','CLOSER','SDR','VIEWER')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS segments (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  "order"       INT NOT NULL DEFAULT 0,
  description   TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS service_packages (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS price_versions (
  id              BIGSERIAL PRIMARY KEY,
  package_id      BIGINT NOT NULL REFERENCES service_packages(id),
  price_cents     BIGINT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BRL',
  duration_days   INT,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until     TIMESTAMPTZ,
  note            TEXT,
  is_founder_offer BOOLEAN NOT NULL DEFAULT FALSE,
  max_founder_slots INT
);

CREATE TABLE IF NOT EXISTS discount_policies (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  max_percent        INT NOT NULL,
  requires_approval  BOOLEAN NOT NULL DEFAULT TRUE,
  active             BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                    BIGSERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,
  segment_id            BIGINT NOT NULL REFERENCES segments(id),
  owner_id              BIGINT NOT NULL REFERENCES users(id),
  region                TEXT,
  cnaes                 TEXT[] NOT NULL DEFAULT '{}',
  keywords              TEXT[] NOT NULL DEFAULT '{}',
  exclusions            TEXT[] NOT NULL DEFAULT '{}',
  offer_id              BIGINT REFERENCES service_packages(id),
  max_companies         INT NOT NULL DEFAULT 100,
  daily_search_limit    INT NOT NULL DEFAULT 20,
  daily_outreach_limit  INT NOT NULL DEFAULT 10,
  start_date            DATE,
  end_date              DATE,
  status                TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RUNNING','PAUSED','COMPLETED')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_budgets (
  id             BIGSERIAL PRIMARY KEY,
  campaign_id    BIGINT NOT NULL REFERENCES campaigns(id),
  date           DATE NOT NULL,
  searches_used  INT NOT NULL DEFAULT 0,
  outreach_used  INT NOT NULL DEFAULT 0,
  UNIQUE(campaign_id, date)
);

CREATE TABLE IF NOT EXISTS companies (
  id                      BIGSERIAL PRIMARY KEY,
  legal_name              TEXT NOT NULL,
  trade_name              TEXT,
  cnpj                    TEXT UNIQUE,
  cnae_primary            TEXT,
  cnae_secondary          TEXT[] NOT NULL DEFAULT '{}',
  city                    TEXT,
  state                   TEXT,
  website                 TEXT,
  instagram               TEXT,
  public_business_email   TEXT,
  public_business_phone   TEXT,
  catalog_summary         TEXT,
  estimated_sku_range_min INT,
  estimated_sku_range_max INT,
  segment_id              BIGINT REFERENCES segments(id),
  campaign_id             BIGINT REFERENCES campaigns(id),
  status                  TEXT NOT NULL DEFAULT 'FOUND',
  blocked                 BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_segment ON companies(segment_id);

CREATE TABLE IF NOT EXISTS contacts (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  name          TEXT,
  role          TEXT,
  email         TEXT,
  phone         TEXT,
  whatsapp      TEXT,
  linkedin      TEXT,
  source_note   TEXT,
  confidence    TEXT,
  has_business_context BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  type          TEXT NOT NULL,
  url           TEXT,
  note          TEXT,
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_presences (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  channel           TEXT NOT NULL CHECK (channel IN ('MERCADO_LIVRE','AMAZON','SHOPEE','TIKTOK_SHOP')),
  present           BOOLEAN NOT NULL DEFAULT FALSE,
  listings_count    INT,
  reputation_note   TEXT,
  price_alignment   TEXT,
  evidence_url      TEXT,
  confidence        TEXT,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_findings (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  category      TEXT NOT NULL,
  summary       TEXT NOT NULL,
  evidence_url  TEXT,
  confidence    TEXT,
  source        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_scores (
  id                  BIGSERIAL PRIMARY KEY,
  company_id          BIGINT NOT NULL REFERENCES companies(id),
  product_fit         INT NOT NULL,
  marketplace_gap     INT NOT NULL,
  business_structure  INT NOT NULL,
  catalog_quality     INT NOT NULL,
  investment_signals  INT NOT NULL,
  contactability      INT NOT NULL,
  problem_clarity     INT NOT NULL,
  total               INT NOT NULL,
  potential           TEXT NOT NULL,
  suggested_offer_id  BIGINT REFERENCES service_packages(id),
  rationale           TEXT NOT NULL,
  confidence          TEXT NOT NULL,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_approvals (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  user_id       BIGINT NOT NULL REFERENCES users(id),
  decision      TEXT NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_messages (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  channel       TEXT NOT NULL,
  step          TEXT NOT NULL,
  text          TEXT NOT NULL,
  approved      BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_attempts (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  message_id        BIGINT REFERENCES outreach_messages(id),
  channel           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'DRAFT',
  responsible_id    BIGINT NOT NULL REFERENCES users(id),
  sent_at           TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  attempt_number    INT NOT NULL DEFAULT 1,
  human_confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  channel           TEXT NOT NULL,
  last_message_at   TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'aberta'
);

CREATE TABLE IF NOT EXISTS reply_classifications (
  id                BIGSERIAL PRIMARY KEY,
  conversation_id   BIGINT NOT NULL REFERENCES conversations(id),
  classification    TEXT NOT NULL,
  note              TEXT,
  classified_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id      BIGSERIAL PRIMARY KEY,
  code    TEXT NOT NULL UNIQUE,
  name    TEXT NOT NULL,
  "order" INT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS deals (
  id                      BIGSERIAL PRIMARY KEY,
  company_id              BIGINT NOT NULL REFERENCES companies(id),
  owner_id                BIGINT NOT NULL REFERENCES users(id),
  stage_id                BIGINT NOT NULL REFERENCES pipeline_stages(id),
  offer_id                BIGINT REFERENCES service_packages(id),
  value_proposed_cents    BIGINT,
  value_contracted_cents  BIGINT,
  discount_percent        INT DEFAULT 0,
  discount_reason         TEXT,
  discount_approved_by    TEXT,
  probability             INT DEFAULT 0,
  expected_close_date     DATE,
  loss_reason              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stage_history (
  id            BIGSERIAL PRIMARY KEY,
  deal_id       BIGINT REFERENCES deals(id),
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  user_id       BIGINT REFERENCES users(id),
  from_stage    TEXT,
  to_stage      TEXT NOT NULL,
  reason        TEXT,
  next_action   TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id          BIGSERIAL PRIMARY KEY,
  deal_id     BIGINT REFERENCES deals(id),
  type        TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id             BIGSERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  company_id     BIGINT REFERENCES companies(id),
  deal_id        BIGINT REFERENCES deals(id),
  owner_id       BIGINT NOT NULL REFERENCES users(id),
  due_at         TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','RESCHEDULED','CANCELLED')),
  cancel_reason  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at, status);

CREATE TABLE IF NOT EXISTS follow_up_rules (
  id                    BIGSERIAL PRIMARY KEY,
  step                  TEXT NOT NULL,
  days_after_previous   INT NOT NULL,
  channel               TEXT NOT NULL,
  active                BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT REFERENCES companies(id),
  title         TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  meeting_url   TEXT,
  status        TEXT NOT NULL DEFAULT 'confirmado'
);

CREATE TABLE IF NOT EXISTS meetings (
  id                      BIGSERIAL PRIMARY KEY,
  company_id              BIGINT NOT NULL REFERENCES companies(id),
  calendar_event_id       BIGINT REFERENCES calendar_events(id),
  owner_id                BIGINT NOT NULL REFERENCES users(id),
  type                    TEXT NOT NULL DEFAULT 'diagnostico',
  attended                BOOLEAN,
  recording_authorized    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS calls (
  id                BIGSERIAL PRIMARY KEY,
  meeting_id        BIGINT NOT NULL REFERENCES meetings(id),
  script            TEXT,
  decision_makers   TEXT,
  pain_points       TEXT,
  impact            TEXT,
  urgency           TEXT,
  budget            TEXT,
  next_step         TEXT,
  classification    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_notes (
  id          BIGSERIAL PRIMARY KEY,
  call_id     BIGINT NOT NULL REFERENCES calls(id),
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qualifications (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  current_stage     TEXT,
  channels          TEXT,
  catalog           TEXT,
  revenue_range     TEXT,
  team              TEXT,
  erp               TEXT,
  inventory         TEXT,
  tax_invoice       BOOLEAN,
  priority_problem  TEXT,
  deadline          TEXT,
  budget            TEXT,
  decision_makers   TEXT,
  offer_fit         TEXT,
  recommendation    TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposals (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES companies(id),
  deal_id       BIGINT REFERENCES deals(id),
  offer_id      BIGINT NOT NULL REFERENCES service_packages(id),
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  valid_until   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_versions (
  id                BIGSERIAL PRIMARY KEY,
  proposal_id       BIGINT NOT NULL REFERENCES proposals(id),
  price_version_id  BIGINT REFERENCES price_versions(id),
  final_price_cents BIGINT NOT NULL,
  discount_percent  INT NOT NULL DEFAULT 0,
  discount_reason   TEXT,
  approved_by       TEXT,
  scope_summary     TEXT NOT NULL,
  payment_terms     TEXT NOT NULL,
  file_url          TEXT,
  version           INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  deal_id           BIGINT REFERENCES deals(id),
  proposal_id       BIGINT REFERENCES proposals(id),
  status            TEXT NOT NULL DEFAULT 'DRAFT',
  file_url          TEXT,
  signed_file_url   TEXT,
  sent_at           TIMESTAMPTZ,
  signed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id            BIGSERIAL PRIMARY KEY,
  contract_id   BIGINT NOT NULL REFERENCES contracts(id),
  method        TEXT NOT NULL CHECK (method IN ('PIX','BOLETO','CARTAO','TRANSFERENCIA'))
);

CREATE TABLE IF NOT EXISTS installments (
  id            BIGSERIAL PRIMARY KEY,
  payment_id    BIGINT NOT NULL REFERENCES payments(id),
  seq           INT NOT NULL,
  amount_cents  BIGINT NOT NULL,
  due_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RECEIVED','LATE','CANCELLED')),
  paid_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_proofs (
  id                BIGSERIAL PRIMARY KEY,
  installment_id    BIGINT NOT NULL REFERENCES installments(id),
  file_url          TEXT NOT NULL,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_events (
  id                BIGSERIAL PRIMARY KEY,
  installment_id    BIGINT REFERENCES installments(id),
  company_id        BIGINT NOT NULL REFERENCES companies(id),
  type              TEXT NOT NULL,
  amount_cents      BIGINT NOT NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_projects (
  id                        BIGSERIAL PRIMARY KEY,
  company_id                BIGINT NOT NULL REFERENCES companies(id),
  kickoff_at                TIMESTAMPTZ,
  access_checklist_json     JSONB,
  schedule                  TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opt_outs (
  id              BIGSERIAL PRIMARY KEY,
  company_id      BIGINT NOT NULL REFERENCES companies(id),
  contact_value   TEXT NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blocklist (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL,
  value       TEXT NOT NULL,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, value)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  before_json JSONB,
  after_json  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);

CREATE TABLE IF NOT EXISTS data_exports (
  id            BIGSERIAL PRIMARY KEY,
  type          TEXT NOT NULL,
  file_url      TEXT,
  requested_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_views (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  name            TEXT NOT NULL,
  entity          TEXT NOT NULL,
  filters_json    JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_credentials (
  id              BIGSERIAL PRIMARY KEY,
  provider        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'nao_configurado',
  metadata_json   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id              BIGSERIAL PRIMARY KEY,
  provider        TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload_json    JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT FALSE,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_agendas (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE NOT NULL UNIQUE,
  summary_json  JSONB,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
