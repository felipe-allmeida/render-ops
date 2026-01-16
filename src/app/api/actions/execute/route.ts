import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { actionHandlers, isValidAction, ActionParams } from '@/lib/actions';
import { z } from 'zod';

// Rate limiting store (in-memory, would use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

/**
 * Simple rate limiting
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count };
}

// Request schema
const executeActionSchema = z.object({
  action: z.string(),
  params: z.record(z.unknown()).optional(),
});

// POST /api/actions/execute - Execute an action
export async function POST(request: NextRequest) {
  let userId = 'anonymous';
  let actionName = 'unknown';
  let logParams: Record<string, unknown> | null = null;
  let success = false;
  let errorMessage: string | undefined;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = session.user.id;

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const validation = executeActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { action, params = {} } = validation.data;
    actionName = action;
    logParams = params as Record<string, unknown>;

    // Validate action
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    // Get connection string if connectionId is provided
    let connectionString: string | undefined;
    const actionParams = params as ActionParams;

    if (actionParams.connectionId) {
      const connection = await prisma.connection.findFirst({
        where: {
          id: actionParams.connectionId,
          userId: session.user.id,
        },
      });

      if (!connection) {
        return NextResponse.json(
          { error: 'Connection not found or access denied' },
          { status: 404 }
        );
      }

      connectionString = connection.connectionString;
    }

    // Execute the action
    const handler = actionHandlers[action];
    const result = await handler(actionParams, userId, connectionString);

    success = result.success;
    errorMessage = result.error;

    // Return result
    const response = NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });

    return response;
  } catch (error) {
    console.error('Action execution error:', error);
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    // Log the action to audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          actionName,
          params: (logParams ?? {}) as Prisma.InputJsonValue,
          success,
          error: errorMessage,
        },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to write audit log:', logError);
    }
  }
}
