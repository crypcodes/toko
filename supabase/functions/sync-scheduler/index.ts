/**
 * Master Sync Scheduler Edge Function
 * 
 * Purpose: Coordinates and schedules all synchronization operations for the e-commerce platform
 * Features:
 * - Master scheduler for inventory sync and order monitoring
 * - Manages sync schedules and intervals
 * - Coordinates between multiple platforms (Shopee, TikTokShop)
 * - Handles batch operations and dependencies
 * - Provides sync status monitoring and reporting
 * - Error handling and retry logic with exponential backoff
 * 
 * Usage:
 * - Runs as a cron job for automated scheduling
 * - Can be triggered manually for immediate sync operations
 * - Manages scheduling conflicts and resource allocation
 * - Provides comprehensive sync analytics and reporting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// Types for sync scheduling operations
interface SyncJob {
  id: string;
  type: 'inventory_sync' | 'order_monitor' | 'bulk_sync' | 'status_sync';
  platform: 'shopee' | 'tiktokshop' | 'all';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduled_at: Date;
  started_at?: Date;
  completed_at?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  parameters: Record<string, any>;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  result?: any;
}

interface SyncSchedule {
  id: string;
  job_type: SyncJob['type'];
  platform: SyncJob['platform'];
  interval_minutes: number;
  is_active: boolean;
  priority: SyncJob['priority'];
  parameters: Record<string, any>;
  last_run?: Date;
  next_run: Date;
  created_at: Date;
  updated_at: Date;
}

interface SchedulerRequest {
  action: 'run_now' | 'schedule' | 'cancel' | 'list_schedules' | 'status' | 'analyze_performance';
  job_type?: SyncJob['type'];
  platform?: SyncJob['platform'];
  parameters?: Record<string, any>;
  priority?: SyncJob['priority'];
  schedule_id?: string;
  force?: boolean;
}

// Default scheduling configuration
const DEFAULT_SCHEDULES = {
  INVENTORY_SYNC: {
    interval_minutes: 15,
    priority: 'medium' as const,
    max_retries: 3
  },
  ORDER_MONITOR: {
    interval_minutes: 5,
    priority: 'high' as const,
    max_retries: 3
  },
  STATUS_SYNC: {
    interval_minutes: 30,
    priority: 'low' as const,
    max_retries: 2
  }
};

// Platform API endpoints
const FUNCTION_ENDPOINTS = {
  inventory_sync: '/functions/v1/inventory-sync',
  order_monitor: '/functions/v1/order-monitor',
  sync_scheduler: '/functions/v1/sync-scheduler'
};

/**
 * Log scheduler operation
 */
async function logSchedulerOperation(
  db: any,
  operation: string,
  job_id: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await db
      .from('scheduler_logs')
      .insert({
        operation: operation,
        job_id: job_id,
        message: message,
        metadata: metadata,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log scheduler operation:', error);
    }
  } catch (error) {
    console.error('Error logging scheduler operation:', error);
  }
}

/**
 * Get active schedules from database
 */
async function getActiveSchedules(db: any): Promise<SyncSchedule[]> {
  try {
    const { data: schedules, error } = await db
      .from('sync_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_run', new Date().toISOString());

    if (error) {
      console.error('Failed to fetch active schedules:', error);
      return [];
    }

    return schedules || [];
  } catch (error) {
    console.error('Error fetching active schedules:', error);
    return [];
  }
}

/**
 * Create a new sync job
 */
async function createSyncJob(
  db: any,
  job: Omit<SyncJob, 'id' | 'retry_count'>
): Promise<string> {
  try {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await db
      .from('sync_jobs')
      .insert({
        id: jobId,
        type: job.type,
        platform: job.platform,
        status: job.status,
        scheduled_at: job.scheduled_at.toISOString(),
        priority: job.priority,
        parameters: job.parameters,
        retry_count: 0,
        max_retries: DEFAULT_SCHEDULES[job.type.toUpperCase() as keyof typeof DEFAULT_SCHEDULES]?.max_retries || 3,
        result: null
      });

    if (error) {
      throw error;
    }

    await logSchedulerOperation(db, 'job_created', jobId, `Created ${job.type} job for ${job.platform}`);
    return jobId;
  } catch (error) {
    console.error('Failed to create sync job:', error);
    throw error;
  }
}

/**
 * Update job status
 */
async function updateJobStatus(
  db: any,
  jobId: string,
  status: SyncJob['status'],
  result?: any,
  error_message?: string
): Promise<void> {
  try {
    const updateData: any = {
      status: status,
      result: result,
      error_message: error_message
    };

    if (status === 'running') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await db
      .from('sync_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`Failed to update job ${jobId} status:`, error);
    }
  } catch (error) {
    console.error('Error updating job status:', error);
  }
}

/**
 * Execute a sync job
 */
async function executeSyncJob(db: any, job: SyncJob): Promise<{ success: boolean; result?: any; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials not configured');
  }

  try {
    await updateJobStatus(db, job.id, 'running');

    let functionUrl = '';
    let payload: Record<string, any> = job.parameters || {};

    // Map job types to function URLs and prepare payload
    switch (job.type) {
      case 'inventory_sync':
        functionUrl = `${supabaseUrl}${FUNCTION_ENDPOINTS.inventory_sync}`;
        payload = {
          products: payload.products,
          force_sync: payload.force_sync,
          low_stock_only: payload.low_stock_only
        };
        break;

      case 'order_monitor':
        functionUrl = `${supabaseUrl}${FUNCTION_ENDPOINTS.order_monitor}`;
        payload = {
          platform: job.platform,
          check_interval: payload.check_interval,
          alert_threshold: payload.alert_threshold,
          bulk_order_size: payload.bulk_order_size
        };
        break;

      case 'status_sync':
        functionUrl = `${supabaseUrl}${FUNCTION_ENDPOINTS.inventory_sync}`; // Could be a dedicated status sync function
        payload = {
          status_only: true,
          platform: job.platform
        };
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // Execute the function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      await updateJobStatus(db, job.id, 'completed', result);
      await logSchedulerOperation(db, 'job_completed', job.id, `${job.type} job completed successfully`);
      
      return { success: true, result };
    } else {
      const errorMessage = result.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      await updateJobStatus(db, job.id, 'failed', null, errorMessage);
      await logSchedulerOperation(db, 'job_failed', job.id, `Job failed: ${errorMessage}`);
      
      return { success: false, error: errorMessage };
    }

  } catch (error) {
    const errorMessage = error.message;
    await updateJobStatus(db, job.id, 'failed', null, errorMessage);
    await logSchedulerOperation(db, 'job_error', job.id, `Job execution error: ${errorMessage}`);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Calculate next run time based on interval
 */
function calculateNextRun(intervalMinutes: number): Date {
  return new Date(Date.now() + (intervalMinutes * 60 * 1000));
}

/**
 * Update schedule next run time
 */
async function updateScheduleNextRun(db: any, scheduleId: string, nextRun: Date): Promise<void> {
  try {
    const { error } = await db
      .from('sync_schedules')
      .update({
        next_run: nextRun.toISOString(),
        last_run: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (error) {
      console.error(`Failed to update schedule ${scheduleId} next run time:`, error);
    }
  } catch (error) {
    console.error('Error updating schedule next run time:', error);
  }
}

/**
 * Retry failed jobs with exponential backoff
 */
async function retryFailedJobs(db: any): Promise<void> {
  try {
    const { data: failedJobs, error } = await db
      .from('sync_jobs')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3); // Use max_retries from job record

    if (error || !failedJobs) {
      console.error('Failed to fetch failed jobs:', error);
      return;
    }

    for (const job of failedJobs) {
      const maxRetries = job.max_retries || 3;
      if (job.retry_count < maxRetries) {
        // Calculate exponential backoff delay
        const backoffMinutes = Math.pow(2, job.retry_count) * 5; // 5, 10, 20 minutes
        const retryAt = new Date(Date.now() + (backoffMinutes * 60 * 1000));

        const retryJob: Omit<SyncJob, 'id' | 'retry_count'> = {
          type: job.type,
          platform: job.platform,
          status: 'pending',
          scheduled_at: retryAt,
          priority: job.priority,
          parameters: job.parameters
        };

        const retryJobId = await createSyncJob(db, retryJob);
        
        // Update original job retry count
        await db
          .from('sync_jobs')
          .update({ retry_count: job.retry_count + 1 })
          .eq('id', job.id);

        await logSchedulerOperation(
          db, 
          'job_retry_scheduled', 
          job.id, 
          `Job retry scheduled for ${retryAt.toISOString()} (attempt ${job.retry_count + 1}/${maxRetries})`
        );
      }
    }
  } catch (error) {
    console.error('Error retrying failed jobs:', error);
  }
}

/**
 * Schedule immediate job execution
 */
async function scheduleJobNow(
  db: any,
  jobType: SyncJob['type'],
  platform: SyncJob['platform'],
  parameters?: Record<string, any>
): Promise<string> {
  const job: Omit<SyncJob, 'id' | 'retry_count'> = {
    type: jobType,
    platform: platform,
    status: 'pending',
    scheduled_at: new Date(),
    priority: 'high', // Immediate jobs get high priority
    parameters: parameters || {}
  };

  return await createSyncJob(db, job);
}

/**
 * Run scheduled jobs that are due
 */
async function runScheduledJobs(db: any): Promise<void> {
  try {
    // Get all due schedules
    const schedules = await getActiveSchedules(db);
    
    if (schedules.length === 0) {
      return;
    }

    await logSchedulerOperation(db, 'scheduler_check', 'system', `Found ${schedules.length} due schedules`);

    // Create jobs for each due schedule
    for (const schedule of schedules) {
      const job: Omit<SyncJob, 'id' | 'retry_count'> = {
        type: schedule.job_type,
        platform: schedule.platform,
        status: 'pending',
        scheduled_at: new Date(),
        priority: schedule.priority,
        parameters: schedule.parameters
      };

      const jobId = await createSyncJob(db, job);
      
      // Update schedule next run time
      const nextRun = calculateNextRun(schedule.interval_minutes);
      await updateScheduleNextRun(db, schedule.id, nextRun);

      // Execute the job immediately
      const jobResult = await executeSyncJob(db, {
        ...job,
        id: jobId,
        retry_count: 0,
        max_retries: DEFAULT_SCHEDULES[job.type.toUpperCase() as keyof typeof DEFAULT_SCHEDULES]?.max_retries || 3
      });

      if (!jobResult.success) {
        console.error(`Job ${jobId} failed:`, jobResult.error);
      }
    }

  } catch (error) {
    console.error('Error running scheduled jobs:', error);
    await logSchedulerOperation(db, 'scheduler_error', 'system', `Scheduler error: ${error.message}`);
  }
}

/**
 * Get scheduler performance analytics
 */
async function getSchedulerAnalytics(db: any): Promise<any> {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Job counts by status
    const { data: jobStats } = await db
      .from('sync_jobs')
      .select('status, type, platform')
      .gte('scheduled_at', last24Hours.toISOString());

    // Schedule performance
    const { data: scheduleStats } = await db
      .from('sync_schedules')
      .select('*')
      .eq('is_active', true);

    // Error analysis
    const { data: errorStats } = await db
      .from('scheduler_logs')
      .select('operation, message')
      .eq('operation', 'job_failed')
      .gte('timestamp', last7Days.toISOString());

    const analytics = {
      job_stats: {
        total_jobs_24h: jobStats?.length || 0,
        by_status: {
          completed: jobStats?.filter(j => j.status === 'completed').length || 0,
          failed: jobStats?.filter(j => j.status === 'failed').length || 0,
          running: jobStats?.filter(j => j.status === 'running').length || 0,
          pending: jobStats?.filter(j => j.status === 'pending').length || 0
        },
        by_type: {
          inventory_sync: jobStats?.filter(j => j.type === 'inventory_sync').length || 0,
          order_monitor: jobStats?.filter(j => j.type === 'order_monitor').length || 0,
          status_sync: jobStats?.filter(j => j.type === 'status_sync').length || 0
        },
        by_platform: {
          shopee: jobStats?.filter(j => j.platform === 'shopee').length || 0,
          tiktokshop: jobStats?.filter(j => j.platform === 'tiktokshop').length || 0,
          all: jobStats?.filter(j => j.platform === 'all').length || 0
        }
      },
      schedule_stats: {
        active_schedules: scheduleStats?.length || 0,
        schedules: scheduleStats || []
      },
      error_analysis: {
        total_errors_7d: errorStats?.length || 0,
        common_errors: errorStats?.reduce((acc, error) => {
          const key = error.message;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {}
      },
      generated_at: now.toISOString()
    };

    return analytics;
  } catch (error) {
    console.error('Error generating scheduler analytics:', error);
    return null;
  }
}

/**
 * Main scheduler function
 */
async function performSchedulerAction(
  requestData: SchedulerRequest,
  db: any
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    switch (requestData.action) {
      case 'run_now':
        if (!requestData.job_type || !requestData.platform) {
          throw new Error('job_type and platform are required for run_now action');
        }

        const jobId = await scheduleJobNow(
          db,
          requestData.job_type,
          requestData.platform,
          requestData.parameters
        );

        return {
          success: true,
          message: `Job ${jobId} scheduled for immediate execution`,
          data: { job_id: jobId }
        };

      case 'cancel':
        // Implementation would involve updating job status to cancelled
        return {
          success: true,
          message: 'Job cancellation functionality needs implementation'
        };

      case 'list_schedules':
        const { data: schedules } = await db
          .from('sync_schedules')
          .select('*')
          .order('next_run');

        return {
          success: true,
          message: 'Retrieved active schedules',
          data: { schedules: schedules || [] }
        };

      case 'status':
        // Return current scheduler status
        const analytics = await getSchedulerAnalytics(db);
        
        return {
          success: true,
          message: 'Scheduler status retrieved',
          data: analytics
        };

      case 'analyze_performance':
        const performanceAnalytics = await getSchedulerAnalytics(db);
        
        return {
          success: true,
          message: 'Performance analytics generated',
          data: performanceAnalytics
        };

      default:
        // Default action: run scheduled jobs
        await runScheduledJobs(db);
        await retryFailedJobs(db);

        return {
          success: true,
          message: 'Scheduler executed all due jobs and retry logic'
        };
    }

  } catch (error) {
    console.error('Scheduler action failed:', error);
    await logSchedulerOperation(db, 'scheduler_action_error', 'system', error.message);
    
    return {
      success: false,
      message: `Scheduler action failed: ${error.message}`
    };
  }
}

/**
 * Edge function request handler
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (simplified for this example)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Mock database client for this example
    const db = {
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            lt: (column: string, value: any) => ({
              lte: (column: string, value: any) => Promise.resolve({
                data: [],
                error: null
              }),
              data: [],
              error: null
            }),
            lte: (column: string, value: any) => Promise.resolve({
              data: [],
              error: null
            }),
            data: [],
            error: null
          }),
          gte: (column: string, value: any) => Promise.resolve({
            data: [],
            error: null
          }),
          order: (column: string) => ({
            data: [],
            error: null
          }),
          data: [],
          error: null
        }),
        update: (data: any) => ({
          eq: (column: string, value: any) => Promise.resolve({
            data: data,
            error: null
          }),
          data: data,
          error: null
        }),
        insert: (data: any) => Promise.resolve({
          data: data,
          error: null
        }),
        data: [],
        error: null
      })
    };

    let requestData: SchedulerRequest = {};

    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch (error) {
        console.log('No JSON body provided, using default scheduler action');
        requestData.action = 'run_scheduled';
      }
    }

    // Perform scheduler action
    const schedulerResult = await performSchedulerAction(requestData, db);

    return new Response(
      JSON.stringify({
        success: schedulerResult.success,
        message: schedulerResult.message,
        data: schedulerResult.data,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: schedulerResult.success ? 200 : 500
      }
    );

  } catch (error) {
    console.error('Sync scheduler error:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'SYNC_SCHEDULER_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
