/**
 * Tag Migration Admin Page
 * 标签迁移管理页面 - 可在 Vercel 生产环境使用
 * 
 * 注意：此页面使用独立路由 /admin-migrate 而非 /(admin)/migrate-tags
 * 原因：避免路由组括号在某些构建环境中导致的路径解析问题
 */

'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Database, ArrowRight, Calendar } from 'lucide-react';

interface DateUpdateResult {
  totalFound: number;
  successCount: number;
  errorCount: number;
  dateRange: {
    original: { from: string; to: string };
    updated: { from: string; to: string };
  };
  samples?: Array<{
    id: string;
    effect: string;
    oldDate: string;
    newDate: string;
  }>;
}

interface TagStatus {
  currentTagCount: number;
  targetTagCount: number;
  analysis: {
    needMigration: number;
    alreadyChinese: number;
    others: number;
  };
  currentTags: Array<{
    name: string;
    promptCount: number;
    willMapTo: string;
  }>;
}

interface MigrationPlan {
  stats: {
    totalTags: number;
    tagsToKeep: number;
    tagsToMerge: number;
    finalTagCount: number;
  };
  migrationPlan: Array<{
    oldTag: string;
    newTag: string;
    promptCount: number;
    action: string;
  }>;
}

interface MigrationResult {
  stats: {
    before: number;
    after: number;
    migrated: number;
    errors: number;
  };
  finalTags: Array<{
    name: string;
    promptCount: number;
  }>;
}

export default function MigrateTagsPage() {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'status' | 'preview' | 'confirm' | 'result'>('input');
  const [status, setStatus] = useState<TagStatus | null>(null);
  const [plan, setPlan] = useState<MigrationPlan | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string>('');
  
  // 日期更新相关状态
  const [dateUpdateResult, setDateUpdateResult] = useState<DateUpdateResult | null>(null);
  const [showDateUpdate, setShowDateUpdate] = useState(false);

  const resetState = () => {
    setStep('input');
    setStatus(null);
    setPlan(null);
    setResult(null);
    setError('');
    setDateUpdateResult(null);
    setShowDateUpdate(false);
  };

  const handleUpdateDates = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/update-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDateUpdateResult(data.data);
        setShowDateUpdate(true);
      } else {
        setError(data.error || '日期更新失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatus = async () => {
    if (!secret.trim()) {
      setError('请输入 IMPORT_SECRET');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/migrate-tags', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secret}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        setStep('status');
      } else {
        setError(data.error || '获取状态失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/migrate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret,
          dryRun: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlan(data.data);
        setStep('preview');
      } else {
        setError(data.error || '预览失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/migrate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret,
          dryRun: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setStep('result');
      } else {
        setError(data.error || '迁移失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Database className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">标签迁移工具</h1>
          <p className="text-gray-600">将英文标签翻译成中文并合并近义词</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-1">错误</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Input Secret */}
        {step === 'input' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">步骤 1: 身份验证</h2>
            <div className="mb-6">
              <label 
                htmlFor="import-secret-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                IMPORT_SECRET
              </label>
              <input
                id="import-secret-input"
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                onInput={(e) => setSecret((e.target as HTMLInputElement).value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="请输入环境变量 IMPORT_SECRET 的值"
                disabled={loading}
                style={{ pointerEvents: 'auto' }}
              />
              <p className="mt-2 text-sm text-gray-500">
                在 Vercel 项目设置的环境变量中查找此值
              </p>
            </div>
            <button
              onClick={handleGetStatus}
              disabled={loading || !secret.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              查看当前状态
            </button>
          </div>
        )}

        {/* Date Update Result Modal */}
        {showDateUpdate && dateUpdateResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-green-600" />
                    日期更新完成
                  </h3>
                  <button
                    onClick={() => setShowDateUpdate(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">找到记录</p>
                    <p className="text-2xl font-bold text-blue-600">{dateUpdateResult.totalFound}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">更新成功</p>
                    <p className="text-2xl font-bold text-green-600">{dateUpdateResult.successCount}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">失败</p>
                    <p className="text-2xl font-bold text-red-600">{dateUpdateResult.errorCount}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-3">日期范围：</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">原始范围:</span>
                      <span className="font-mono text-sm">
                        {new Date(dateUpdateResult.dateRange.original.from).toLocaleString('zh-CN')}
                        {' → '}
                        {new Date(dateUpdateResult.dateRange.original.to).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">更新为:</span>
                      <span className="font-mono text-sm text-green-600">
                        {new Date(dateUpdateResult.dateRange.updated.from).toLocaleString('zh-CN')}
                        {' → '}
                        {new Date(dateUpdateResult.dateRange.updated.to).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>

                {dateUpdateResult.samples && dateUpdateResult.samples.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">更新示例（前10条）：</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dateUpdateResult.samples.map((sample, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <p className="font-medium text-gray-900 mb-1">{sample.effect}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>{new Date(sample.oldDate).toLocaleString('zh-CN')}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-green-600">{new Date(sample.newDate).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowDateUpdate(false)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Show Status */}
        {step === 'status' && status && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">步骤 2: 当前标签状态</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">当前标签数</p>
                <p className="text-3xl font-bold text-blue-600">{status.currentTagCount}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">目标标签数</p>
                <p className="text-3xl font-bold text-green-600">{status.targetTagCount}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">需要迁移</p>
                <p className="text-3xl font-bold text-yellow-600">{status.analysis.needMigration}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">已是中文</p>
                <p className="text-3xl font-bold text-purple-600">{status.analysis.alreadyChinese}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">标签映射预览（前10个）：</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {status.currentTags.slice(0, 10).map((tag, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{tag.name}</span>
                      <span className="text-xs text-gray-500">({tag.promptCount} prompts)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-blue-600">{tag.willMapTo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  日期更新功能
                </h4>
                <p className="text-yellow-700 text-sm mb-3">
                  将 2025年12月26日 和 27日 添加的所有数据的创建时间往前推 30 天
                </p>
                <button
                  onClick={handleUpdateDates}
                  disabled={loading}
                  className="bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 disabled:bg-gray-300 flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Calendar className="w-4 h-4" />
                  执行日期更新
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetState}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                返回
              </button>
              <button
                onClick={handlePreview}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                生成迁移计划
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview Migration Plan */}
        {step === 'preview' && plan && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">步骤 3: 迁移计划预览</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">⚠️ 重要提示</h3>
                <p className="text-yellow-700 text-sm">
                  此操作将永久修改数据库，删除旧标签并合并到新标签。请确认无误后再执行。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">迁移前</p>
                <p className="text-2xl font-bold">{plan.stats.totalTags}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">保持不变</p>
                <p className="text-2xl font-bold text-green-600">{plan.stats.tagsToKeep}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">需合并</p>
                <p className="text-2xl font-bold text-blue-600">{plan.stats.tagsToMerge}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">迁移后</p>
                <p className="text-2xl font-bold text-purple-600">{plan.stats.finalTagCount}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">迁移详情（前20条）：</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {plan.migrationPlan.slice(0, 20).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900">{item.oldTag}</span>
                      <span className="text-xs text-gray-500">({item.promptCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {item.action}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-blue-600">{item.newTag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('status')}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                返回
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                确认执行迁移
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">步骤 4: 最终确认</h2>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">🚨 危险操作确认</h3>
              <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
                <li>此操作将永久删除旧标签</li>
                <li>此操作不可撤销</li>
                <li>请确保已备份数据库</li>
                <li>建议在低峰时段执行</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('preview')}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                我再想想
              </button>
              <button
                onClick={handleMigrate}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                确认执行迁移
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 'result' && result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">✅ 迁移完成！</h2>
              <p className="text-gray-600">标签已成功迁移到中文标签体系</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">迁移前</p>
                <p className="text-3xl font-bold">{result.stats.before}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">迁移后</p>
                <p className="text-3xl font-bold text-green-600">{result.stats.after}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">成功迁移</p>
                <p className="text-3xl font-bold text-blue-600">{result.stats.migrated}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">失败</p>
                <p className="text-3xl font-bold text-red-600">{result.stats.errors}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-3">最终标签列表（按使用量排序）：</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {result.finalTags.map((tag, idx) => (
                  <div key={idx} className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="font-medium text-blue-900">{tag.name}</p>
                    <p className="text-sm text-blue-600">{tag.promptCount} prompts</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">✅ 下一步</h3>
              <ul className="text-green-700 text-sm space-y-1 list-disc list-inside">
                <li>前端将自动显示新的中文标签</li>
                <li>刷新首页查看标签筛选器</li>
                <li>后台可以继续使用新标签</li>
                <li>建议清除浏览器缓存</li>
              </ul>
            </div>

            <button
              onClick={resetState}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              完成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
