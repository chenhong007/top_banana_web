import { PromptItem } from '@/types';
import { Tag, Clock, Database, Image, AlertCircle, FileText, Link, Layers, CheckCircle } from 'lucide-react';
import { CARD_STYLES } from '@/lib/styles';
import { useEffect, useState } from 'react';

interface MissingStats {
  total: number;
  noImage: number;
  nonR2Image: number;
  noTags: number;
  noModelTags: number;
  noDescription: number;
  noSource: number;
  noCategory: number;
  completeCount: number;
}

interface DashboardStatsProps {
  prompts: PromptItem[];
  /** 数据库真实总量（来自分页接口） */
  totalCount?: number;
  /** 当前选中的缺失类型筛选 */
  selectedMissingType?: string;
  /** 缺失类型筛选变化回调 */
  onMissingTypeChange?: (type: string | undefined) => void;
}

export default function DashboardStats({ 
  prompts, 
  totalCount,
  selectedMissingType,
  onMissingTypeChange,
}: DashboardStatsProps) {
  const [missingStats, setMissingStats] = useState<MissingStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取缺失数据统计
  useEffect(() => {
    const fetchMissingStats = async () => {
      try {
        const response = await fetch('/api/admin/stats/missing');
        const result = await response.json();
        if (result.success) {
          setMissingStats(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch missing stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMissingStats();
  }, [totalCount]); // 当总数变化时重新获取

  // 使用数据库真实总量，如果没有则降级使用当前页数据长度
  const totalPrompts = totalCount ?? prompts.length;
  const uniqueTags = new Set((prompts || []).flatMap(p => p.tags || [])).size;
  
  const lastUpdated = prompts.length > 0 
    ? new Date(Math.max(...prompts.map(p => new Date(p.updatedAt || new Date()).getTime()))).toLocaleDateString('zh-CN')
    : '-';

  // 基础统计卡片
  const basicStats = [
    {
      label: '总提示词',
      value: totalPrompts,
      icon: Database,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: '标签分类',
      value: uniqueTags,
      icon: Tag,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: '最近更新',
      value: lastUpdated,
      icon: Clock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  // 缺失数据统计卡片（可点击筛选）
  const missingStatCards = missingStats ? [
    {
      key: 'complete',
      label: '数据完整',
      value: missingStats.completeCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      hoverBg: 'hover:bg-green-100',
      activeBg: 'bg-green-200',
    },
    {
      key: 'noImage',
      label: '无图片',
      value: missingStats.noImage,
      icon: Image,
      color: 'text-red-600',
      bg: 'bg-red-50',
      hoverBg: 'hover:bg-red-100',
      activeBg: 'bg-red-200',
    },
    {
      key: 'nonR2Image',
      label: '非R2图片',
      value: missingStats.nonR2Image,
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      hoverBg: 'hover:bg-orange-100',
      activeBg: 'bg-orange-200',
    },
    {
      key: 'noTags',
      label: '无标签',
      value: missingStats.noTags,
      icon: Tag,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      hoverBg: 'hover:bg-yellow-100',
      activeBg: 'bg-yellow-200',
    },
    {
      key: 'noModelTags',
      label: '无模型标签',
      value: missingStats.noModelTags,
      icon: Layers,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      hoverBg: 'hover:bg-pink-100',
      activeBg: 'bg-pink-200',
    },
    {
      key: 'noDescription',
      label: '无描述',
      value: missingStats.noDescription,
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      hoverBg: 'hover:bg-indigo-100',
      activeBg: 'bg-indigo-200',
    },
    {
      key: 'noSource',
      label: '无来源',
      value: missingStats.noSource,
      icon: Link,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      hoverBg: 'hover:bg-cyan-100',
      activeBg: 'bg-cyan-200',
    },
  ] : [];

  const handleMissingTypeClick = (key: string) => {
    if (!onMissingTypeChange) return;
    
    if (selectedMissingType === key) {
      // 取消选中
      onMissingTypeChange(undefined);
    } else {
      onMissingTypeChange(key);
    }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* 基础统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {basicStats.map((stat, index) => (
          <div key={index} className={`${CARD_STYLES.withPadding} flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300`}>
            <div className={`${stat.bg} p-3 rounded-xl`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 缺失数据统计 */}
      {!loading && missingStats && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            数据完整性统计
            <span className="text-xs text-gray-400 font-normal">（点击筛选）</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {missingStatCards.map((stat) => {
              const isActive = selectedMissingType === stat.key;
              return (
                <button
                  key={stat.key}
                  onClick={() => handleMissingTypeClick(stat.key)}
                  className={`
                    ${CARD_STYLES.base} p-4 flex flex-col items-center gap-2 
                    transition-all duration-200 cursor-pointer
                    ${isActive ? stat.activeBg + ' ring-2 ring-offset-1 ring-' + stat.color.replace('text-', '') : stat.bg}
                    ${!isActive ? stat.hoverBg : ''}
                  `}
                >
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedMissingType && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                当前筛选: <span className="font-semibold">{missingStatCards.find(s => s.key === selectedMissingType)?.label}</span>
              </span>
              <button
                onClick={() => onMissingTypeChange?.(undefined)}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                清除筛选
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-500">加载统计数据...</span>
        </div>
      )}
    </div>
  );
}
