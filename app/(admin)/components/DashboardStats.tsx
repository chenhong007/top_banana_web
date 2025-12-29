import { PromptItem } from '@/types';
import { Tag, Clock, Database } from 'lucide-react';
import { CARD_STYLES } from '@/lib/styles';

interface DashboardStatsProps {
  prompts: PromptItem[];
  /** 数据库真实总量（来自分页接口） */
  totalCount?: number;
}

export default function DashboardStats({ prompts, totalCount }: DashboardStatsProps) {
  // 使用数据库真实总量，如果没有则降级使用当前页数据长度
  const totalPrompts = totalCount ?? prompts.length;
  const uniqueTags = new Set((prompts || []).flatMap(p => p.tags || [])).size;
  
  const lastUpdated = prompts.length > 0 
    ? new Date(Math.max(...prompts.map(p => new Date(p.updatedAt || new Date()).getTime()))).toLocaleDateString('zh-CN')
    : '-';

  const stats = [
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, index) => (
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
  );
}

