-- PostgreSQL starting schema for production persistence.
-- The local demo uses a JSON store; these constraints document the production data model.
CREATE TYPE account_role AS ENUM ('admin', 'dealer', 'buyer');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE reservation_status AS ENUM ('requested', 'awaiting_dealer_approval', 'reserved', 'confirmed', 'rejected', 'expired', 'released', 'converted_to_order');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), role account_role NOT NULL,
  email text NOT NULL UNIQUE, password_hash text NOT NULL, full_name text NOT NULL,
  mobile text NOT NULL, status review_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
  CHECK (length(email) <= 254)
);
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  legal_name text NOT NULL, gstin char(15) NOT NULL UNIQUE, pan char(10),
  business_type text, website text, gst_status text NOT NULL DEFAULT 'pending',
  billing_address jsonb, shipping_address jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gst_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id),
  gstin char(15) NOT NULL, provider text NOT NULL DEFAULT 'manual', status text NOT NULL DEFAULT 'pending',
  verified_name text, response jsonb, checked_at timestamptz NOT NULL DEFAULT now(),
  checked_by uuid REFERENCES users(id)
);
CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id),
  address_type text NOT NULL CHECK (address_type IN ('billing','shipping','dealer')), line1 text NOT NULL,
  line2 text, city text NOT NULL, state text NOT NULL, pin char(6) NOT NULL, country char(2) NOT NULL DEFAULT 'IN',
  is_default boolean NOT NULL DEFAULT false
);
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE, description text NOT NULL DEFAULT '', logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dealer_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dealer_user_id uuid NOT NULL REFERENCES users(id),
  brand_id uuid NOT NULL REFERENCES brands(id), status review_status NOT NULL DEFAULT 'pending',
  certificate_url text, valid_from date, valid_until date, verified_at timestamptz,
  UNIQUE (dealer_user_id, brand_id)
);
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id), active boolean NOT NULL DEFAULT true
);
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dealer_user_id uuid NOT NULL REFERENCES users(id),
  brand_id uuid NOT NULL REFERENCES brands(id), category_id uuid NOT NULL REFERENCES categories(id),
  name text NOT NULL, model text, sku text, mrp numeric(12,2) NOT NULL CHECK (mrp >= 0),
  b2b_price numeric(12,2) NOT NULL CHECK (b2b_price >= 0), gst_rate numeric(5,2) NOT NULL DEFAULT 18,
  hsn_code text, moq integer NOT NULL CHECK (moq > 0), stock_total integer NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
  stock_sold integer NOT NULL DEFAULT 0 CHECK (stock_sold >= 0 AND stock_sold <= stock_total),
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding_moq integer CHECK (branding_moq > 0), branding_cost numeric(12,2) CHECK (branding_cost >= 0),
  branding_lead_days integer CHECK (branding_lead_days >= 0), lead_days integer CHECK (lead_days >= 0),
  stock_source text CHECK (stock_source IN ('manual','csv','demo','unknown')), stock_updated_at timestamptz,
  active boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_supplier_sku ON products(dealer_user_id, lower(btrim(sku)))
  WHERE sku IS NOT NULL AND btrim(sku) <> '';
CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_key text NOT NULL, alt_text text, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bulk_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_min integer NOT NULL, quantity_max integer, unit_price numeric(12,2) NOT NULL,
  CHECK (quantity_min > 0 AND (quantity_max IS NULL OR quantity_max >= quantity_min))
);
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES products(id),
  buyer_user_id uuid NOT NULL REFERENCES users(id), dealer_user_id uuid NOT NULL REFERENCES users(id),
  quantity integer NOT NULL CHECK (quantity > 0), status reservation_status NOT NULL DEFAULT 'requested',
  expires_at timestamptz NOT NULL, delivery_address jsonb, remarks text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reservations_live_by_product ON reservations(product_id, expires_at)
  WHERE status IN ('requested','awaiting_dealer_approval','reserved','confirmed');
CREATE INDEX products_discovery ON products(brand_id, category_id, active, updated_at DESC);
CREATE INDEX businesses_gstin_lookup ON businesses(gstin, gst_status);

CREATE TABLE enquiry_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_user_id uuid NOT NULL REFERENCES users(id),
  idempotency_key text NOT NULL, request_fingerprint text NOT NULL, items jsonb NOT NULL,
  delivery_date date NOT NULL, delivery_address jsonb NOT NULL, requirements text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(buyer_user_id, idempotency_key)
);
CREATE TABLE supplier_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dealer_user_id uuid NOT NULL REFERENCES users(id),
  preview_id uuid NOT NULL, report jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dealer_user_id, preview_id)
);
CREATE TABLE enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_user_id uuid NOT NULL REFERENCES users(id),
  dealer_user_id uuid NOT NULL REFERENCES users(id), product_id uuid NOT NULL REFERENCES products(id),
  batch_id uuid REFERENCES enquiry_batches(id),
  quantity integer NOT NULL CHECK (quantity > 0), delivery_date date, delivery_address jsonb,
  requirements text, status text NOT NULL DEFAULT 'awaiting_response', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enquiries_by_dealer ON enquiries(dealer_user_id, status, created_at DESC);
CREATE TABLE quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enquiry_id uuid NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0), gst_rate numeric(5,2) NOT NULL,
  delivery_charges numeric(12,2) NOT NULL DEFAULT 0, lead_time text, valid_until timestamptz,
  terms text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid UNIQUE REFERENCES reservations(id),
  buyer_user_id uuid NOT NULL REFERENCES users(id), dealer_user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'direct_confirmation', agreed_terms jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL, message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_inbox ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id),
  action text NOT NULL, entity_type text NOT NULL, entity_id uuid, before_state jsonb, after_state jsonb,
  request_id text, ip_hash text, created_at timestamptz NOT NULL DEFAULT now()
);

-- Reservation endpoint must execute this transaction at SERIALIZABLE isolation and retry 40001.
-- 1. Lock one product row with SELECT ... FOR UPDATE.
-- 2. Expire elapsed holds for that product.
-- 3. Sum active quantities and compare against total - sold.
-- 4. Insert reservation, then commit. Unique application retries use an idempotency key.
