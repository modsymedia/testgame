import React, { useState, useEffect } from "react";
import { getGPTLogs, GPTLogEntry } from "@/utils/openai-service";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import PixelatedContainer from "@/components/PixelatedContainer";

// No longer need a local log entry interface as we import it from openai-service

export const GPTLogsPanel = () => {
  const [logs, setLogs] = useState<GPTLogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "petBehavior" | "petMessage"
  >("all");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(10);

  // Function to get filtered logs based on current settings
  const getFilteredLogs = (allLogs: GPTLogEntry[]) => {
    if (activeFilter === "all") {
      return allLogs.slice(0, showCount);
    } else {
      return allLogs
        .filter((log) => log.type === activeFilter)
        .slice(0, showCount);
    }
  };

  // Initial load and setup event listener for real-time updates
  useEffect(() => {
    // Get logs directly from client storage
    const allLogs = getGPTLogs();
    setLogs(getFilteredLogs(allLogs));

    // Set up event listener for real-time log updates
    const handleLogUpdate = () => {
      const updatedLogs = getGPTLogs();
      setLogs(getFilteredLogs(updatedLogs));
    };
    
    window.addEventListener("gptLogUpdated", handleLogUpdate);

    // Clean up when component unmounts
    return () => {
      window.removeEventListener("gptLogUpdated", handleLogUpdate);
    };
  }, [activeFilter, showCount]); // Only re-run when filter or count changes

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setExpandedLog(null); // Reset expanded log when toggling panel
    setShowCount(isExpanded ? 5 : 10); // Show more logs when expanded
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const toggleLogExpansion = (index: number) => {
    setExpandedLog(expandedLog === index ? null : index);
  };

  const loadMoreLogs = () => {
    setShowCount((prev) => prev + 5);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="w-80 mx-auto"
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="border-4 border-[#304700]">
          {/* Header */}
          <div className="bg-[#ebffb7] text-[#304700] p-2 flex items-center justify-between border-b-4 border-[#304700]">
            <span className="text-md font-bold font-sk-eliz">GPT Logs</span>
            <button
              className="text-[#304700] hover:text-[#71814e] font-bold"
              onClick={() => setIsExpanded(false)}
            >
              𝗫
            </button>
          </div>

          {/* Body */}
          <div className="bg-[#CADA9B] p-2">
            {/* Filter Tabs */}
            <div className="flex space-x-4 mb-4">
              <button
                className={`text-md font-sk-eliz underline ${
                  activeFilter === "all"
                    ? "text-[#304700] font-bold"
                    : "text-[#304700]"
                }`}
                onClick={() => setActiveFilter("all")}
              >
                All
              </button>
              <button
                className={`text-md font-sk-eliz underline ${
                  activeFilter === "petBehavior"
                    ? "text-[#304700] font-bold"
                    : "text-[#304700]"
                }`}
                onClick={() => setActiveFilter("petBehavior")}
              >
                Behavior
              </button>
              <button
                className={`text-md font-sk-eliz underline ${
                  activeFilter === "petMessage"
                    ? "text-[#304700] font-bold"
                    : "text-[#304700]"
                }`}
                onClick={() => setActiveFilter("petMessage")}
              >
                Msgs
              </button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <div className="text-center py-4 text-[#304700] font-sk-eliz">
                    No logs available yet
                  </div>
                ) : (
                  <>
                    {logs.map((log, index) => (
                      <div key={index} className="mb-4">
                        <div className="bg-[#ebffb7] border-2 border-[#304700] p-2">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-sk-eliz text-[#304700]">
                              {log.type === "petBehavior" ? "Behavior" : "Msgs"}
                            </span>
                            <span className="text-[#304700] font-sk-eliz">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>

                          <div className="mb-2">
                            <div className="font-bold text-[#304700] font-sk-eliz mb-1">
                              Prompt:
                            </div>
                            <div className="text-[#304700] font-sk-eliz">
                              {expandedLog === index
                                ? log.prompt
                                : truncateText(log.prompt, 150)}
                            </div>
                          </div>

                          {log.response && (
                            <div>
                              <div className="font-bold text-[#304700] font-sk-eliz mb-1">
                                Response:
                              </div>
                              <div className="text-[#304700] font-sk-eliz">
                                {expandedLog === index
                                  ? typeof log.response === "string"
                                    ? log.response
                                    : JSON.stringify(log.response, null, 2)
                                  : truncateText(
                                      typeof log.response === "string"
                                        ? log.response
                                        : JSON.stringify(log.response),
                                      100
                                    )}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end mt-2">
                            <button
                              className="bg-transparent text-[#304700] px-2 py-1 font-sk-eliz hover:underline"
                              onClick={() => toggleLogExpansion(index)}
                            >
                              {expandedLog === index ? "View less" : "View more"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {logs.length >= showCount && (
                      <div className="flex justify-center mt-4">
                        <button
                          className="bg-[#ebffb7] border-2 border-[#304700] text-[#304700] px-4 py-1 hover:bg-[#d1e599] font-sk-eliz"
                          onClick={loadMoreLogs}
                        >
                          View more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
