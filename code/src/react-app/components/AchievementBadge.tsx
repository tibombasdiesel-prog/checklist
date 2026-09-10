import { Trophy, Target, Zap, Star, Award } from 'lucide-react';

interface AchievementBadgeProps {
  type: 'streak' | 'count' | 'speed' | 'quality' | 'milestone';
  value: number;
  label: string;
  animate?: boolean;
}

export function AchievementBadge({ type, value, label, animate = false }: AchievementBadgeProps) {
  const icons = {
    streak: Zap,
    count: Target,
    speed: Zap,
    quality: Star,
    milestone: Award
  };

  const colors = {
    streak: 'from-amber-500 to-orange-600',
    count: 'from-blue-500 to-indigo-600',
    speed: 'from-purple-500 to-pink-600',
    quality: 'from-emerald-500 to-teal-600',
    milestone: 'from-rose-500 to-red-600'
  };

  const Icon = icons[type];

  return (
    <div className={`group relative bg-white rounded-xl shadow-lg border-2 border-gray-100 p-4 hover:shadow-xl transition-all duration-300 ${animate ? 'animate-bounce' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${colors[type]} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {value}
          </div>
          <div className="text-sm text-gray-600 font-medium">{label}</div>
        </div>
      </div>
      <div className={`absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br ${colors[type]} rounded-full flex items-center justify-center shadow-lg ${animate ? 'animate-ping' : ''}`}>
        <Trophy className="w-3 h-3 text-white" />
      </div>
    </div>
  );
}
