"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import PixelatedContainer from "@/components/game/PixelatedContainer";
import PixelatedContainerBig from "@/components/game/PixelatedContainerBig";
import { Button } from "@/components/ui/forms/button";
import { Input } from "@/components/ui/forms/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
  const [pointsAmount, setPointsAmount] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [petData, setPetData] = useState<any>(null);
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalPoints: 0,
    activePets: 0,
    deadPets: 0,
    averageHealth: 85,
  });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Check if user is authorized to access admin panel
  useEffect(() => {
    if (!publicKey) {
      router.push("/");
      return;
    }

    // You should implement proper admin authorization here
    const adminWallets = [
      // Add authorized wallet addresses here
      "0x0000000000000000000000000000000000000000",
      // For development, add the current wallet
      publicKey,
    ];

    if (!adminWallets.includes(publicKey)) {
      toast.error("Unauthorized access");
      router.push("/");
    }
  }, [publicKey, router]);

  // Fetch pet data when pet management tab is opened
  useEffect(() => {
    if (activeTab === "petManagement" && publicKey) {
      fetchPetData();
    }
  }, [activeTab, publicKey]);

  // Function to fetch pet data for the current wallet
  const fetchPetData = async () => {
    if (!publicKey) return;

    try {
      setIsLoading(true);

      // First try to get pet data from the pet-state API
      let response = await fetch(`/api/pet-state?walletAddress=${publicKey}`);

      // If the pet-state API fails, try getting data directly from pet management API
      if (!response.ok) {
        response = await fetch("/api/admin/pet-management", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: publicKey,
            operation: "get",
          }),
        });
      }

      if (!response.ok) {
        // If both APIs fail, use wallet data as fallback
        setPetData(
          walletData || {
            health: 0,
            happiness: 0,
            hunger: 0,
            cleanliness: 0,
            energy: 0,
            isDead: false,
          }
        );
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Update local petData state
        const petStateData = result.data;
        setPetData({
          health: petStateData.health || 0,
          happiness: petStateData.happiness || 0,
          hunger: petStateData.hunger || 0,
          cleanliness: petStateData.cleanliness || 0,
          energy: petStateData.energy || 0,
          isDead: petStateData.is_dead || false,
        });

        console.log("✅ Updated pet data:", petStateData);

        // Also update the UI with a toast notification
        toast.success("Pet data refreshed");
      } else {
        // Use wallet data as fallback
        setPetData(
          walletData || {
            health: 0,
            happiness: 0,
            hunger: 0,
            cleanliness: 0,
            energy: 0,
            isDead: false,
          }
        );
      }
    } catch (error) {
      console.error("Error fetching pet data:", error);
      toast.error("Failed to load pet data");
      // Use wallet data as fallback
      setPetData(
        walletData || {
          health: 0,
          happiness: 0,
          hunger: 0,
          cleanliness: 0,
          energy: 0,
          isDead: false,
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load statistics when component mounts
  useEffect(() => {
    loadStats();
  }, []);

  // Function to load statistics
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      // Fetch stats from API
      const response = await fetch("/api/admin/stats");

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        throw new Error(result.message || "Failed to load statistics");
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Failed to load statistics");

      // Set fallback data
      setStats({
        totalUsers: 0,
        totalPoints: 0,
        activePets: 0,
        deadPets: 0,
        averageHealth: 0,
      });
    } finally {
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
            id: "1",
            walletAddress: "0x1234...5678",
            username: userSearchQuery + "_user",
            points: 1250,
            health: 85,
            happiness: 72,
            hunger: 64,
            cleanliness: 91,
            lastActive: new Date().toISOString(),
            isDead: false,
          },
          {
            id: "2",
            walletAddress: "0x5678...9012",
            username: userSearchQuery + "_gamer",
            points: 876,
            health: 32,
            happiness: 21,
            hunger: 15,
            cleanliness: 44,
            lastActive: new Date(Date.now() - 86400000 * 3).toISOString(),
            isDead: true,
          },
        ];
        setUserResults(mockResults);
        setIsSearching(false);
      }, 1000);
    } catch (error) {
      console.error("Error searching users:", error);
      setIsSearching(false);
      toast.error("Failed to search users");
    }
  };

  // Handle user selection
  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setEditingUser({ ...user });
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
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
      setIsLoading(false);
    }
  };

  // Pet management functions
  const handleKillPet = async () => {
    setIsLoading(true);
    try {
      console.log("💀 Killing Pet for wallet:", publicKey);

      if (!publicKey) {
        throw new Error("No wallet connected");
      }

      // Use the API endpoint instead of direct database access
      const response = await fetch("/api/admin/pet-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          operation: "kill",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      const result = await response.json();

      console.log("☠️ Pet killed successfully for wallet:", publicKey);
      toast.success(result.message || "Pet killed successfully");

      // Update pet data
      await fetchPetData();

      // Reload statistics
      loadStats();
    } catch (error) {
      console.error("❌ Error killing pet:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to kill pet"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPet = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Resetting pet for wallet:", publicKey);

      if (!publicKey) {
        throw new Error("No wallet connected");
      }

      // Use the API endpoint instead of direct database access
      const response = await fetch("/api/admin/pet-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          operation: "reset",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      const result = await response.json();

      console.log("✨ Pet reset successfully for wallet:", publicKey);
      toast.success(result.message || "Pet reset successfully");

      // Update pet data
      await fetchPetData();

      // Reload statistics
      loadStats();
    } catch (error) {
      console.error("❌ Error resetting pet:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reset pet"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Account management functions
  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      console.log("🗑️ Deleting account for wallet:", publicKey);

      if (!publicKey) {
        throw new Error("No wallet connected");
      }

      // Use the API endpoint instead of direct database access
      const response = await fetch("/api/admin/user-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          operation: "delete",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      // Also clean up local storage
      localStorage.removeItem(`user_data_${publicKey}`);
      localStorage.removeItem(`pet_state_${publicKey}`);
      localStorage.removeItem(`unlocked-items-${publicKey}`);

      console.log("🚮 Account deleted successfully for wallet:", publicKey);
      toast.success("Account deleted successfully");
      disconnect();
      router.push("/");
    } catch (error) {
      console.error("❌ Error deleting account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
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
      const pointsToAdd = Number(pointsAmount);
      console.log(
        "🎯 Adding points for wallet:",
        publicKey,
        "Amount:",
        pointsToAdd
      );

      if (!publicKey) {
        throw new Error("No wallet connected");
      }

      // Use the API endpoint instead of direct database access
      const response = await fetch("/api/admin/user-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          points: pointsToAdd,
          operation: "add",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      const result = await response.json();

      console.log("🎉 Points added successfully:", {
        wallet: publicKey,
        amount: pointsToAdd,
        newTotal: result.newTotal,
      });

      // Also update local storage to keep UI in sync
      const userData = JSON.parse(
        localStorage.getItem(`user_data_${publicKey}`) || "{}"
      );
      userData.points = result.newTotal;
      localStorage.setItem(`user_data_${publicKey}`, JSON.stringify(userData));

      toast.success(`Successfully gave ${pointsToAdd} points`);
      setPointsAmount("");
      loadStats(); // Reload statistics
    } catch (error) {
      console.error("❌ Error giving points:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to give points"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize pet data with wallet data
  useEffect(() => {
    if (walletData) {
      setPetData({
        health: walletData.health || 0,
        happiness: walletData.happiness || 0,
        hunger: walletData.hunger || 0,
        cleanliness: walletData.cleanliness || 0,
        energy: walletData.energy || 0,
        isDead: walletData.isDead || false,
      });
    }
  }, [walletData]);

  // Render the appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard();
      case "users":
        return renderUsersTab();
      case "petManagement":
        return renderPetManagement();
      case "accountManagement":
        return renderAccountManagement();
      case "pointsManagement":
        return renderPointsManagement();
      default:
        return renderDashboard();
    }
  };

  // Dashboard tab
  const renderDashboard = () => (
    <div className="space-y-4">
      {isLoadingStats ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse text-gray-500">
            Loading statistics...
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PixelatedContainer className="p-3" bgcolor="#f0fff0">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-xs text-gray-600">Total Users</div>
              </div>
            </PixelatedContainer>

            <PixelatedContainer className="p-3" bgcolor="#fff0f0">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {stats.totalPoints.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Total Points</div>
              </div>
            </PixelatedContainer>

            <PixelatedContainer className="p-3" bgcolor="#f0f0ff">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.averageHealth}%</div>
                <div className="text-xs text-gray-600">Average Pet Health</div>
              </div>
            </PixelatedContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <PixelatedContainer className="p-3" bgcolor="#fffff0">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.activePets}
                </div>
                <div className="text-xs text-gray-600">Active Pets</div>
              </div>
            </PixelatedContainer>

            <PixelatedContainer className="p-3" bgcolor="#fff0ff">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.deadPets}
                </div>
                <div className="text-xs text-gray-600">Dead Pets</div>
              </div>
            </PixelatedContainer>
          </div>
        </>
      )}
    </div>
  );

  // Users tab
  const renderUsersTab = () => (
    <div className="space-y-4">
      <PixelatedContainer className="p-3">
        <h3 className="text-lg font-bold mb-2">Search Users</h3>
        <div className="flex gap-2 mb-3">
          <Input
            type="text"
            placeholder="Search by username or wallet address"
            className="flex-1"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
          />
          <Button onClick={searchUsers} disabled={isSearching} size="sm">
            {isSearching ? "Searching..." : "Search"}
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
                    <td className="px-4 py-2 text-right">
                      {user.points.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          user.isDead
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.isDead ? "Dead Pet" : "Active"}
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
        <PixelatedContainer className="p-3" bgcolor="#f0f7ff">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <Input
                  value={editingUser.username}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points
                </label>
                <Input
                  type="number"
                  value={editingUser.points}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      points: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address
                </label>
                <div className="bg-gray-100 px-3 py-2 rounded text-sm overflow-hidden overflow-ellipsis">
                  {editingUser.walletAddress}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Pet Status</h4>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Health
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingUser.health}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      health: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Happiness
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingUser.happiness}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      happiness: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hunger
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingUser.hunger}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        hunger: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cleanliness
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingUser.cleanliness}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        cleanliness: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-3">
            <Button
              variant="outline"
              onClick={() => setEditingUser({ ...selectedUser })}
            >
              Reset
            </Button>
            <Button onClick={handleSaveUserChanges} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </PixelatedContainer>
      )}
    </div>
  );

  // Pet management tab
  const renderPetManagement = () => (
    <div className="space-y-4">
      <PixelatedContainer className="p-3">
        <h3 className="text-lg font-semibold mb-2">Current Pet Status</h3>

        <div className="text-center mb-3">
          <div className="text-base font-pixelify">
            {petData?.isDead
              ? "Your pet has passed away."
              : getPetMoodMessage(
                  petData?.health,
                  petData?.happiness,
                  petData?.hunger,
                  petData?.cleanliness
                )}
          </div>
          <div className="text-xs font-medium mt-1">
            {getPetStatusText(
              petData?.health,
              petData?.happiness,
              petData?.hunger,
              petData?.cleanliness,
              petData?.isDead
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Health</span>
              <span className="text-xs font-medium">
                {petData?.health || 0}/100
              </span>
            </div>
            <div className="w-full bg-[#ebffb7] rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${petData?.health || 0}%`,
                  backgroundColor: getStatColor(petData?.health || 0),
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Happiness</span>
              <span className="text-xs font-medium">
                {petData?.happiness || 0}/100
              </span>
            </div>
            <div className="w-full bg-[#ebffb7] rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${petData?.happiness || 0}%`,
                  backgroundColor: getStatColor(petData?.happiness || 0),
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Food</span>
              <span className="text-xs font-medium">
                {petData?.hunger || 0}/100
              </span>
            </div>
            <div className="w-full bg-[#ebffb7] rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${petData?.hunger || 0}%`,
                  backgroundColor: getStatColor(petData?.hunger || 0),
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Cleanliness</span>
              <span className="text-xs font-medium">
                {petData?.cleanliness || 0}/100
              </span>
            </div>
            <div className="w-full bg-[#ebffb7] rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${petData?.cleanliness || 0}%`,
                  backgroundColor: getStatColor(petData?.cleanliness || 0),
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Energy</span>
              <span className="text-xs font-medium">
                {petData?.energy || 0}/100
              </span>
            </div>
            <div className="w-full bg-[#ebffb7] rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${petData?.energy || 0}%`,
                  backgroundColor: getStatColor(petData?.energy || 0),
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <h3 className="text-sm font-semibold mb-1">Kill Pet</h3>
            <p className="text-xs text-gray-500 mb-2">
              This will set all pet stats to 0, effectively killing it.
            </p>
            <Button
              variant="destructive"
              onClick={handleKillPet}
              disabled={isLoading}
              className="w-full"
              size="sm"
            >
              Kill Pet
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Reset Pet</h3>
            <p className="text-xs text-gray-500 mb-2">
              This will reset all pet stats to 100, reviving it if dead.
            </p>
            <Button
              variant="secondary"
              onClick={handleResetPet}
              disabled={isLoading}
              className="w-full"
              size="sm"
            >
              Reset Pet
            </Button>
          </div>
        </div>
      </PixelatedContainer>
    </div>
  );

  // Helper function to get pet mood message - inspired by ai-pet-advisor
  const getPetMoodMessage = (
    health?: number,
    happiness?: number,
    hunger?: number,
    cleanliness?: number
  ) => {
    if (!health || !happiness || !hunger || !cleanliness)
      return "Pet status unknown";

    if (health < 20) return "Your pet is sick!";
    if (happiness < 20) return "Your pet is feeling sad.";
    if (hunger < 20) return "Your pet is very hungry!";
    if (cleanliness < 20) return "Your pet needs cleaning!";

    const averageStats = (health + happiness + hunger + cleanliness) / 4;
    if (averageStats > 80) return "Your pet is thriving!";
    if (averageStats > 60) return "Your pet is doing well.";
    if (averageStats > 40) return "Your pet needs attention.";
    return "Your pet needs more care.";
  };

  // Helper function to get pet status text
  const getPetStatusText = (
    health?: number,
    happiness?: number,
    hunger?: number,
    cleanliness?: number,
    isDead?: boolean
  ) => {
    if (isDead) return "Pet status: Deceased";
    if (!health || !happiness || !hunger || !cleanliness)
      return "Pet status: Unknown";

    const averageStats = (health + happiness + hunger + cleanliness) / 4;
    if (averageStats > 80) return "Pet status: Excellent";
    if (averageStats > 60) return "Pet status: Good";
    if (averageStats > 40) return "Pet status: Fair";
    if (averageStats > 20) return "Pet status: Poor";
    return "Pet status: Critical";
  };

  // Get color for stat bar - borrowed from ai-pet-advisor
  const getStatColor = (value: number) => {
    if (value > 70) return "#c7e376"; // Light green
    if (value > 40) return "#a7ba75"; // Medium green
    return "#304700"; // Dark olive green
  };

  // Account management tab
  const renderAccountManagement = () => (
    <div className="space-y-4">
      <PixelatedContainer className="p-3">
        <h3 className="text-lg font-semibold mb-2">Current Account</h3>

        <div className="bg-gray-100 p-2 rounded mb-3">
          <div className="text-xs text-gray-500">Wallet Address</div>
          <div className="font-mono text-xs break-all">{publicKey}</div>
        </div>

        {walletData && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-gray-500">Username</div>
              <div className="font-semibold text-sm">
                {walletData.username || "Not set"}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Points</div>
              <div className="font-semibold text-sm">
                {walletData.points?.toLocaleString() || "0"}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Last Active</div>
              <div className="font-semibold text-sm">
                {walletData.lastActive
                  ? new Date(walletData.lastActive).toLocaleString()
                  : "Never"}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Consecutive Days</div>
              <div className="font-semibold text-sm">
                {walletData.consecutiveDays || "0"}
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-2 mt-2">
          <h3 className="text-sm font-semibold mb-1">Danger Zone</h3>
          <p className="text-xs text-gray-500 mb-2">
            Permanently delete this account and all associated data.
          </p>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isLoading}
            className="w-full"
            size="sm"
          >
            Delete Account
          </Button>
        </div>
      </PixelatedContainer>
    </div>
  );

  // Points management tab
  const renderPointsManagement = () => (
    <div className="space-y-4">
      <PixelatedContainer className="p-3">
        <h3 className="text-lg font-semibold mb-2">Give Points</h3>

        {walletData && (
          <div className="mb-3">
            <div className="text-xs text-gray-500">Current Points</div>
            <div className="text-xl font-bold">
              {walletData.points?.toLocaleString() || "0"}
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add Points
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter amount of points"
              className="flex-1"
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
            />
            <Button onClick={handleGivePoints} disabled={isLoading} size="sm">
              Give Points
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPointsAmount("100")}
              className="text-xs px-2"
            >
              +100
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPointsAmount("500")}
              className="text-xs px-2"
            >
              +500
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPointsAmount("1000")}
              className="text-xs px-2"
            >
              +1000
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPointsAmount("-100")}
              className="text-xs px-2 text-red-500"
            >
              -100
            </Button>
          </div>
        </div>

        <div className="border-t pt-2 mt-2">
          <h3 className="text-sm font-semibold mb-1">Multipliers</h3>
          <p className="text-xs text-gray-500 mb-2">
            Set point earning multipliers for this account.
          </p>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Current Multiplier
            </label>
            <div className="flex items-center">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                className="w-24"
                value={walletData?.multiplier || "1.0"}
                disabled
              />
              <span className="ml-2 text-xs text-gray-500">× base points</span>
            </div>
          </div>

          <Button className="w-full" size="sm">
            Update Multiplier
          </Button>
        </div>
      </PixelatedContainer>
    </div>
  );

  return (
    <div className="container mx-auto px-2 py-12 items-center align-middle max-w-[1200px]">
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Sidebar menu - Using PixelatedContainerBig with cada9b background */}
        <div className="col-span-12 md:col-span-3">
          <PixelatedContainerBig className="p-0" bgcolor="#cada9b">
            <div className="divide-y">
              <button
                className={`w-full text-left px-3 py-2 ${
                  activeTab === "dashboard"
                    ? "bg-[#b8c88a] font-semibold"
                    : "hover:bg-[#bdcc94]"
                }`}
                onClick={() => setActiveTab("dashboard")}
              >
                Dashboard
              </button>

              <button
                className={`w-full text-left px-3 py-2 ${
                  activeTab === "users"
                    ? "bg-[#b8c88a] font-semibold"
                    : "hover:bg-[#bdcc94]"
                }`}
                onClick={() => setActiveTab("users")}
              >
                User Management
              </button>

              <button
                className={`w-full text-left px-3 py-2 ${
                  activeTab === "petManagement"
                    ? "bg-[#b8c88a] font-semibold"
                    : "hover:bg-[#bdcc94]"
                }`}
                onClick={() => setActiveTab("petManagement")}
              >
                Pet Management
              </button>

              <button
                className={`w-full text-left px-3 py-2 ${
                  activeTab === "accountManagement"
                    ? "bg-[#b8c88a] font-semibold"
                    : "hover:bg-[#bdcc94]"
                }`}
                onClick={() => setActiveTab("accountManagement")}
              >
                Account Management
              </button>

              <button
                className={`w-full text-left px-3 py-2 ${
                  activeTab === "pointsManagement"
                    ? "bg-[#b8c88a] font-semibold"
                    : "hover:bg-[#bdcc94]"
                }`}
                onClick={() => setActiveTab("pointsManagement")}
              >
                Points Management
              </button>
            </div>
          </PixelatedContainerBig>

          <div className="mt-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={disconnect}
              size="sm"
            >
              Disconnect Wallet
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="col-span-12 md:col-span-9">{renderTabContent()}</div>
      </div>
    </div>
  );
}
