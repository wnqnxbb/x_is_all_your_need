import lodash from 'lodash';
import dayjs from 'dayjs';
import { createXClient, TwitterClient } from '../utils/twitter.js';

export interface TweetData {
  user: {
    screenName: string;
    name: string;
    profileImageUrl: string;
    description: string;
    followersCount: number;
    friendsCount: number;
    location: string;
  };
  images: string[];
  videos: string[];
  tweetUrl: string;
  fullText: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  createdAt: string;
}

export interface UserInfo {
  restId: string;
  screenName: string;
  name: string;
  profileImageUrl: string;
  description: string;
  followersCount: number;
  friendsCount: number;
  location: string;
}

export class TwitterService {
  private client: TwitterClient | null = null;
  private restId: string | null = null;

  constructor(private authToken: string) {}

  async init() {
    const result = await createXClient(this.authToken);
    this.client = result.client;
    this.restId = result.restId;
  }

  // 获取用户信息
  async getUserByScreenName(screenName: string): Promise<UserInfo> {
    if (!this.client) {
      await this.init();
    }

    const response = await this.client!.getUserApi().getUserByScreenName({
      screenName,
    });

    const user = lodash.get(response, 'data.user.result.legacy');
    const restId = lodash.get(response, 'data.user.result.restId');

    return {
      restId,
      screenName: user.screenName,
      name: user.name,
      profileImageUrl: user.profileImageUrlHttps,
      description: user.description,
      followersCount: user.followersCount,
      friendsCount: user.friendsCount,
      location: user.location,
    };
  }

  // 获取当前用户的 restId
  async getMyRestId(): Promise<string> {
    if (!this.client) {
      await this.init();
    }

    if (!this.restId) {
      throw new Error('Failed to extract restId from cookies');
    }

    return this.restId;
  }

  // 关注用户
  async followUser(userId: string): Promise<void> {
    if (!this.client) {
      await this.init();
    }

    await this.client!.getV11PostApi().postCreateFriendships({
      userId,
    });
  }

  // 获取关注人列表
  async getFollowing(userId: string, cursor?: string): Promise<{ users: UserInfo[]; nextCursor?: string }> {
    if (!this.client) {
      await this.init();
    }

    try {
      const response = await this.client!.getUserListApi().getFollowing({
        userId,
        count: 200,
        cursor,
      });

      console.log('getFollowing response keys:', Object.keys(response || {}));
      console.log('getFollowing response.data keys:', Object.keys(response.data || {}));
      console.log('getFollowing response.data type:', typeof response.data);
      console.log('getFollowing response.data isArray:', Array.isArray(response.data));

      // 尝试多种可能的数据路径
      let users: any[] = [];
      let nextCursor: string | undefined;

      // 检查是否是 GraphQL 响应格式
      const instructions = lodash.get(response, 'data.user.result.timeline.timeline.instructions', []);
      if (instructions.length > 0) {
        // GraphQL 格式：从 instructions 中提取用户
        for (const instruction of instructions) {
          if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
            for (const entry of instruction.entries) {
              if (entry.content?.entryType === 'TimelineTimelineItem' && entry.content.itemContent?.user) {
                users.push(entry.content.itemContent.user);
              }
            }
          }
          // 提取 nextCursor
          if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
            const cursorEntry = instruction.entries.find((e: any) => e.content?.entryType === 'TimelineTimelineCursor');
            if (cursorEntry?.content?.value) {
              nextCursor = cursorEntry.content.value;
            }
          }
        }
      } else {
        // 尝试直接数组格式
        if (Array.isArray(response.data)) {
          users = response.data;
        } else if (Array.isArray(response.data?.data)) {
          users = response.data.data;
        } else if (Array.isArray(response.data?.users)) {
          users = response.data.users;
        } else if (response.data?.data?.users) {
          users = response.data.data.users;
        } else if (lodash.get(response, 'data.data')) {
          users = lodash.get(response, 'data.data', []);
        }

        // 提取 nextCursor - 从日志看，cursor 结构是 { top: {...}, bottom: {...} }
        const cursorObj = lodash.get(response, 'data.cursor');
        if (cursorObj && typeof cursorObj === 'object') {
          // 优先使用 bottom cursor 作为下一页
          nextCursor = lodash.get(cursorObj, 'bottom.value') || lodash.get(cursorObj, 'top.value');
        } else {
          nextCursor = lodash.get(response, 'data.nextCursor') || 
                       lodash.get(response, 'data.cursor') ||
                       lodash.get(response, 'data.user.result.timeline.timeline.instructions[0].entries[-1].content.value');
        }
      }

      console.log('Extracted users count:', users.length);
      if (users.length > 0) {
        console.log('First user sample:', JSON.stringify(users[0], null, 2));
        // 测试提取逻辑
        const testUser = users[0];
        const testLegacy = lodash.get(testUser, 'user.legacy') || lodash.get(testUser, 'raw.result.legacy') || testUser.legacy || {};
        const testScreenName = testLegacy.screenName || lodash.get(testUser, 'user.legacy.screenName') || lodash.get(testUser, 'raw.result.legacy.screenName');
        console.log('Test extraction - legacy:', testLegacy);
        console.log('Test extraction - screenName:', testScreenName);
      } else {
        console.log('No users found. Full response structure:', JSON.stringify(response, null, 2));
      }
      console.log('Extracted nextCursor:', nextCursor);

      const userList: UserInfo[] = users
        .map((user: any) => {
          // 根据实际数据结构，尝试多种路径提取 legacy 数据
          // 从日志看，数据结构是 { raw: { result: { legacy: {...} } }, user: { legacy: {...} } }
          const legacy = lodash.get(user, 'user.legacy') || 
                        lodash.get(user, 'raw.result.legacy') || 
                        user.legacy || 
                        lodash.get(user, 'result.legacy') || 
                        {};
          
          const restId = lodash.get(user, 'user.restId') || 
                        lodash.get(user, 'raw.result.restId') ||
                        user.restId || 
                        lodash.get(user, 'result.restId') || 
                        lodash.get(user, 'id');
          
          const screenName = legacy.screenName || 
                            lodash.get(user, 'user.legacy.screenName') ||
                            lodash.get(user, 'raw.result.legacy.screenName') ||
                            lodash.get(user, 'screen_name') || 
                            lodash.get(user, 'screenName');
          
          return {
            restId: restId,
            screenName: screenName,
            name: legacy.name || lodash.get(user, 'user.legacy.name') || lodash.get(user, 'raw.result.legacy.name'),
            profileImageUrl: legacy.profileImageUrlHttps || 
                           lodash.get(user, 'user.legacy.profileImageUrlHttps') ||
                           lodash.get(user, 'raw.result.legacy.profileImageUrlHttps') ||
                           lodash.get(user, 'profile_image_url_https') || 
                           lodash.get(user, 'profileImageUrl'),
            description: legacy.description || 
                        lodash.get(user, 'user.legacy.description') ||
                        lodash.get(user, 'raw.result.legacy.description'),
            followersCount: legacy.followersCount || 
                          lodash.get(user, 'user.legacy.followersCount') ||
                          lodash.get(user, 'raw.result.legacy.followersCount') ||
                          lodash.get(user, 'followers_count') || 
                          lodash.get(user, 'followersCount'),
            friendsCount: legacy.friendsCount || 
                        lodash.get(user, 'user.legacy.friendsCount') ||
                        lodash.get(user, 'raw.result.legacy.friendsCount') ||
                        lodash.get(user, 'friends_count') || 
                        lodash.get(user, 'friendsCount'),
            location: legacy.location || 
                     lodash.get(user, 'user.legacy.location') ||
                     lodash.get(user, 'raw.result.legacy.location') ||
                     lodash.get(user, 'location'),
          };
        })
        .filter((user: UserInfo) => {
          if (!user.screenName) {
            console.warn('Filtered user without screenName:', JSON.stringify(user, null, 2));
          }
          return !!user.screenName;
        }); // 过滤掉没有 screenName 的用户

      console.log('Final userList count:', userList.length);
      if (userList.length > 0) {
        console.log('First userList item:', JSON.stringify(userList[0], null, 2));
      }

      return {
        users: userList,
        nextCursor: typeof nextCursor === 'string' ? nextCursor : undefined,
      };
    } catch (error: any) {
      console.error('getFollowing error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        data: error.data,
      });
      throw error;
    }
  }

  // 获取时间线
  async getHomeLatestTimeline(count = 500): Promise<TweetData[]> {
    if (!this.client) {
      await this.init();
    }

    const resp = await this.client!.getTweetApi().getHomeLatestTimeline({
      count,
    });

    // 过滤出原创推文
    const originalTweets = resp.data.data.filter((tweet: any) => {
      return !tweet.referenced_tweets || tweet.referenced_tweets.length === 0;
    });

    const tweets: TweetData[] = [];

    originalTweets.forEach((tweet: any) => {
      const isQuoteStatus = lodash.get(tweet, 'raw.result.legacy.isQuoteStatus');
      if (isQuoteStatus) {
        return;
      }

      // 尝试从多个位置获取完整文本
      // 1. 优先从 note_tweet 获取（长推文/Note 推文，支持超过 280 字符）
      let fullText = lodash.get(tweet, 'raw.result.note_tweet.note_tweet_results.result.text') ||
                     lodash.get(tweet, 'raw.result.note_tweet.note_tweet_results.result.note_tweet_results.result.text');
      
      // 2. 如果没有，尝试从 legacy.fullText 获取（标准推文）
      if (!fullText) {
        fullText = lodash.get(tweet, 'raw.result.legacy.fullText');
      }
      
      // 3. 如果还是没有，尝试从 extended_tweet 获取（旧版 API 的长推文）
      if (!fullText) {
        fullText = lodash.get(tweet, 'raw.result.legacy.extended_tweet.full_text');
      }
      
      // 4. 尝试从其他可能的位置
      if (!fullText) {
        fullText = lodash.get(tweet, 'raw.result.note_tweet.text') ||
                   lodash.get(tweet, 'text') ||
                   lodash.get(tweet, 'full_text');
      }
      
      // 5. 最后回退到默认值
      if (!fullText || fullText === 'RT @') {
        fullText = lodash.get(tweet, 'raw.result.legacy.fullText', 'RT @');
      }
      
      // 记录文本长度，用于调试（如果文本被截断）
      const textLength = fullText?.length || 0;
      if (textLength > 0 && textLength < 50) {
        // 如果文本很短，可能是被截断了，记录日志
        const tweetId = lodash.get(tweet, 'raw.result.legacy.idStr');
        console.log(`Warning: Tweet ${tweetId} has short text (${textLength} chars), might be truncated`);
      }
      
      if (fullText?.includes('RT @')) {
        return;
      }

      const createdAt = lodash.get(tweet, 'raw.result.legacy.createdAt');

      // 只获取最近 1 天的推文
      if (dayjs().diff(dayjs(createdAt), 'day') > 1) {
        return;
      }

      const screenName = lodash.get(tweet, 'user.legacy.screenName');
      const tweetId = lodash.get(tweet, 'raw.result.legacy.idStr');
      const tweetUrl = `https://x.com/${screenName}/status/${tweetId}`;

      // 提取用户信息
      const user = {
        screenName: lodash.get(tweet, 'user.legacy.screenName'),
        name: lodash.get(tweet, 'user.legacy.name'),
        profileImageUrl: lodash.get(tweet, 'user.legacy.profileImageUrlHttps'),
        description: lodash.get(tweet, 'user.legacy.description'),
        followersCount: lodash.get(tweet, 'user.legacy.followersCount'),
        friendsCount: lodash.get(tweet, 'user.legacy.friendsCount'),
        location: lodash.get(tweet, 'user.legacy.location'),
      };

      // 提取互动数据
      const likeCount = lodash.get(tweet, 'raw.result.legacy.favoriteCount', 0);
      const retweetCount = lodash.get(tweet, 'raw.result.legacy.retweetCount', 0);
      const replyCount = lodash.get(tweet, 'raw.result.legacy.replyCount', 0);
      const quoteCount = lodash.get(tweet, 'raw.result.legacy.quoteCount', 0);

      // 提取图片
      const mediaItems = lodash.get(tweet, 'raw.result.legacy.extendedEntities.media', []);
      const images = mediaItems
        .filter((media: any) => media.type === 'photo')
        .map((media: any) => media.mediaUrlHttps);

      // 提取视频
      const videos = mediaItems
        .filter((media: any) => media.type === 'video' || media.type === 'animated_gif')
        .map((media: any) => {
          const variants = lodash.get(media, 'videoInfo.variants', []);
          const bestQuality = variants
            .filter((v: any) => v.contentType === 'video/mp4')
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          return bestQuality?.url;
        })
        .filter(Boolean);

      tweets.push({
        user,
        images,
        videos,
        tweetUrl,
        fullText,
        likeCount,
        retweetCount,
        replyCount,
        quoteCount,
        createdAt,
      });
    });

    return tweets;
  }
}
