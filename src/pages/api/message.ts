/**
 * POST /api/message
 * 
 * Sends a message within a match conversation.
 * 
 * Request body: { matchId: string, body: string }
 * Auth required: Yes
 * Response: { ok: true, messageId: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkMessageRateLimit, isSpamMessage } from '@/lib/ratelimit';
import { messageSchema } from '@/lib/validation';
import { MessageSendResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MessageSendResponse | { error: string; remaining?: number; resetAt?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate request body
    const bodyResult = messageSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: bodyResult.error.message });
    }

    const { matchId, body } = bodyResult.data;
    const fromUserId = session.user.id;

    // Check for spam
    if (isSpamMessage(body)) {
      return res.status(400).json({ error: 'Links are not allowed in messages' });
    }

    // Check rate limit
    const rateLimit = await checkMessageRateLimit(fromUserId);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt.toISOString(),
      });
    }

    // Verify match exists and user is part of it
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.userA !== fromUserId && match.userB !== fromUserId) {
      return res.status(403).json({ error: 'Not authorized to message in this match' });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        matchId,
        fromUser: fromUserId,
        body,
      },
    });

    return res.status(200).json({
      ok: true,
      messageId: message.id,
    });
  } catch (error) {
    console.error('Message error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

