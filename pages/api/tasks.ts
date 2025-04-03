import { NextApiRequest, NextApiResponse } from 'next';
import { dbService } from '../../lib/database-service';
import { pointsManager } from '../../lib/points-manager';

// Define task structure
interface Task {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  type: 'daily' | 'achievement' | 'gameplay' | 'interaction';
  requirementType?: string;
  requirementValue?: number;
  cooldownHours?: number;
}

// Extended task structure with availability status
interface TaskWithStatus extends Task {
  isAvailable: boolean;
  isCompleted: boolean;
  cooldownRemaining: number;
  requirementsMet: boolean;
}

// Helper function to safely get task cooldowns
function getTaskCooldowns(cooldowns?: Record<string, number>): Record<string, number> {
  if (!cooldowns) return {};
  if (typeof cooldowns === 'object') return cooldowns;
  return {};
}

// Predefined tasks
const AVAILABLE_TASKS: Task[] = [
  {
    id: 'daily_login',
    title: 'Daily Login',
    description: 'Log in to the game every day to earn points',
    pointsReward: 50,
    type: 'daily',
    cooldownHours: 24
  },
  {
    id: 'pet_feeding',
    title: 'Feed Your Pet',
    description: 'Feed your pet to increase their happiness',
    pointsReward: 20,
    type: 'interaction',
    cooldownHours: 6
  },
  {
    id: 'play_game',
    title: 'Play a Game',
    description: 'Play a game to earn points',
    pointsReward: 30,
    type: 'gameplay',
    cooldownHours: 1
  },
  {
    id: 'reach_score_100',
    title: 'Reach 100 Points',
    description: 'Earn a total of 100 points',
    pointsReward: 50,
    type: 'achievement',
    requirementType: 'points',
    requirementValue: 100
  },
  {
    id: 'refer_friend',
    title: 'Refer a Friend',
    description: 'Refer a friend to earn bonus points',
    pointsReward: 100,
    type: 'achievement'
  }
];

// Task handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle options request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    switch (req.method) {
      case 'GET':
        // Get available tasks
        await handleGetTasks(req, res);
        break;
        
      case 'POST':
        // Complete a task
        await handleCompleteTask(req, res);
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Tasks API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Handle GET request to retrieve available tasks
async function handleGetTasks(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress } = req.query;
  
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'Wallet address is required' });
  }
  
  try {
    // Get user data to check completed tasks
    const user = await dbService.getUserData(walletAddress as string);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get cooldowns from user data
    const cooldowns = getTaskCooldowns(user.cooldowns);
    
    // Filter available tasks based on cooldowns and completion status
    const now = Date.now();
    const availableTasks: TaskWithStatus[] = AVAILABLE_TASKS.map(task => {
      const lastCompleted = cooldowns[task.id];
      const cooldownMs = (task.cooldownHours || 0) * 60 * 60 * 1000;
      const isAvailable = !lastCompleted || (now - lastCompleted > cooldownMs);
      
      // For achievement tasks, check if requirements are met
      let requirementsMet = true;
      if (task.type === 'achievement' && task.requirementType) {
        if (task.requirementType === 'points' && user.points < (task.requirementValue || 0)) {
          requirementsMet = false;
        }
        // Add other requirement checks as needed
      }
      
      return {
        ...task,
        isAvailable,
        isCompleted: !isAvailable,
        cooldownRemaining: isAvailable ? 0 : Math.max(0, cooldownMs - (now - lastCompleted)),
        requirementsMet
      };
    });
    
    return res.status(200).json({ 
      success: true, 
      tasks: availableTasks
    });
  } catch (error) {
    console.error('Error retrieving tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving tasks',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Handle POST request to complete a task
async function handleCompleteTask(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress, taskId } = req.body;
  
  if (!walletAddress || !taskId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Wallet address and task ID are required' 
    });
  }
  
  // Find the task
  const task = AVAILABLE_TASKS.find(t => t.id === taskId);
  
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  
  try {
    // Get user data
    const user = await dbService.getUserData(walletAddress);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if task is on cooldown
    const cooldowns = getTaskCooldowns(user.cooldowns);
    const lastCompleted = cooldowns[taskId];
    const cooldownMs = (task.cooldownHours || 0) * 60 * 60 * 1000;
    const now = Date.now();
    
    if (lastCompleted && (now - lastCompleted < cooldownMs)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Task is on cooldown',
        cooldownRemaining: Math.max(0, cooldownMs - (now - lastCompleted))
      });
    }
    
    // For achievement tasks, check if requirements are met
    if (task.type === 'achievement' && task.requirementType) {
      if (task.requirementType === 'points' && user.points < (task.requirementValue || 0)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Task requirements not met' 
        });
      }
      // Add other requirement checks as needed
    }
    
    // Award points based on task type
    let result;
    
    switch (task.type) {
      case 'daily':
        result = await pointsManager.awardDailyBonus(walletAddress);
        break;
        
      case 'achievement':
        result = await pointsManager.awardAchievement(walletAddress, taskId, {
          taskTitle: task.title,
          pointsReward: task.pointsReward
        });
        break;
        
      case 'gameplay':
        result = await pointsManager.awardGameplayPoints(walletAddress, 100, {
          taskId,
          taskTitle: task.title
        });
        break;
        
      case 'interaction':
        result = await pointsManager.awardInteractionPoints(walletAddress, taskId);
        break;
        
      default:
        // Generic points award
        result = await pointsManager.awardPoints(walletAddress, task.pointsReward, 'achievement', 'earn', {
          taskId,
          taskTitle: task.title
        });
    }
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to award points for task',
        details: result
      });
    }
    
    // Create the updated cooldowns with the current task completion timestamp
    const updatedCooldowns = { 
      ...(user.cooldowns || {}),
      [taskId]: now
    };
    
    // Update user data
    await dbService.updateUserData(walletAddress, {
      cooldowns: updatedCooldowns
    });
    
    // Ensure the data is synchronized
    await dbService.forceSynchronize();
    
    return res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      pointsAwarded: result.points,
      totalPoints: result.total
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return res.status(500).json({
      success: false,
      message: 'Error completing task',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 