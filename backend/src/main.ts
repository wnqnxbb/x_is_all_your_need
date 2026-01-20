import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config.js';
import { projectRoutes } from './routes/projects.js';
import { followingRoutes } from './routes/following.js';
import { tweetRoutes } from './routes/tweets.js';
import { schedulerService } from './services/scheduler.service.js';

const fastify = Fastify({
  logger: true,
});

// 注册 CORS
await fastify.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
});

// 注册 Swagger 文档
await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'X Twitter API',
      description: 'API for managing X Twitter projects and fetching tweets',
      version: '1.0.0',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
});

// 注册路由
await fastify.register(projectRoutes);
await fastify.register(followingRoutes);
await fastify.register(tweetRoutes);

// 健康检查
fastify.get('/', async () => {
  return {
    name: 'X Twitter API',
    version: '1.0.0',
    status: 'ok',
  };
});

// 启动服务器
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`🚀 Server listening on http://${config.host}:${config.port}`);
    console.log(`📚 API documentation at http://localhost:${config.port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
