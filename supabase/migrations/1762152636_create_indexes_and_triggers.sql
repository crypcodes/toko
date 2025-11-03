-- Migration: create_indexes_and_triggers
-- Created at: 1762152636

-- Migration: create_indexes_and_triggers
-- Created at: 1730732801
-- Description: Create performance indexes and triggers for all tables

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