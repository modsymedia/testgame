import React, { useState, useEffect } from 'react';

interface PointsDisplayProps {
  walletAddress?: string;
}

interface PointsData {
  total: number;
  dailyEarned: number;
  dailyCap: number;
  weeklyEarned: number;
  multiplier: number;
  level: number;
}

// Points per task configuration
const TASK_POINTS = {
  feed: {
    fish: 5,
    cookie: 3,
    catFood: 4,
    kibble: 2
  },
  play: {
    laser: 6,
    feather: 4,
    ball: 3,
    puzzle: 5
  },
  clean: {
    brush: 4,
    bath: 6,
    nails: 5,
    dental: 7
  },
  heal: {
    checkup: 8,
    medicine: 10,
    vaccine: 12,
    surgery: 15
  }
};

// Component for individual stat cards
interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
}

const StatCard = ({ label, value, suffix = '' }: StatCardProps) => (
  <div className="bg-white dark:bg-gray-700 p-3 rounded-md">
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-lg font-semibold">{value}{suffix}</p>
  </div>
);

// New component for task points info
interface TaskPointsInfoProps {
  category: 'feed' | 'play' | 'clean' | 'heal';
  isOpen: boolean;
  onClose: () => void;
}

const TaskPointsInfo = ({ category, isOpen, onClose }: TaskPointsInfoProps) => {
  if (!isOpen) return null;

  const tasks = TASK_POINTS[category];

  return (
    <div className="absolute z-10 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold capitalize">{category} Points</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">
        {Object.entries(tasks).map(([task, points]) => (
          <div key={task} className="flex justify-between items-center">
            <span className="text-sm capitalize">
              {task === 'catFood' ? 'Cat Food' : task}
            </span>
            <span className="text-sm font-semibold">+{points} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function PointsDisplay({ walletAddress }: PointsDisplayProps) {
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'feed' | 'play' | 'clean' | 'heal' | null>(null);
  const [basePointsPerSecond, setBasePointsPerSecond] = useState(2);
  const [animatedPointsPerSecond, setAnimatedPointsPerSecond] = useState(2);
  
  useEffect(() => {
    // Don't fetch if no wallet address is provided
    if (!walletAddress) return;
    
    async function fetchPointsData() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/points?walletAddress=${walletAddress}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch points data');
        }
        
        setPointsData({
          total: data.totalPoints || 0,
          dailyEarned: data.dailyPoints || 0,
          dailyCap: data.dailyCap || 200,
          weeklyEarned: data.weeklyPoints || 0,
          multiplier: data.multiplier || 1,
          level: Math.floor((data.totalPoints || 0) / 1000) + 1
        });

        // Calculate dynamic points per second based on total points
        const newBasePointsPerSecond = 2 + Math.floor(data.totalPoints / 10000); // Increase by 1 for every 10k points
        setBasePointsPerSecond(newBasePointsPerSecond);
      } catch (err) {
        console.error('Error fetching points data:', err);
        setError('Failed to load points data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPointsData();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchPointsData, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [walletAddress]);

  // Animate points per second
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedPointsPerSecond(prev => {
        const diff = basePointsPerSecond - prev;
        if (Math.abs(diff) < 0.1) return basePointsPerSecond;
        return prev + diff * 0.1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [basePointsPerSecond]);
  
  // Handle different display states
  if (!walletAddress) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Connect your wallet to view points
        </p>
      </div>
    );
  }
  
  if (loading && !pointsData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center">Loading points data...</p>
      </div>
    );
  }
  
  if (error && !pointsData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-red-300 dark:border-red-700">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }
  
  // Calculate percentage of daily cap reached
  const dailyCapPercentage = pointsData ? Math.min(100, (pointsData.dailyEarned / pointsData.dailyCap) * 100) : 0;
  const pointsLeftToday = pointsData ? Math.max(0, pointsData.dailyCap - pointsData.dailyEarned) : 0;
  const dailyCapReached = pointsData && pointsData.dailyEarned >= pointsData.dailyCap;
  
  return (
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 space-y-4">
      {/* Header with level */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">Your GOCHI Points</h3>
        {pointsData && (
          <div className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-md">
            Level {pointsData.level}
          </div>
        )}
      </div>
      
      {/* Total Points Display */}
      {pointsData && (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Points</p>
            <p className="text-4xl font-bold">{pointsData.total.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Points Per Second Display */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">Points per second:</span>
          <span className="text-lg font-semibold">{animatedPointsPerSecond.toFixed(1)}</span>
        </div>
        <div className="mt-2 h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(animatedPointsPerSecond / (basePointsPerSecond + 1)) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Daily Points Progress */}
      {pointsData && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Daily Points: {pointsData.dailyEarned.toLocaleString()}</span>
            <span>Cap: {pointsData.dailyCap.toLocaleString()}</span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${dailyCapPercentage}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
            {dailyCapReached 
              ? 'Daily cap reached' 
              : `${pointsLeftToday.toLocaleString()} points left today`}
          </p>
        </div>
      )}
      
      {/* Task Points Info Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {(['feed', 'play', 'clean', 'heal'] as const).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className="bg-white dark:bg-gray-700 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{category} Tasks</p>
            <p className="text-sm font-semibold">View Points</p>
          </button>
        ))}
      </div>

      {/* Task Points Info Modal */}
      {selectedCategory && (
        <TaskPointsInfo
          category={selectedCategory}
          isOpen={true}
          onClose={() => setSelectedCategory(null)}
        />
      )}
      
      {/* Stats Grid */}
      {pointsData && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          <StatCard label="Weekly Earned" value={pointsData.weeklyEarned.toLocaleString()} />
          <StatCard label="Points Multiplier" value={pointsData.multiplier} suffix="x" />
        </div>
      )}
      
      {/* Tips */}
      <div className="pt-2 text-xs text-gray-500 dark:text-gray-400">
        <p className="mb-1">💡 Tips to earn more points:</p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>Take care of your Gochi pet daily</li>
          <li>Complete quests and challenges</li>
          <li>Refer friends to earn bonus points</li>
          <li>Hold more points to increase your points per second</li>
        </ul>
      </div>
    </div>
  );
} 