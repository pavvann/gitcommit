/**
 * GET /api/messages/:matchId
 * 
 * Returns all messages in a match conversation.
 * 
 * Auth required: Yes
 * Response: { messages: MessageResponse[] }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MessageResponse } from '@/types';

interface MessagesResponse {
  messages: MessageResponse[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MessagesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { matchId } = req.query;

    if (typeof matchId !== 'string') {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    const currentUserId = session.user.id;

    // Verify match exists and user is part of it
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.userA !== currentUserId && match.userB !== currentUserId) {
      return res.status(403).json({ error: 'Not authorized to view these messages' });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({
      messages: messages.map((m) => ({
        id: m.id,
        matchId: m.matchId,
        fromUser: m.fromUser,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Messages error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

