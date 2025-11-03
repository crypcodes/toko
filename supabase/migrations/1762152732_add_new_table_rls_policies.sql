-- Migration: add_new_table_rls_policies
-- Created at: 1762152732

-- Migration: add_new_table_rls_policies
-- Created at: 1730732803
-- Description: Add RLS policies for new tables only

-- Enable RLS on new tables
ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials_encrypted ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SYNC SCHEDULES POLICIES
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
-- LOW STOCK ALERTS POLICIES
-- =============================================

-- Users can view their own low stock alerts
CREATE POLICY "Users can view own low stock alerts" ON low_stock_alerts
  FOR SELECT USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can insert their own low stock alerts
CREATE POLICY "Users can insert own low stock alerts" ON low_stock_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can update their own low stock alerts
CREATE POLICY "Users can update own low stock alerts" ON low_stock_alerts
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can delete their own low stock alerts
CREATE POLICY "Users can delete own low stock alerts" ON low_stock_alerts
  FOR DELETE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Service role can manage all low stock alerts
CREATE POLICY "Service role can manage low stock alerts" ON low_stock_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- API CREDENTIALS ENCRYPTED POLICIES
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

-- Service role can manage all API credentials
CREATE POLICY "Service role can manage API credentials" ON api_credentials_encrypted
  FOR ALL USING (auth.role() = 'service_role');