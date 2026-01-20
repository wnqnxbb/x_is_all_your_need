import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  UserPlus,
  UserCheck,
  MessageSquare,
  Heart,
  Repeat2,
  Share2,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Save,
} from 'lucide-react';
import { tweetsApi, followingApi, projectApi } from '../lib/api';
import type { Project, Tweet, FollowingUser, FetchLog } from '../types';
import { format } from 'date-fns';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'tweets' | 'following' | 'settings'>('tweets');
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hasImagesFilter, setHasImagesFilter] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  // 设置相关的状态
  const [authToken, setAuthToken] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');

  // 图片查看器状态
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
    fetchDates();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await projectApi.get(parseInt(projectId!));
      setProject(response.data);
      setAuthToken(response.data.authToken);
    } catch (err: any) {
      setError(err.error || '获取项目信息失败');
    }
  };

  const fetchTweets = async (date?: string, hasImages?: boolean) => {
    try {
      setLoading(true);
      const response = await tweetsApi.list(parseInt(projectId!), { 
        date, 
        limit: 50,
        hasImages: hasImages !== undefined ? hasImages : (hasImagesFilter || undefined)
      });
      setTweets(response.data || []);
    } catch (err: any) {
      setError(err.error || '获取推文失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      setLoading(true);
      const response = await followingApi.list(parseInt(projectId!));
      setFollowing(response.data || []);
    } catch (err: any) {
      setError(err.error || '获取关注人列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDates = async () => {
    try {
      const response = await tweetsApi.dates(parseInt(projectId!));
      setDates(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedDate(response.data[0]);
        fetchTweets(response.data[0]);
      }
    } catch (err: any) {
      console.error('获取日期列表失败:', err);
    }
  };

  const handleAddFollowing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileUrl.trim()) return;

    try {
      await followingApi.add(parseInt(projectId!), { profileUrl: newProfileUrl });
      setNewProfileUrl('');
      if (activeTab === 'following') {
        fetchFollowing();
      }
    } catch (err: any) {
      alert(err.error || '添加关注人失败');
    }
  };

  const handleDeleteFollowing = async (id: number) => {
    if (!confirm('确定要删除这个关注人吗？')) return;

    try {
      await followingApi.delete(parseInt(projectId!), id);
      fetchFollowing();
    } catch (err: any) {
      alert(err.error || '删除关注人失败');
    }
  };

  const handleFetchNow = async () => {
    try {
      setFetching(true);
      await tweetsApi.fetch(parseInt(projectId!));
      fetchDates();
      alert('正在获取最新推文，请稍后查看');
    } catch (err: any) {
      alert(err.error || '获取推文失败');
    } finally {
      setFetching(false);
    }
  };

  const handleFollowAll = async () => {
    if (!confirm('确定要批量关注所有未关注的用户吗？这可能需要较长时间。')) return;

    try {
      const response = await followingApi.followAll(parseInt(projectId!));
      alert(`关注完成：成功 ${response.data.success}，失败 ${response.data.failed}`);
      fetchFollowing();
    } catch (err: any) {
      alert(err.error || '批量关注失败');
    }
  };

  const handleSyncFollowing = async () => {
    if (!confirm('确定要从 X 同步关注人列表吗？')) return;

    try {
      setSyncing(true);
      const response = await followingApi.sync(parseInt(projectId!));
      alert(`同步完成：新增 ${response.data.added}，更新 ${response.data.updated}`);
      fetchFollowing();
    } catch (err: any) {
      alert(err.error || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await projectApi.update(parseInt(projectId!), { authToken });
      alert('保存成功');
    } catch (err: any) {
      alert(err.error || '保存失败');
    }
  };

  const extractScreenName = (url: string): string | null => {
    try {
      const u = new URL(url);
      const match = u.pathname.match(/^\/([a-zA-Z0-9_]+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return '今天';
    if (date.toDateString() === yesterday.toDateString()) return '昨天';
    return format(date, 'yyyy-MM-dd');
  };

  if (!project) {
    return <div className="flex min-h-screen items-center justify-center bg-background">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部导航 */}
      <header className="sticky top-0 z-10 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background hover:text-text"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="flex-1 text-xl font-heading font-semibold text-text">
              {project.name}
            </h1>
          </div>
        </div>
      </header>

      {/* Tab 导航 */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('tweets')}
              className={`border-b-2 px-1 py-3 font-medium transition-colors ${
                activeTab === 'tweets'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              推文
            </button>
            <button
              onClick={() => {
                setActiveTab('following');
                fetchFollowing();
              }}
              className={`border-b-2 px-1 py-3 font-medium transition-colors ${
                activeTab === 'following'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              关注人 ({following.length > 0 ? following.length : (project?._count?.followingUsers || 0)})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`border-b-2 px-1 py-3 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              设置
            </button>
          </nav>
        </div>
      </div>

      {/* 主内容 */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'tweets' && (
          <div>
            {/* 工具栏 */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedDate('');
                    fetchTweets();
                  }}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedDate === ''
                      ? 'bg-primary text-white'
                      : 'bg-white text-text hover:bg-background'
                  }`}
                >
                  全部
                </button>
                {dates.map((date) => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      fetchTweets(date);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                      selectedDate === date
                        ? 'bg-primary text-white'
                        : 'bg-white text-text hover:bg-background'
                    }`}
                  >
                    {formatDate(date)}
                  </button>
                ))}
                <div className="ml-2 flex items-center gap-2 border-l border-border pl-2">
                  <button
                    onClick={() => {
                      const newFilter = !hasImagesFilter;
                      setHasImagesFilter(newFilter);
                      fetchTweets(selectedDate || undefined, newFilter);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      hasImagesFilter
                        ? 'bg-primary text-white'
                        : 'bg-white text-text hover:bg-background'
                    }`}
                  >
                    <ImageIcon size={16} />
                    <span>仅图片</span>
                  </button>
                </div>
              </div>
              <button
                onClick={handleFetchNow}
                disabled={fetching}
                className="flex items-center gap-2 rounded-lg bg-cta px-4 py-2 text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                <RefreshCw size={18} className={fetching ? 'animate-spin' : ''} />
                <span>{fetching ? '获取中...' : '现在更新'}</span>
              </button>
            </div>

            {/* 推文列表 */}
            {loading ? (
              <div className="text-center py-8 text-text-muted">加载中...</div>
            ) : tweets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-white p-12 text-center">
                <p className="text-lg text-text-muted">暂无推文数据</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tweets.map((tweet) => (
                  <div
                    key={tweet.id}
                    className="overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="p-4 sm:p-6">
                      {/* 作者信息 */}
                      <div className="mb-4 flex items-start gap-4">
                        {tweet.authorProfileImageUrl && (
                          <img
                            src={tweet.authorProfileImageUrl}
                            alt={tweet.authorName || tweet.screenName}
                            className="h-12 w-12 rounded-full bg-gray-100"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-text">
                              {tweet.authorName || tweet.screenName}
                            </p>
                            <p className="text-sm text-text-muted">@{tweet.screenName}</p>
                          </div>
                          {tweet.authorLocation && (
                            <p className="text-sm text-text-muted">{tweet.authorLocation}</p>
                          )}
                        </div>
                        <a
                          href={tweet.tweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background hover:text-primary"
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>

                      {/* 推文内容 */}
                      {tweet.fullText && (
                        <p className="mb-4 whitespace-pre-wrap text-text">{tweet.fullText}</p>
                      )}

                      {/* 媒体内容 */}
                      {(tweet.images?.length || 0) > 0 && (
                        <div className="mb-4 grid gap-2 sm:grid-cols-2">
                          {tweet.images!.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="推文图片"
                              className="max-w-full cursor-pointer rounded-lg transition-opacity hover:opacity-90"
                              onClick={() => setSelectedImage(img)}
                            />
                          ))}
                        </div>
                      )}
                      {(tweet.videos?.length || 0) > 0 && (
                        <div className="mb-4 grid gap-2 sm:grid-cols-2">
                          {tweet.videos!.map((video, idx) => (
                            <video
                              key={idx}
                              src={video}
                              controls
                              className="h-48 w-full rounded-lg"
                            />
                          ))}
                        </div>
                      )}

                      {/* 互动数据 */}
                      <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-1.5 text-sm text-text-muted">
                          <MessageSquare size={16} />
                          <span>{tweet.replyCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Repeat2 size={16} />
                          <span>{tweet.retweetCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Heart size={16} />
                          <span>{tweet.likeCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Share2 size={16} />
                          <span>{tweet.quoteCount}</span>
                        </div>
                      </div>

                      {/* 发布时间 */}
                      <p className="mt-3 text-xs text-text-muted">
                        {tweet.createdAt ? format(new Date(tweet.createdAt), 'yyyy-MM-dd HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div>
            {/* 添加关注人 */}
            <form onSubmit={handleAddFollowing} className="mb-6">
              <div className="flex gap-3">
                <input
                  type="url"
                  value={newProfileUrl}
                  onChange={(e) => setNewProfileUrl(e.target.value)}
                  placeholder="https://x.com/username"
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-white transition-colors hover:bg-primary-light"
                >
                  <Plus size={18} />
                  <span>添加</span>
                </button>
              </div>
            </form>

            {/* 批量操作按钮 */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-text-muted">
                未关注: {following.filter((f) => !f.isFollowing).length} 人
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSyncFollowing}
                  disabled={syncing}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary-light disabled:opacity-50"
                >
                  <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? '同步中...' : '从 X 同步'}</span>
                </button>
                {following.some((f) => !f.isFollowing) && (
                  <button
                    onClick={handleFollowAll}
                    className="flex items-center gap-2 rounded-lg bg-cta px-4 py-2.5 text-white transition-colors hover:bg-orange-600"
                  >
                    <UserPlus size={18} />
                    <span>批量关注</span>
                  </button>
                )}
              </div>
            </div>

            {/* 关注人列表 */}
            {loading ? (
              <div className="text-center py-8 text-text-muted">加载中...</div>
            ) : following.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-white p-12 text-center">
                <p className="text-lg text-text-muted">还没有关注人</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {following.map((user) => (
                  <div
                    key={user.id}
                    className="overflow-hidden rounded-lg border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {user.profileImageUrl && (
                          <img
                            src={user.profileImageUrl}
                            alt={user.screenName}
                            className="h-12 w-12 rounded-full bg-gray-100"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-text">@{user.screenName}</p>
                          <div className="flex items-center gap-2 text-sm text-text-muted">
                            {user.followersCount !== undefined && (
                              <span>粉丝 {user.followersCount}</span>
                            )}
                            {user.friendsCount !== undefined && (
                              <span>关注 {user.friendsCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFollowing(user.id)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      {user.isFollowing ? (
                        <span className="flex items-center gap-1.5 text-sm text-green-600">
                          <UserCheck size={16} />
                          <span>已关注</span>
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">未关注</span>
                      )}
                      {user.location && (
                        <p className="text-sm text-text-muted truncate">{user.location}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-heading font-semibold text-text">
                项目设置
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="authToken" className="mb-2 block text-sm font-medium text-text">
                    AUTH_TOKEN
                  </label>
                  <input
                    id="authToken"
                    type="text"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="从浏览器开发者工具中获取"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-sm text-text-muted">
                    从浏览器访问 x.com，打开开发者工具 → Application → Cookies → 找到 auth_token
                  </p>
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-white transition-colors hover:bg-primary-light"
                >
                  <Save size={18} />
                  <span>保存</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 图片查看器模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={selectedImage}
              alt="大图预览"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
