-- Migration: add_missing_rls_policies
-- Created at: 1762152694

-- Migration: add_missing_rls_policies
-- Created at: 1730732802
-- Description: Add missing RLS policies for new and enhanced tables

-- Enable RLS on new tables if not already enabled
ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials_encrypted ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ADD MISSING SYNC_LOGS POLICIES
-- =============================================

-- Users can update their own sync logs (missing)
CREATE POLICY IF NOT EXISTS "Users can update own sync logs" ON sync_logs
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Service role can manage all sync logs (missing)
CREATE POLICY IF NOT EXISTS "Service role can manage sync logs" ON sync_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- SYNC SCHEDULES POLICIES (all new)
-- =============================================

-- Users can view their own sync schedules
CREATE POLICY "Users can view own sync schedules" ON sync_schedules
  FOR SELECT USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can insert their own sync schedules
CREATE POLICY "Users can insert own sync schedules" ON sync_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can update their own sync schedules
CREATE POLICY "Users can update own sync schedules" ON sync_schedules
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can delete their own sync schedules
CREATE POLICY "Users can delete own sync schedules" ON sync_schedules
  FOR DELETE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Service role can manage all sync schedules
CREATE POLICY "Service role can manage sync schedules" ON sync_schedules
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- LOW STOCK ALERTS POLICIES (all new)
-- =============================================

-- Users can view their own low stock alerts
CREATE POLICY "Users can view own low stock alerts" ON low_stock_alerts
  FOR SELECT USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can insert their own low stock alerts (primarily for system)
CREATE POLICY "Users can insert own low stock alerts" ON low_stock_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can update their own low stock alerts
CREATE POLICY "Users can update own low stock alerts" ON low_stock_alerts
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can acknowledge their own alerts
CREATE POLICY "Users can acknowledge own alerts" ON low_stock_alerts
  FOR UPDATE USING (auth.uid() = user_id AND (OLD.acknowledged_at IS NULL) OR auth.uid() = acknowledged_by)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = acknowledged_by);

-- Users can resolve their own alerts
CREATE POLICY "Users can resolve own alerts" ON low_stock_alerts
  FOR UPDATE USING (auth.uid() = user_id AND OLD.status != 'resolved' OR auth.uid() = resolved_by)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = resolved_by);

-- Users can delete their own low stock alerts
CREATE POLICY "Users can delete own low stock alerts" ON low_stock_alerts
  FOR DELETE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Service role can manage all low stock alerts
CREATE POLICY "Service role can manage low stock alerts" ON low_stock_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- API CREDENTIALS ENCRYPTED POLICIES (all new)
-- =============================================

-- Users can view their own API credentials
CREATE POLICY "Users can view own API credentials" ON api_credentials_encrypted
  FOR SELECT USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can insert their own API credentials
CREATE POLICY "Users can insert own API credentials" ON api_credentials_encrypted
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can update their own API credentials
CREATE POLICY "Users can update own API credentials" ON api_credentials_encrypted
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can delete their own API credentials
CREATE POLICY "Users can delete own API credentials" ON api_credentials_encrypted
  FOR DELETE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Service role can manage all API credentials (for system operations)
CREATE POLICY "Service role can manage API credentials" ON api_credentials_encrypted
  FOR ALL USING (auth.role() = 'service_role');