import { useState, useEffect, useCallback } from 'react';
import { dbService } from '../lib/database-service';

// Task structure
interface Task {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  type: 'daily' | 'achievement' | 'gameplay' | 'interaction';
  requirementType?: string;
  requirementValue?: number;
  cooldownHours?: number;
  isAvailable: boolean;
  isCompleted: boolean;
  cooldownRemaining: number;
  requirementsMet: boolean;
}

// Define the type for task cooldowns
interface TaskOptions {
  walletAddress?: string;
  autoFetch?: boolean;
}

export function useTasks(options: TaskOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCooldowns, setLocalCooldowns] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('taskCooldowns');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.error('Failed to load cooldowns from localStorage', e);
        return {};
      }
    }
    return {};
  });

  // Save cooldowns to localStorage
  const saveToStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('taskCooldowns', JSON.stringify(localCooldowns));
      } catch (e) {
        console.error('Failed to save cooldowns to localStorage', e);
      }
    }
  }, [localCooldowns]);

  // Update a task cooldown
  const updateCooldown = useCallback((taskId: string, timestamp: number) => {
    setLocalCooldowns(prev => ({
      ...prev,
      [taskId]: timestamp
    }));
  }, []);

  // Sync local cooldowns with database
  const syncWithDatabase = useCallback(async () => {
    if (!options.walletAddress) return;

    try {
      // Get user data from database
      const userData = await dbService.getUserData(options.walletAddress);
      
      if (!userData) return;
      
      // Get cooldowns from database
      const dbTasks = userData.cooldowns || {} as Record<string, number>;
      
      // Merge local and database cooldowns, keeping the newest timestamp
      const mergedCooldowns: Record<string, number> = { ...dbTasks };
      
      // Add local cooldowns if they're more recent
      Object.entries(localCooldowns).forEach(([taskId, timestamp]) => {
        if (!mergedCooldowns[taskId] || mergedCooldowns[taskId] < timestamp) {
          mergedCooldowns[taskId] = timestamp;
        }
      });
      
      // Update local cooldowns with merged data
      setLocalCooldowns(mergedCooldowns);
      
      // If there are changes to persist to the database
      if (JSON.stringify(dbTasks) !== JSON.stringify(mergedCooldowns)) {
        // Update the database with the merged cooldowns
        await dbService.updateUserData(options.walletAddress, {
          cooldowns: mergedCooldowns
        });
      }
    } catch (err) {
      console.error('Error syncing cooldowns with database:', err);
    }
  }, [localCooldowns, options.walletAddress]);

  // Function to fetch tasks
  const fetchTasks = useCallback(async (address?: string) => {
    const walletToUse = address || options.walletAddress;
    if (!walletToUse) {
      setError('No wallet address provided');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try to sync cooldowns first
      await syncWithDatabase();
      
      const response = await fetch(`/api/tasks?walletAddress=${walletToUse}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch tasks');
      }
      
      // Update tasks with local cooldown timestamps if newer
      const updatedTasks = data.tasks.map((task: Task) => {
        const localTimestamp = localCooldowns[task.id];
        
        // If we have a more recent timestamp locally, use it
        if (localTimestamp) {
          const cooldownMs = (task.cooldownHours || 0) * 60 * 60 * 1000;
          const now = Date.now();
          const isAvailable = now - localTimestamp > cooldownMs;
          
          return {
            ...task,
            isAvailable,
            isCompleted: !isAvailable,
            cooldownRemaining: isAvailable ? 0 : Math.max(0, cooldownMs - (now - localTimestamp))
          };
        }
        
        return task;
      });
      
      setTasks(updatedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [localCooldowns, options.walletAddress, syncWithDatabase]);

  // Function to complete a task
  const completeTask = useCallback(async (taskId: string) => {
    if (!options.walletAddress) {
      setError('No wallet address provided');
      return { success: false, message: 'No wallet address provided' };
    }

    try {
      // Immediately update local cooldown cache to prevent double submits
      const now = Date.now();
      updateCooldown(taskId, now);
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: options.walletAddress,
          taskId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh tasks after successful completion
        await fetchTasks(options.walletAddress);
        
        // Force synchronization to ensure the task completion is saved
        await dbService.forceSynchronize();
        
        return {
          success: true,
          pointsAwarded: data.pointsAwarded,
          totalPoints: data.totalPoints
        };
      } else {
        setError(data.message || 'Failed to complete task');
        return {
          success: false,
          message: data.message || 'Failed to complete task'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error completing task';
      setError(errorMessage);
      console.error('Error completing task:', err);
      return { success: false, message: errorMessage };
    }
  }, [options.walletAddress, fetchTasks, updateCooldown]);

  // Initial fetch
  useEffect(() => {
    if (options.walletAddress && options.autoFetch !== false) {
      fetchTasks(options.walletAddress);
    }
  }, [options.walletAddress, options.autoFetch, fetchTasks]);

  // Subscribe to user data changes to update tasks
  useEffect(() => {
    if (!options.walletAddress) return;
    
    const unsubscribe = dbService.subscribeToChanges('user', (data: any) => {
      if (data.walletAddress === options.walletAddress) {
        // If cooldowns changed, refresh tasks
        if (data.cooldowns) {
          fetchTasks(options.walletAddress);
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [options.walletAddress, fetchTasks]);

  // Before unload, save cache
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToStorage();
      
      if (options.walletAddress) {
        // Try to force sync
        dbService.forceSynchronize().catch(console.error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [options.walletAddress, saveToStorage]);

  // Periodically refresh tasks to update cooldowns
  useEffect(() => {
    if (!options.walletAddress) return;
    
    const interval = setInterval(() => {
      fetchTasks(options.walletAddress);
    }, 60000); // Update every minute
    
    return () => {
      clearInterval(interval);
    };
  }, [options.walletAddress, fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    completeTask
  };
} 