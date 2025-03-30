"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard } from "@/utils/leaderboard";
import { LeaderboardEntry } from "@/lib/models";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import PixelatedContainer from "@/components/PixelatedContainerBig";
import Image from "next/image";

export default function LeaderboardDisplay() {
  const [displayedEntries, setDisplayedEntries] = useState<LeaderboardEntry[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const { isConnected, publicKey, walletData } = useWallet();
  const [userRank, setUserRank] = useState<number | null>(null);

  const ENTRIES_PER_PAGE = {
    1: 6, // First page shows 6 entries
    other: 15, // Other pages show 15 entries
  };

  const loadLeaderboard = async (page: number) => {
    // Skip if not connected
    if (!isConnected) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`Fetching leaderboard data for page ${page}...`);
      // Determine limit based on page
      const limit = page === 1 ? ENTRIES_PER_PAGE[1] : ENTRIES_PER_PAGE.other;

      // Fetch data for the current page
      const result = await fetchLeaderboard(limit, page);

      console.log(
        "Leaderboard data received:",
        result.entries.length,
        "entries"
      );
      setDisplayedEntries(result.entries);

      // Check if the current user is in the results and set their rank
      if (publicKey) {
        const userEntry = result.entries.find(entry => entry.walletAddress === publicKey);
        if (userEntry) {
          setUserRank(userEntry.rank);
        } else if (page === 1) {
          // If user is not in the first page, fetch their rank separately
          try {
            // Make a separate API call to get the user's rank
            const response = await fetch(`/api/leaderboard/rank?wallet=${publicKey}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.rank) {
                setUserRank(data.rank);
              }
            }
          } catch (error) {
            console.error("Error fetching user rank:", error);
          }
        }
      }

      // Update total entries if we have that information
      if (result.total > 0) {
        setTotalEntries(result.total);
        calculateTotalPages(result.total);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setError("Failed to load leaderboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalPages = (total: number) => {
    if (total <= ENTRIES_PER_PAGE[1]) {
      setTotalPages(1);
      return;
    }

    const remainingEntries = total - ENTRIES_PER_PAGE[1];
    const additionalPages = Math.ceil(
      remainingEntries / ENTRIES_PER_PAGE.other
    );
    setTotalPages(1 + additionalPages);
  };

  const handlePageChange = (direction: "prev" | "next") => {
    let newPage = currentPage;
    if (direction === "prev" && currentPage > 1) {
      newPage = currentPage - 1;
    } else if (direction === "next" && currentPage < totalPages) {
      newPage = currentPage + 1;
    }

    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      loadLeaderboard(newPage);
    }
  };

  // Load initial data when component mounts
  useEffect(() => {
    // Only load if user is connected
    if (isConnected) {
      loadLeaderboard(1);
    } else {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Add a separate effect to load user rank when component mounts
  useEffect(() => {
    const fetchUserRank = async () => {
      if (isConnected && publicKey && !userRank) {
        try {
          const response = await fetch(`/api/leaderboard/rank?wallet=${publicKey}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.rank) {
              setUserRank(data.rank);
            }
          }
        } catch (error) {
          console.error("Error fetching user rank:", error);
        }
      }
    };
    
    fetchUserRank();
  }, [isConnected, publicKey, userRank]);

  // Helper function to retry loading the leaderboard
  const handleRefresh = () => {
    loadLeaderboard(currentPage);
  };

  // Trophy colors for top 3 positions
  const getTrophyColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-amber-700";
      default:
        return "text-gray-300";
    }
  };

  return (
    <div className="flex flex-col items-center w-[500px]">
      <PixelatedContainer className="w-full max-w-lg p-8">
        {!isConnected ? (
          <div className="text-center p-6 text-[#304700]">
            Sign in to view leaderboard
          </div>
        ) : isLoading && displayedEntries.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-0"></div>
          </div>
        ) : error ? (
          <div className="text-center p-6">
            <p className="text-red-500 mb-3">{error}</p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-0 text-[#304700]"
            >
              Try Again
            </Button>
          </div>
        ) : displayedEntries.length === 0 ? (
          <div className="text-center p-6 text-[#304700]">
            No players yet. Be the first!
          </div>
        ) : (
          <>
            {/* User Rank Section */}
            {userRank && (
              <div className="mb-4 p-3 bg-[#ebffb7] rounded-md">
                <h3 className="text-center text-[#304700] font-bold text-[20px] uppercase">Your Position</h3>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8">
                      {userRank <= 3 ? (
                        <Trophy
                          className={`inline-block ${getTrophyColor(userRank)}`}
                          size={22}
                        />
                      ) : (
                        <span className="text-[20px] font-bold text-[#304700]">{userRank}</span>
                      )}
                    </div>
                    <span className="text-[18px] text-[#304700]">
                      {walletData?.username || (publicKey ? publicKey.substring(0, 6) + "..." : "You")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#304700]">
                    <Image
                      src="/assets/icons/coin.png"
                      width={24}
                      height={24}
                      alt="Points"
                      className="inline-block"
                    />
                    <span className="text-[18px] font-medium">
                      {walletData?.petStats?.points?.toLocaleString() || walletData?.points?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <Table>
              {/* <TableHeader>
                    <TableRow className="border-0">
                      <TableHead className="w-[80px] text-center text-[#304700]">Rank</TableHead>
                      <TableHead className="text-[#304700]">Player</TableHead>
                      <TableHead className="text-right text-[#304700]">Score</TableHead>
                    </TableRow>
                  </TableHeader> */}
              <TableBody>
                {displayedEntries.map((entry) => (
                  <TableRow
                    key={entry.walletAddress}
                    className={`border-0 text-[18px] uppercase ${
                      entry.walletAddress === publicKey ? "bg-[#ebffb7]/30" : ""
                    }`}
                  >
                    <TableCell className="flex-1 flex items-center space-x-3">
                      <div className="w-4 h-12 flex items-center justify-center text-[16px]">
                        {entry.rank <= 3 ? (
                          <Trophy
                            className={`inline-block ${getTrophyColor(
                              entry.rank
                            )}`}
                            size={18}
                          />
                        ) : (
                          <span className="text-[18px]">{entry.rank}</span>
                        )}
                      </div>
                      <div className="truncate uppercase">
                        {entry.username ||
                          entry.walletAddress.substring(0, 6) + "..."}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[#304700] flex items-center justify-start gap-2 min-w-[120px]">
                      <Image
                        src="/assets/icons/coin.png"
                        width={24}
                        height={24}
                        alt="Points"
                        className="inline-block"
                      />
                      {entry.score.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </PixelatedContainer>

      {displayedEntries.length > 0 && totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-8 items-center">
          <button
            onClick={() => handlePageChange("prev")}
            disabled={currentPage === 1 || isLoading}
            className={`w-12 h-12 relative transition-opacity ${
              currentPage === 1 || isLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-80 cursor-pointer"
            }`}
          >
            <div className="w-full h-full relative scale-x-[-1]">
              <Image src="/assets/right-arrow.svg" alt="Previous page" fill />
            </div>
          </button>

          <span className="flex items-center text-[#304700] font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange("next")}
            disabled={currentPage === totalPages || isLoading}
            className={`w-12 h-12 relative transition-opacity ${
              currentPage === totalPages || isLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-80 cursor-pointer"
            }`}
          >
            <div className="w-full h-full relative">
              <Image src="/assets/right-arrow.svg" alt="Next page" fill />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
