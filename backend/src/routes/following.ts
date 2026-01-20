import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { TwitterService } from '../services/twitter.service.js';
import { fetchService } from '../services/fetch.service.js';

const prisma = new PrismaClient();

export async function followingRoutes(fastify: FastifyInstance) {
  // 获取项目的关注人列表
  fastify.get('/api/projects/:projectId/following', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const following = await prisma.followingUser.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { createdAt: 'desc' },
    });

    return { data: following };
  });

  // 添加关注人（输入主页链接）
  fastify.post('/api/projects/:projectId/following', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { profileUrl } = request.body as { profileUrl: string };

    if (!profileUrl) {
      return reply.status(400).send({ error: 'profileUrl is required' });
    }

    // 解析 screen_name
    const screenName = extractScreenName(profileUrl);

    if (!screenName) {
      return reply.status(400).send({ error: 'Invalid profile URL' });
    }

    // 检查是否已存在
    const existing = await prisma.followingUser.findUnique({
      where: {
        projectId_screenName: {
          projectId: parseInt(projectId),
          screenName,
        },
      },
    });

    if (existing) {
      return reply.status(400).send({ error: 'User already added' });
    }

    // 获取项目信息
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // 获取用户信息
    let userInfo;
    try {
      const twitterService = new TwitterService(project.authToken);
      await twitterService.init();
      userInfo = await twitterService.getUserByScreenName(screenName);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }

    // 保存关注人
    const followingUser = await prisma.followingUser.create({
      data: {
        projectId: parseInt(projectId),
        screenName: userInfo.screenName,
        restId: userInfo.restId,
        profileImageUrl: userInfo.profileImageUrl,
        followersCount: userInfo.followersCount,
        friendsCount: userInfo.friendsCount,
        location: userInfo.location,
      },
    });

    return { data: followingUser };
  });

  // 更新关注人
  fastify.put('/api/projects/:projectId/following/:id', async (request, reply) => {
    const { projectId, id } = request.params as { projectId: string; id: string };
    const { isFollowing } = request.body as { isFollowing?: boolean };

    const followingUser = await prisma.followingUser.update({
      where: { id: parseInt(id) },
      data: {
        ...(isFollowing !== undefined && { isFollowing }),
      },
    });

    return { data: followingUser };
  });

  // 删除关注人
  fastify.delete('/api/projects/:projectId/following/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.followingUser.delete({
      where: { id: parseInt(id) },
    });

    return { success: true };
  });

  // 从 X 同步关注人列表
  fastify.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/following/sync',
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const { cursor } = (request.body || {}) as { cursor?: string };

      const result = await fetchService.syncFollowingForProject(parseInt(projectId), cursor);

      return {
        data: result,
      };
    }
  );

  // 批量关注所有未关注用户
  fastify.post('/api/projects/:projectId/following/follow-all', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    // 获取项目信息
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // 获取未关注的用户
    const unfollowedUsers = await prisma.followingUser.findMany({
      where: {
        projectId: parseInt(projectId),
        isFollowing: false,
        restId: { not: null },
      },
    });

    const twitterService = new TwitterService(project.authToken);
    await twitterService.init();

    let successCount = 0;
    const results: Array<{ screenName: string; status: string; error?: string }> = [];

    for (const user of unfollowedUsers) {
      try {
        await twitterService.followUser(user.restId!);
        await prisma.followingUser.update({
          where: { id: user.id },
          data: { isFollowing: true },
        });
        successCount++;
        results.push({ screenName: user.screenName, status: 'success' });
      } catch (error: any) {
        results.push({
          screenName: user.screenName,
          status: 'failed',
          error: error.message,
        });
      }

      // 延迟 60 秒，避免触发限流
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }

    return {
      data: {
        total: unfollowedUsers.length,
        success: successCount,
        failed: unfollowedUsers.length - successCount,
        results,
      },
    };
  });
}

function extractScreenName(profileUrl: string): string | null {
  try {
    const url = new URL(profileUrl);
    const match = url.pathname.match(/^\/([a-zA-Z0-9_]+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
