import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit, ChevronRight, Eye } from 'lucide-react';
import { projectApi } from '../lib/api';
import type { Project } from '../types';

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newAuthToken, setNewAuthToken] = useState('');
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.list();
      setProjects(response.data || []);
    } catch (err: any) {
      setError(err.error || '获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newProjectName.trim() || !newAuthToken.trim()) {
      setError('请填写完整的项目信息');
      return;
    }

    try {
      await projectApi.create({
        name: newProjectName,
        authToken: newAuthToken,
      });
      setNewProjectName('');
      setNewAuthToken('');
      setShowCreateModal(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.error || '创建项目失败');
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('确定要删除这个项目吗？所有关联的推文和关注人也将被删除。')) {
      return;
    }

    try {
      await projectApi.delete(id);
      fetchProjects();
    } catch (err: any) {
      alert(err.error || '删除项目失败');
    }
  };

  useState(() => {
    fetchProjects();
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-lg text-text-muted">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部导航 */}
      <header className="sticky top-0 z-10 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-heading font-semibold text-text">X Twitter 推文管理</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-light"
            >
              <Plus size={18} />
              <span>新建项目</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-12 text-center">
            <p className="text-lg text-text-muted">还没有项目，点击上方按钮创建第一个项目</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="group relative overflow-hidden rounded-lg border border-border bg-white p-6 transition-all hover:shadow-lg hover:shadow-primary/10"
              >
                {/* 头部 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-heading font-semibold text-text">{project.name}</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      AUTH_TOKEN: {maskAuthToken(project.authToken)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => e.preventDefault()}
                      className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background hover:text-text"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => e.preventDefault()}
                      className="rounded-lg p-2 text-text-muted transition-colors hover:bg-background hover:text-text"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteProject(project.id);
                      }}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-primary">
                        {project._count.followingUsers}
                      </p>
                      <p className="text-sm text-text-muted">关注人</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-primary">
                        {project._count.tweets}
                      </p>
                      <p className="text-sm text-text-muted">推文</p>
                    </div>
                  </div>
                  <ChevronRight className="text-text-muted transition-transform group-hover:translate-x-1" size={20} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 创建项目模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="mb-6 text-xl font-heading font-semibold text-text">新建项目</h2>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-text">
                    项目名称
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例如：产品 A、市场部..."
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="authToken" className="mb-2 block text-sm font-medium text-text">
                    AUTH_TOKEN
                  </label>
                  <input
                    id="authToken"
                    type="text"
                    value={newAuthToken}
                    onChange={(e) => setNewAuthToken(e.target.value)}
                    placeholder="从浏览器开发者工具中获取"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                    setNewProjectName('');
                    setNewAuthToken('');
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-text transition-colors hover:bg-background"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-6 py-2 text-white transition-colors hover:bg-primary-light"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function maskAuthToken(authToken: string): string {
  if (authToken.length <= 8) {
    return '****';
  }
  return authToken.slice(0, 4) + '****' + authToken.slice(-4);
}
