-- Migration: enhance_and_create_tables
-- Created at: 1762152590

-- Migration: enhance_and_create_tables
-- Created at: 1730732800
-- Description: Enhance existing tables and create new advanced sync tables

-- =============================================
-- ENHANCE EXISTING SYNC_LOGS TABLE
-- =============================================

-- Add missing columns to sync_logs if they don't exist
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS schedule_id UUID,
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS memory_usage_mb INTEGER,
ADD COLUMN IF NOT EXISTS api_calls_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update check constraint for sync_type to include new types
ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_sync_type_check;
ALTER TABLE sync_logs ADD CONSTRAINT sync_logs_sync_type_check 
CHECK (sync_type IN ('products', 'orders', 'inventory', 'full', 'scheduled', 'manual'));

-- Update check constraint for status to include new statuses
ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_status_check;
ALTER TABLE sync_logs ADD CONSTRAINT sync_logs_status_check 
CHECK (status IN ('running', 'success', 'partial', 'failed', 'cancelled'));

-- Add foreign key constraint for schedule_id (only after sync_schedules table exists)
-- This will be added after creating sync_schedules table

-- =============================================
-- ENHANCE EXISTING NOTIFICATIONS TABLE
-- =============================================

-- Add missing columns to notifications if they don't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update check constraint for type to include new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('new_order', 'low_stock', 'sync_error', 'system', 'sync_success', 'api_error', 'scheduled_sync'));

-- Update check constraint for priority
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check 
CHECK (priority IN ('low', 'normal', 'high', 'critical'));

-- =============================================
-- CREATE NEW SYNC_SCHEDULES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS sync_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('products', 'orders', 'inventory', 'full')),
  platform TEXT NOT NULL CHECK (platform IN ('shopee', 'tiktokshop', 'all')),
  enabled BOOLEAN DEFAULT true,
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  max_failures INTEGER DEFAULT 3,
  retry_delay_minutes INTEGER DEFAULT 5,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for sync_logs.schedule_id now that sync_schedules exists
ALTER TABLE sync_logs 
ADD CONSTRAINT IF NOT EXISTS fk_sync_logs_schedule_id 
FOREIGN KEY (schedule_id) REFERENCES sync_schedules(id) ON DELETE SET NULL;

-- =============================================
-- CREATE NEW LOW_STOCK_ALERTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopee', 'tiktokshop', 'warehouse')),
  current_stock INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_breach', 'out_of_stock', 'restock_needed')),
  severity TEXT DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'suppressed')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  auto_resolve_enabled BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, platform, alert_type)
);

-- =============================================
-- CREATE NEW API_CREDENTIALS_ENCRYPTED TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS api_credentials_encrypted (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopee', 'tiktokshop', 'custom')),
  credential_name TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  shop_name TEXT,
  api_base_url TEXT,
  app_id TEXT,
  client_id TEXT,
  client_secret_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  private_key_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  additional_credentials JSONB DEFAULT '{}',
  token_expires_at TIMESTAMPTZ,
  token_refresh_needed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  verification_status TEXT CHECK (verification_status IN ('pending', 'valid', 'invalid', 'expired')),
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  last_successful_call TIMESTAMPTZ,
  total_api_calls INTEGER DEFAULT 0,
  failed_api_calls INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, shop_id, credential_name)
);

-- =============================================
-- CREATE PERFORMANCE INDEXES
-- =============================================

-- Indexes for sync_logs (existing table)
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_schedule_id ON sync_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_updated_at ON sync_logs(updated_at DESC);

-- Indexes for notifications (existing table)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_updated_at ON notifications(updated_at DESC);

-- Indexes for sync_schedules (new table)
CREATE INDEX IF NOT EXISTS idx_sync_schedules_user_id ON sync_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_enabled ON sync_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_next_run ON sync_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_platform ON sync_schedules(platform);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_updated_at ON sync_schedules(updated_at DESC);

-- Indexes for low_stock_alerts (new table)
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_user_id ON low_stock_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_product_id ON low_stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_status ON low_stock_alerts(status);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_severity ON low_stock_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_created_at ON low_stock_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_updated_at ON low_stock_alerts(updated_at DESC);

-- Indexes for api_credentials_encrypted (new table)
CREATE INDEX IF NOT EXISTS idx_api_credentials_user_id ON api_credentials_encrypted(user_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_platform ON api_credentials_encrypted(platform);
CREATE INDEX IF NOT EXISTS idx_api_credentials_active ON api_credentials_encrypted(is_active);
CREATE INDEX IF NOT EXISTS idx_api_credentials_verified ON api_credentials_encrypted(is_verified);
CREATE INDEX IF NOT EXISTS idx_api_credentials_updated_at ON api_credentials_encrypted(updated_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_platform_status ON sync_logs(user_id, platform, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_active ON low_stock_alerts(user_id, status, created_at DESC);

-- =============================================
-- CREATE UPDATED_AT TRIGGERS
-- =============================================

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns (only if they don't exist)
DROP TRIGGER IF EXISTS update_sync_logs_updated_at ON sync_logs;
CREATE TRIGGER update_sync_logs_updated_at 
  BEFORE UPDATE ON sync_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_schedules_updated_at ON sync_schedules;
CREATE TRIGGER update_sync_schedules_updated_at 
  BEFORE UPDATE ON sync_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_low_stock_alerts_updated_at ON low_stock_alerts;
CREATE TRIGGER update_low_stock_alerts_updated_at 
  BEFORE UPDATE ON low_stock_alerts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_credentials_updated_at ON api_credentials_encrypted;
CREATE TRIGGER update_api_credentials_updated_at 
  BEFORE UPDATE ON api_credentials_encrypted 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();