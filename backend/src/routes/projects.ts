import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function projectRoutes(fastify: FastifyInstance) {
  // 获取项目列表
  fastify.get('/api/projects', async (request, reply) => {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: {
            followingUsers: true,
            tweets: true,
          },
        },
      },
    });

    return {
      data: projects.map((p) => ({
        ...p,
        authToken: maskAuthToken(p.authToken),
      })),
    };
  });

  // 创建项目
  fastify.post('/api/projects', async (request, reply) => {
    const { name, authToken } = request.body as { name: string; authToken: string };

    if (!name || !authToken) {
      return reply.status(400).send({ error: 'name and authToken are required' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        authToken,
      },
    });

    return { data: { ...project, authToken: maskAuthToken(project.authToken) } };
  });

  // 更新项目
  fastify.put('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, authToken } = request.body as { name?: string; authToken?: string };

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(authToken && { authToken }),
      },
    });

    return { data: { ...project, authToken: maskAuthToken(project.authToken) } };
  });

  // 删除项目
  fastify.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await prisma.project.delete({
      where: { id: parseInt(id) },
    });

    return { success: true };
  });

  // 获取项目详情
  fastify.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            followingUsers: true,
            tweets: true,
          },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return { data: { ...project, authToken: maskAuthToken(project.authToken) } };
  });
}

function maskAuthToken(authToken: string): string {
  if (authToken.length <= 8) {
    return '****';
  }
  return authToken.slice(0, 4) + '****' + authToken.slice(-4);
}
