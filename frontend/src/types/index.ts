export interface Project {
  id: number;
  name: string;
  authToken: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    followingUsers: number;
    tweets: number;
  };
}

export interface FollowingUser {
  id: number;
  projectId: number;
  screenName: string;
  restId?: string;
  profileImageUrl?: string;
  followersCount?: number;
  friendsCount?: number;
  location?: string;
  isFollowing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tweet {
  id: number;
  projectId: number;
  screenName: string;
  tweetId: string;
  tweetUrl: string;
  fullText?: string;
  images?: string[] | null;
  videos?: string[] | null;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  authorName?: string;
  authorProfileImageUrl?: string;
  authorFollowersCount?: number;
  authorFriendsCount?: number;
  authorLocation?: string;
  createdAt: string;
  fetchedAt: string;
}

export interface FetchLog {
  id: number;
  projectId: number;
  status: string;
  tweetsCount: number;
  errorMessage?: string;
  createdAt: string;
}

export interface ApiError {
  error?: string;
  data?: any;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: Pagination;
}
