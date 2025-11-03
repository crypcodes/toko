-- Migration: setup_advanced_sync_rls_policies
-- Created at: 1762152666

-- Migration: setup_advanced_sync_rls_policies
-- Created at: 1730732801
-- Description: Row Level Security policies for advanced synchronization tables

-- Enable Row Level Security on all advanced sync tables
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials_encrypted ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SYNC LOGS POLICIES
-- =============================================

-- Users can view their own sync logs
CREATE POLICY "Users can view own sync logs" ON sync_logs
  FOR SELECT USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can insert their own sync logs
CREATE POLICY "Users can insert own sync logs" ON sync_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can update their own sync logs (limited update capability)
CREATE POLICY "Users can update own sync logs" ON sync_logs
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Service role can manage all sync logs
CREATE POLICY "Service role can manage sync logs" ON sync_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can insert their own notifications (primarily for system/service role)
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id OR auth.role() IN ('anon', 'service_role'));

-- Service role can manage all notifications
CREATE POLICY "Service role can manage notifications" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

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

-- Service role can manage all API credentials (for system operations)
CREATE POLICY "Service role can manage API credentials" ON api_credentials_encrypted
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- ADVANCED SECURITY POLICIES
-- =============================================

-- Additional policies for enhanced security

-- Only allow users to view their own data even when joining tables
CREATE POLICY "Users can join own data through foreign keys" ON sync_logs
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM sync_schedules ss 
      WHERE ss.id = sync_logs.schedule_id 
      AND ss.user_id = auth.uid()
    ) OR 
    auth.role() IN ('anon', 'service_role')
  );

-- Prevent users from accessing other users' schedule logs
CREATE POLICY "Users can access only their schedule logs" ON sync_logs
  FOR SELECT USING (
    schedule_id IS NULL OR
    EXISTS (
      SELECT 1 FROM sync_schedules ss 
      WHERE ss.id = sync_logs.schedule_id 
      AND ss.user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- =============================================
-- AUDIT AND MONITORING POLICIES
-- =============================================

-- Allow service role to create audit logs
CREATE POLICY "Service role can create audit logs" ON sync_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow users to mark notifications as read
CREATE POLICY "Users can mark own notifications as read" ON notifications
  FOR UPDATE USING (auth.uid() = user_id AND OLD.is_read = false)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to create system notifications
CREATE POLICY "Service role can create system notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);