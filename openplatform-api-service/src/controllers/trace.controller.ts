/**
 * Trace Controller
 * Provides trace query APIs for admin users
 */

import { Request, Response } from 'express';
import { getTraceStorage } from '../services/trace-storage.service';

/**
 * Get trace by ID
 */
export async function getTraceById(req: Request, res: Response): Promise<void> {
  try {
    const { traceId } = req.params;

    if (!traceId) {
      res.status(400).json({
        code: 40001,
        message: 'traceId is required',
      });
      return;
    }

    const storage = getTraceStorage();
    const trace = storage.getTrace(traceId);

    if (!trace) {
      res.status(404).json({
        code: 40401,
        message: 'Trace not found',
        trace_id: (req.headers as any)['x-trace-id'],
      });
      return;
    }

    res.json({
      code: 0,
      message: 'success',
      data: trace,
    });
  } catch (error) {
    console.error('Error getting trace:', error);
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: (req.headers as any)['x-trace-id'],
    });
  }
}

/**
 * List traces with filters and pagination
 */
export async function listTraces(req: Request, res: Response): Promise<void> {
  try {
    const {
      appid,
      endpoint,
      status,
      startTime,
      endTime,
      limit,
      offset,
    } = req.query;

    const storage = getTraceStorage();

    const result = storage.queryTraces({
      appid: appid as string,
      endpoint: endpoint as string,
      status: status as 'pending' | 'completed' | 'error',
      startTime: startTime ? parseInt(startTime as string, 10) : undefined,
      endTime: endTime ? parseInt(endTime as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json({
      code: 0,
      message: 'success',
      data: {
        traces: result.traces,
        total: result.total,
        limit: limit ? parseInt(limit as string, 10) : 20,
        offset: offset ? parseInt(offset as string, 10) : 0,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    console.error('Error listing traces:', error);
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: (req.headers as any)['x-trace-id'],
    });
  }
}

/**
 * Get trace statistics
 */
export async function getTraceStats(req: Request, res: Response): Promise<void> {
  try {
    const storage = getTraceStorage();
    const stats = storage.getStats();

    res.json({
      code: 0,
      message: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error getting trace stats:', error);
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: (req.headers as any)['x-trace-id'],
    });
  }
}

export default {
  getTraceById,
  listTraces,
  getTraceStats,
};
