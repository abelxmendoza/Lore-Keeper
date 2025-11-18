import { Router } from 'express';
import { supabaseAdmin } from '../services/supabaseClient';
import { config } from '../config';
import { logger } from '../logger';

const router = Router();

interface HealthCheck {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: 'ok' | 'error' | 'unknown';
    databaseResponseTime?: number;
    openai: 'configured' | 'not configured' | 'error';
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk?: {
      free: number;
      total: number;
      percentage: number;
    };
  };
  errors?: Array<{ service: string; message: string }>;
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Returns the health status of the API and its dependencies
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok, degraded, error]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 checks:
 *                   type: object
 *       503:
 *         description: Service is degraded
 *       500:
 *         description: Service is in error state
 */
router.get('/health', async (_req, res) => {
  const checks: HealthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      openai: 'unknown',
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        ),
      },
    },
    errors: [],
  };

  // Check database connection
  try {
    const startTime = Date.now();
    const { error } = await supabaseAdmin.from('journal_entries').select('id').limit(1);
    const responseTime = Date.now() - startTime;
    
    if (error) {
      checks.checks.database = 'error';
      checks.checks.databaseResponseTime = responseTime;
      checks.errors?.push({ 
        service: 'database', 
        message: `${error.message} (${responseTime}ms)` 
      });
      checks.status = 'degraded';
    } else {
      checks.checks.database = 'ok';
      checks.checks.databaseResponseTime = responseTime;
      logger.debug({ responseTime }, 'Database health check');
    }
  } catch (error) {
    checks.checks.database = 'error';
    checks.errors?.push({ 
      service: 'database', 
      message: error instanceof Error ? error.message : String(error) 
    });
    checks.status = 'error';
  }

  // Check OpenAI configuration
  try {
    if (config.openAiKey && config.openAiKey.length > 0 && config.openAiKey !== 'sk-xxx') {
      checks.checks.openai = 'configured';
    } else {
      checks.checks.openai = 'not configured';
      if (checks.status === 'ok') {
        checks.status = 'degraded';
      }
    }
  } catch (error) {
    checks.checks.openai = 'error';
    checks.errors?.push({ 
      service: 'openai', 
      message: error instanceof Error ? error.message : String(error) 
    });
  }

  // Check memory usage
  const memoryPercentage = checks.checks.memory.percentage;
  if (memoryPercentage > 90) {
    if (checks.status === 'ok') {
      checks.status = 'degraded';
    }
    checks.errors?.push({ 
      service: 'memory', 
      message: `High memory usage: ${memoryPercentage}%` 
    });
  }

  // Check disk space (if available)
  try {
    const fs = await import('fs/promises');
    const stats = await fs.statfs('/');
    const freeGB = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024);
    const totalGB = (stats.blocks * stats.bsize) / (1024 * 1024 * 1024);
    const usedPercentage = Math.round(((totalGB - freeGB) / totalGB) * 100);

    checks.checks.disk = {
      free: Math.round(freeGB * 100) / 100,
      total: Math.round(totalGB * 100) / 100,
      percentage: usedPercentage,
    };

    if (usedPercentage > 90) {
      if (checks.status === 'ok') {
        checks.status = 'degraded';
      }
      checks.errors?.push({ 
        service: 'disk', 
        message: `Low disk space: ${usedPercentage}% used` 
      });
    }
  } catch (error) {
    // Disk check is optional, don't fail if it's not available
    logger.debug({ error }, 'Disk space check unavailable');
  }

  const statusCode = checks.status === 'ok' ? 200 : checks.status === 'degraded' ? 503 : 500;
  res.status(statusCode).json(checks);
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check endpoint
 *     tags: [Health]
 *     description: Simple readiness check for load balancers
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (_req, res) => {
  try {
    const { error } = await supabaseAdmin.from('journal_entries').select('id').limit(1);
    if (error) {
      return res.status(503).json({ 
        status: 'not ready', 
        error: error.message,
        code: error.code 
      });
    }
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * @swagger
 * /live:
 *   get:
 *     summary: Liveness check endpoint
 *     tags: [Health]
 *     description: Simple liveness check for Kubernetes
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (_req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

export default router;
