"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import PixelatedContainer from '@/components/game/PixelatedContainer';
import PixelatedContainerBig from '@/components/game/PixelatedContainerBig';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { dbService } from '@/lib/database-service';

// Define statistics type
interface StatsData {
  totalUsers: number;
  totalPoints: number;
  activePets: number;
  deadPets: number;
  averageHealth: number;
}

export default function AdminPage() {
  const { publicKey, walletData, disconnect } = useWallet();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalPoints: 0,
    activePets: 0,
    deadPets: 0,
    averageHealth: 85
  });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Check if user is authorized to access admin panel
  useEffect(() => {
    if (!publicKey) {
      router.push('/');
      return;
    }

    // You should implement proper admin authorization here
    const adminWallets = [
      // Add authorized wallet addresses here
      '0x0000000000000000000000000000000000000000',
      // For development, add the current wallet
      publicKey
    ];

    if (!adminWallets.includes(publicKey)) {
      toast.error("Unauthorized access");
      router.push('/');
    }
  }, [publicKey, router]);

  // Load statistics when component mounts
  useEffect(() => {
    loadStats();
  }, []);

  // Function to load statistics
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      // In a real app, you would fetch this from your API
      // This is a placeholder
      setTimeout(() => {
        setStats({
          totalUsers: 152,
          totalPoints: 28750,
          activePets: 117,
          deadPets: 35,
          averageHealth: 76
        });
        setIsLoadingStats(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading stats:', error);
      setIsLoadingStats(false);
    }
  };

  // Search users function
  const searchUsers = async () => {
    if (!userSearchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      // In a real app, this would be an API call
      // For now, we'll simulate some results
      setTimeout(() => {
        const mockResults = [
          {
            id: '1',
            walletAddress: '0x1234...5678',
            username: userSearchQuery + '_user',
            points: 1250,
            health: 85,
            happiness: 72,
            hunger: 64,
            cleanliness: 91,
            lastActive: new Date().toISOString(),
            isDead: false
          },
          {
            id: '2',
            walletAddress: '0x5678...9012',
            username: userSearchQuery + '_gamer',
            points: 876,
            health: 32,
            happiness: 21,
            hunger: 15,
            cleanliness: 44,
            lastActive: new Date(Date.now() - 86400000 * 3).toISOString(),
            isDead: true
          }
        ];
        setUserResults(mockResults);
        setIsSearching(false);
      }, 1000);
    } catch (error) {
      console.error('Error searching users:', error);
      setIsSearching(false);
      toast.error("Failed to search users");
    }
  };

  // Handle user selection
  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setEditingUser({...user});
  };

  // Handle saving user changes
  const handleSaveUserChanges = async () => {
    setIsLoading(true);
    try {
      // Here you would call your API to save changes
      // For now, just simulate success
      setTimeout(() => {
        setSelectedUser(editingUser);
        toast.success("User updated successfully");
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user");
      setIsLoading(false);
    }
  };

  // Pet management functions
  const handleKillPet = async () => {
    setIsLoading(true);
    try {
      console.log('💀 Killing Pet for wallet:', publicKey);
      
      const response = await fetch('/api/pet/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey,
          health: 0,
          happiness: 0,
          hunger: 0,
          cleanliness: 0,
        }),
      });

      if (!response.ok) throw new Error('Failed to kill pet');
      
      console.log('☠️ Pet killed successfully for wallet:', publicKey);
      toast.success("Pet killed successfully");
      loadStats(); // Reload statistics
    } catch (error) {
      console.error('❌ Error killing pet:', error);
      toast.error("Failed to kill pet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPet = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Resetting pet for wallet:', publicKey);
      
      const response = await fetch('/api/pet/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey,
          health: 100,
          happiness: 100,
          hunger: 100,
          cleanliness: 100,
        }),
      });

      if (!response.ok) throw new Error('Failed to reset pet');
      
      console.log('✨ Pet reset successfully for wallet:', publicKey);
      toast.success("Pet reset successfully");
      loadStats(); // Reload statistics
    } catch (error) {
      console.error('❌ Error resetting pet:', error);
      toast.error("Failed to reset pet");
    } finally {
      setIsLoading(false);
    }
  };

  // Account management functions
  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      console.log('🗑️ Deleting account for wallet:', publicKey);
      
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicKey }),
      });

      if (!response.ok) throw new Error('Failed to delete account');
      
      console.log('🚮 Account deleted successfully for wallet:', publicKey);
      toast.success("Account deleted successfully");
      disconnect();
      router.push('/');
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      toast.error("Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  // Points management functions
  const handleGivePoints = async () => {
    if (!pointsAmount || isNaN(Number(pointsAmount))) {
      toast.error("Please enter a valid number of points");
      return;
    }

    setIsLoading(true);
    try {
      console.log('🎯 Adding points for wallet:', publicKey, 'Amount:', pointsAmount);
      
      const response = await fetch('/api/points/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey,
          points: Number(pointsAmount),
        }),
      });

      if (!response.ok) throw new Error('Failed to add points');
      
      console.log('🎉 Points added successfully:', {
        wallet: publicKey,
        amount: pointsAmount,
        currentTotal: walletData?.points ? walletData.points + Number(pointsAmount) : Number(pointsAmount),
      });
      toast.success(`Successfully gave ${pointsAmount} points`);
      setPointsAmount('');
      loadStats(); // Reload statistics
    } catch (error) {
      console.error('❌ Error giving points:', error);
      toast.error("Failed to give points");
    } finally {
      setIsLoading(false);
    }
  };

  // Render the appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return renderUsersTab();
      case 'petManagement':
        return renderPetManagement();
      case 'accountManagement':
        return renderAccountManagement();
      case 'pointsManagement':
        return renderPointsManagement();
      default:
        return renderDashboard();
    }
  };

  // Dashboard tab
  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      
      {isLoadingStats ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-gray-500">Loading statistics...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PixelatedContainer className="p-5" bgcolor="#f0fff0">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
            </PixelatedContainer>
            
            <PixelatedContainer className="p-5" bgcolor="#fff0f0">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
            </PixelatedContainer>
            
            <PixelatedContainer className="p-5" bgcolor="#f0f0ff">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.averageHealth}%</div>
                <div className="text-sm text-gray-600">Average Pet Health</div>
              </div>
            </PixelatedContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <PixelatedContainer className="p-5" bgcolor="#fffff0">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.activePets}</div>
                <div className="text-sm text-gray-600">Active Pets</div>
              </div>
            </PixelatedContainer>
            
            <PixelatedContainer className="p-5" bgcolor="#fff0ff">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.deadPets}</div>
                <div className="text-sm text-gray-600">Dead Pets</div>
              </div>
            </PixelatedContainer>
          </div>
          
          <PixelatedContainer className="p-5 mt-6">
            <h3 className="text-xl font-bold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => setActiveTab('petManagement')}
                className="w-full"
              >
                Pet Management
              </Button>
              <Button 
                onClick={() => setActiveTab('pointsManagement')}
                className="w-full"
              >
                Points Management
              </Button>
              <Button 
                onClick={() => setActiveTab('users')}
                className="w-full"
                variant="secondary"
              >
                User Search
              </Button>
              <Button 
                onClick={() => router.push('/game')}
                className="w-full" 
                variant="outline"
              >
                Go to Game
              </Button>
            </div>
          </PixelatedContainer>
        </>
      )}
    </div>
  );

  // Users tab
  const renderUsersTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      
      <PixelatedContainer className="p-5">
        <h3 className="text-xl font-bold mb-3">Search Users</h3>
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Search by username or wallet address"
            className="flex-1"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
          />
          <Button 
            onClick={searchUsers}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
        
        {userResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">Wallet</th>
                  <th className="px-4 py-2 text-right">Points</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userResults.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-2">{user.username}</td>
                    <td className="px-4 py-2">{user.walletAddress}</td>
                    <td className="px-4 py-2 text-right">{user.points.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${user.isDead ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {user.isDead ? 'Dead Pet' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button 
                        onClick={() => handleUserSelect(user)} 
                        variant="secondary" 
                        size="sm"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {userResults.length === 0 && userSearchQuery && !isSearching && (
          <div className="text-center py-4 text-gray-500">
            No users found matching your search criteria
          </div>
        )}
      </PixelatedContainer>
      
      {selectedUser && (
        <PixelatedContainer className="p-5" bgcolor="#f0f7ff">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">User Details</h3>
            <Button 
              onClick={() => setSelectedUser(null)} 
              variant="ghost" 
              size="sm"
            >
              Close
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <Input
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <Input
                  type="number"
                  value={editingUser.points}
                  onChange={(e) => setEditingUser({...editingUser, points: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address</label>
                <div className="bg-gray-100 px-3 py-2 rounded text-sm overflow-hidden overflow-ellipsis">
                  {editingUser.walletAddress}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Pet Status</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Health</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingUser.health}
                  onChange={(e) => setEditingUser({...editingUser, health: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Happiness</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingUser.happiness}
                  onChange={(e) => setEditingUser({...editingUser, happiness: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hunger</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingUser.hunger}
                    onChange={(e) => setEditingUser({...editingUser, hunger: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cleanliness</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingUser.cleanliness}
                    onChange={(e) => setEditingUser({...editingUser, cleanliness: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-3">
            <Button
              variant="outline"
              onClick={() => setEditingUser({...selectedUser})}
            >
              Reset
            </Button>
            <Button
              onClick={handleSaveUserChanges}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </PixelatedContainer>
      )}
    </div>
  );

  // Pet management tab
  const renderPetManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Pet Management</h2>
      
      <PixelatedContainer className="p-6">
        <div className="flex items-center justify-center mb-5">
          <div className="relative h-32 w-32">
            <Image 
              src="/assets/pet/cat-normal.png" 
              alt="Pet"
              fill
              className="object-contain"
            />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-3">Current Pet Status</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Health</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${walletData?.health || 0}%` }}></div>
            </div>
            <div className="text-right text-xs mt-1">{walletData?.health || 0}/100</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 mb-1">Happiness</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${walletData?.happiness || 0}%` }}></div>
            </div>
            <div className="text-right text-xs mt-1">{walletData?.happiness || 0}/100</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 mb-1">Hunger</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: `${walletData?.hunger || 0}%` }}></div>
            </div>
            <div className="text-right text-xs mt-1">{walletData?.hunger || 0}/100</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 mb-1">Cleanliness</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${walletData?.cleanliness || 0}%` }}></div>
            </div>
            <div className="text-right text-xs mt-1">{walletData?.cleanliness || 0}/100</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Kill Pet</h3>
            <p className="text-sm text-gray-500 mb-3">This will set all pet stats to 0, effectively killing it.</p>
            <Button 
              variant="destructive" 
              onClick={handleKillPet}
              disabled={isLoading}
              className="w-full"
            >
              Kill Pet
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Reset Pet</h3>
            <p className="text-sm text-gray-500 mb-3">This will reset all pet stats to 100, reviving it if dead.</p>
            <Button 
              variant="secondary" 
              onClick={handleResetPet}
              disabled={isLoading}
              className="w-full"
            >
              Reset Pet
            </Button>
          </div>
        </div>
      </PixelatedContainer>
    </div>
  );

  // Account management tab
  const renderAccountManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Account Management</h2>
      
      <PixelatedContainer className="p-6">
        <h3 className="text-lg font-semibold mb-3">Current Account</h3>
        
        <div className="bg-gray-100 p-3 rounded mb-4">
          <div className="text-sm text-gray-500">Wallet Address</div>
          <div className="font-mono text-sm break-all">{publicKey}</div>
        </div>
        
        {walletData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-500">Username</div>
              <div className="font-semibold">{walletData.username || 'Not set'}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Points</div>
              <div className="font-semibold">{walletData.points?.toLocaleString() || '0'}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Last Active</div>
              <div className="font-semibold">
                {walletData.lastActive ? new Date(walletData.lastActive).toLocaleString() : 'Never'}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Consecutive Days</div>
              <div className="font-semibold">{walletData.consecutiveDays || '0'}</div>
            </div>
          </div>
        )}
        
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-500 mb-3">Permanently delete this account and all associated data.</p>
          <Button 
            variant="destructive" 
            onClick={handleDeleteAccount}
            disabled={isLoading}
            className="w-full"
          >
            Delete Account
          </Button>
        </div>
      </PixelatedContainer>
    </div>
  );

  // Points management tab
  const renderPointsManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Points Management</h2>
      
      <PixelatedContainer className="p-6">
        <h3 className="text-lg font-semibold mb-3">Give Points</h3>
        
        {walletData && (
          <div className="mb-4">
            <div className="text-sm text-gray-500">Current Points</div>
            <div className="text-2xl font-bold">{walletData.points?.toLocaleString() || '0'}</div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Add Points</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter amount of points"
              className="flex-1"
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
            />
            <Button 
              onClick={handleGivePoints}
              disabled={isLoading}
            >
              Give Points
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPointsAmount('100')}
            >
              +100
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPointsAmount('500')}
            >
              +500
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPointsAmount('1000')}
            >
              +1000
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPointsAmount('-100')}
              className="text-red-500"
            >
              -100
            </Button>
          </div>
        </div>
        
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2">Multipliers</h3>
          <p className="text-sm text-gray-500 mb-3">Set point earning multipliers for this account.</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Multiplier</label>
            <div className="flex items-center">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                className="w-32"
                value={walletData?.multiplier || '1.0'}
                disabled
              />
              <span className="ml-2 text-sm text-gray-500">× base points</span>
            </div>
          </div>
          
          {/* This would normally update the multiplier, but we're simulating it here */}
          <Button className="w-full">
            Update Multiplier
          </Button>
        </div>
      </PixelatedContainer>
    </div>
  );

  return (
    <div className="container mx-auto p-4 pt-20 pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <Button 
          variant="outline" 
          onClick={() => router.push('/game')}
        >
          Return to Game
        </Button>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar menu - Using PixelatedContainerBig with cada9b background */}
        <div className="col-span-12 md:col-span-3">
          <PixelatedContainerBig className="p-0" bgcolor="#cada9b">
            <div className="divide-y">
              <button 
                className={`w-full text-left px-4 py-3 ${activeTab === 'dashboard' ? 'bg-[#b8c88a] font-semibold' : 'hover:bg-[#bdcc94]'}`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
              
              <button 
                className={`w-full text-left px-4 py-3 ${activeTab === 'users' ? 'bg-[#b8c88a] font-semibold' : 'hover:bg-[#bdcc94]'}`}
                onClick={() => setActiveTab('users')}
              >
                User Management
              </button>
              
              <button 
                className={`w-full text-left px-4 py-3 ${activeTab === 'petManagement' ? 'bg-[#b8c88a] font-semibold' : 'hover:bg-[#bdcc94]'}`}
                onClick={() => setActiveTab('petManagement')}
              >
                Pet Management
              </button>
              
              <button 
                className={`w-full text-left px-4 py-3 ${activeTab === 'accountManagement' ? 'bg-[#b8c88a] font-semibold' : 'hover:bg-[#bdcc94]'}`}
                onClick={() => setActiveTab('accountManagement')}
              >
                Account Management
              </button>
              
              <button 
                className={`w-full text-left px-4 py-3 ${activeTab === 'pointsManagement' ? 'bg-[#b8c88a] font-semibold' : 'hover:bg-[#bdcc94]'}`}
                onClick={() => setActiveTab('pointsManagement')}
              >
                Points Management
              </button>
            </div>
          </PixelatedContainerBig>
          
          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={disconnect}
            >
              Disconnect Wallet
            </Button>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 
