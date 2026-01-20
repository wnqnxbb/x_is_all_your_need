import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { fetchService } from '../services/fetch.service.js';

const prisma = new PrismaClient();

export async function tweetRoutes(fastify: FastifyInstance) {
  // 获取推文列表（支持按日期筛选、分页、筛选带图片的推文）
  fastify.get('/api/projects/:projectId/tweets', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { date, page = '1', limit = '50', hasImages } = request.query as {
      date?: string;
      page?: string;
      limit?: string;
      hasImages?: string;
    };

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    const where: any = {
      projectId: parseInt(projectId),
    };

    // 按日期筛选
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // 筛选带图片的推文
    if (hasImages === 'true') {
      where.images = {
        not: null,
      };
    }

    const [tweets, total] = await Promise.all([
      prisma.tweet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitInt,
      }),
      prisma.tweet.count({ where }),
    ]);

    return {
      data: tweets,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
      },
    };
  });

  // 手动触发抓取今天的推文
  fastify.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/tweets/fetch',
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };

      const result = await fetchService.fetchTweetsForProject(parseInt(projectId));

      return {
        data: result,
      };
    }
  );

  // 获取有推文的日期列表
  fastify.get('/api/projects/:projectId/tweets/dates', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const tweets = await prisma.tweet.findMany({
      where: { projectId: parseInt(projectId) },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // 按日期分组
    const dateMap = new Map<string, boolean>();
    tweets.forEach((tweet) => {
      const date = tweet.createdAt.toISOString().split('T')[0];
      dateMap.set(date, true);
    });

    return {
      data: Array.from(dateMap.keys()),
    };
  });

  // 获取抓取日志
  fastify.get('/api/projects/:projectId/fetch-logs', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { limit = '50' } = request.query as { limit?: string };

    const logs = await prisma.fetchLog.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return { data: logs };
  });
}
