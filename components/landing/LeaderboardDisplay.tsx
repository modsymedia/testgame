"use client";

import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/utils/leaderboard';
import { LeaderboardEntry } from '@/lib/models';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LeaderboardDisplay() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching leaderboard data...');
      const data = await fetchLeaderboard(15); // Get 15 entries to fill the table
      
      console.log('Leaderboard data received:', data.length, 'entries');
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger leaderboard loading when component mounts or attempt changes
  useEffect(() => {
    loadLeaderboard();
  }, [attempt]);

  // Helper function to retry loading the leaderboard
  const handleRefresh = () => {
    setAttempt(prev => prev + 1); // This will trigger the useEffect
  };

  // Trophy colors for top 3 positions
  const getTrophyColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-700';
      default: return 'text-gray-300';
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="bg-indigo-600 text-white flex flex-row items-center justify-between">
        <CardTitle className="text-center text-2xl font-bold">Top Players</CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRefresh} 
          className="text-white hover:text-white hover:bg-indigo-500"
          title="Refresh leaderboard"
          disabled={isLoading}
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center p-6">
            <p className="text-red-500 mb-3">{error}</p>
            {leaderboard.length > 0 && (
              <p className="text-gray-500 text-sm mb-4">Showing cached data</p>
            )}
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center p-6 text-gray-500">No players yet. Be the first!</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow key={entry.walletAddress}>
                  <TableCell className="text-center">
                    {entry.rank <= 3 ? (
                      <Trophy className={`inline-block ${getTrophyColor(entry.rank)}`} size={18} />
                    ) : (
                      entry.rank
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.username || entry.walletAddress.substring(0, 6) + '...'}
                  </TableCell>
                  <TableCell className="text-right">{entry.score.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 