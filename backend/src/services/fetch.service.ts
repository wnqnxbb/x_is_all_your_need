import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { TwitterService, TweetData } from './twitter.service.js';

const prisma = new PrismaClient();

export class FetchService {
  async fetchTweetsForProject(projectId: number): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // 获取项目信息
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // 初始化 Twitter 服务
      const twitterService = new TwitterService(project.authToken);
      await twitterService.init();

      // 获取时间线 - 放开数量限制，获取更多推文
      const tweets = await twitterService.getHomeLatestTimeline(500);

      if (tweets.length === 0) {
        await prisma.fetchLog.create({
          data: {
            projectId,
            status: 'success',
            tweetsCount: 0,
          },
        });
        return { success: true, count: 0 };
      }

      // 批量提取所有推文ID
      const tweetIds = tweets.map((tweet) => this.extractTweetId(tweet.tweetUrl));

      // 批量查询已存在的推文（一次性查询所有）
      const existingTweets = await prisma.tweet.findMany({
        where: {
          projectId,
          tweetId: {
            in: tweetIds,
          },
        },
        select: {
          tweetId: true,
        },
      });

      // 创建已存在推文ID的Set，用于快速查找
      const existingTweetIdSet = new Set(existingTweets.map((t) => t.tweetId));

      // 准备批量插入的数据
      const tweetsToInsert = tweets
        .map((tweet) => {
          const tweetId = this.extractTweetId(tweet.tweetUrl);
          
          // 跳过已存在的推文
          if (existingTweetIdSet.has(tweetId)) {
            return null;
          }

          return {
            projectId,
            screenName: tweet.user.screenName,
            tweetId,
            tweetUrl: tweet.tweetUrl,
            fullText: tweet.fullText || null,
            images: tweet.images && tweet.images.length > 0 ? tweet.images : null,
            videos: tweet.videos && tweet.videos.length > 0 ? tweet.videos : null,
            likeCount: tweet.likeCount,
            retweetCount: tweet.retweetCount,
            replyCount: tweet.replyCount,
            quoteCount: tweet.quoteCount,
            authorName: tweet.user.name || null,
            authorProfileImageUrl: tweet.user.profileImageUrl || null,
            authorFollowersCount: tweet.user.followersCount || null,
            authorFriendsCount: tweet.user.friendsCount || null,
            authorLocation: tweet.user.location || null,
            createdAt: dayjs(tweet.createdAt).toDate(),
          };
        })
        .filter((tweet): tweet is NonNullable<typeof tweet> => tweet !== null);

      // 批量插入新推文
      let count = 0;
      if (tweetsToInsert.length > 0) {
        // Prisma 的 createMany 有批量限制，分批插入
        const batchSize = 100;
        for (let i = 0; i < tweetsToInsert.length; i += batchSize) {
          const batch = tweetsToInsert.slice(i, i + batchSize);
          await prisma.tweet.createMany({
            data: batch,
            skipDuplicates: true, // 跳过重复项（双重保险）
          });
          count += batch.length;
        }
      }

      // 记录日志
      await prisma.fetchLog.create({
        data: {
          projectId,
          status: 'success',
          tweetsCount: count,
        },
      });

      return { success: true, count };
    } catch (error: any) {
      // 记录错误日志
      await prisma.fetchLog.create({
        data: {
          projectId,
          status: 'failed',
          tweetsCount: 0,
          errorMessage: error.message || String(error),
        },
      });

      return { success: false, count: 0, error: error.message };
    }
  }

  // 从 X 同步关注人列表
  async syncFollowingForProject(projectId: number, cursor?: string): Promise<{
    added: number;
    updated: number;
    skipped: number;
    nextCursor?: string;
    error?: string;
  }> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      console.log('Project restId:', project.restId);

      const twitterService = new TwitterService(project.authToken);
      await twitterService.init();

      // 如果 restId 不存在,先获取当前用户的 restId
      let restId = project.restId;
      if (!restId) {
        // 获取当前用户的 restId
        restId = await twitterService.getMyRestId();

        // 保存 restId 到数据库
        await prisma.project.update({
          where: { id: projectId },
          data: { restId },
        });

        console.log('Fetched and saved restId:', restId);
      }

      // 从 X 获取关注人列表
      const result = await twitterService.getFollowing(restId, cursor);

      console.log('syncFollowingForProject - result.users count:', result.users.length);
      console.log('syncFollowingForProject - result.users sample:', result.users.slice(0, 2));

      let added = 0;
      let updated = 0;
      let skipped = 0;

      for (const user of result.users) {
        // 跳过无效用户（缺少 screenName）
        if (!user.screenName) {
          console.warn('Skipping user with missing screenName:', user);
          skipped++;
          continue;
        }

        // 检查是否已存在
        const existing = await prisma.followingUser.findUnique({
          where: {
            projectId_screenName: {
              projectId,
              screenName: user.screenName,
            },
          },
        });

        if (existing) {
          // 更新用户信息
          await prisma.followingUser.update({
            where: { id: existing.id },
            data: {
              profileImageUrl: user.profileImageUrl,
              followersCount: user.followersCount,
              friendsCount: user.friendsCount,
              location: user.location,
            },
          });
          updated++;
        } else {
          // 添加新用户
          await prisma.followingUser.create({
            data: {
              projectId,
              screenName: user.screenName,
              restId: user.restId,
              profileImageUrl: user.profileImageUrl,
              followersCount: user.followersCount,
              friendsCount: user.friendsCount,
              location: user.location,
              isFollowing: true,  // X 上的用户默认已关注
            },
          });
          added++;
        }
      }

      return {
        added,
        updated,
        skipped,
        nextCursor: result.nextCursor,
      };
    } catch (error: any) {
      console.error('syncFollowingForProject error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        projectId,
        cursor,
      });
      return {
        added: 0,
        updated: 0,
        skipped: 0,
        error: error.message || String(error),
      };
    }
  }

  // 批量抓取所有项目的推文
  async fetchAllProjects(): Promise<void> {
    const projects = await prisma.project.findMany();

    for (const project of projects) {
      console.log(`Fetching tweets for project: ${project.name}`);
      const result = await this.fetchTweetsForProject(project.id);

      if (result.success) {
        console.log(`✅ Fetched ${result.count} tweets for ${project.name}`);
      } else {
        console.error(`❌ Failed to fetch tweets for ${project.name}: ${result.error}`);
      }

      // 延迟 1 分钟，避免触发限流
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
  }

  private extractTweetId(tweetUrl: string): string {
    const url = new URL(tweetUrl);
    return url.pathname.split('/').pop() || '';
  }
}

export const fetchService = new FetchService();
