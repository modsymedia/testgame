import React, { useState, useEffect, useCallback, useRef } from "react";
import { getGPTLogs, GPTLogEntry } from "@/utils/openai-service";
import { motion, AnimatePresence } from "framer-motion";
import PixelatedContainer from "@/components/game/PixelatedContainer";
import Image from 'next/image';
import { useIsMobile } from "./use-mobile";

export const GPTLogsPanel = () => {
  const [logs, setLogs] = useState<GPTLogEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "petBehavior" | "petMessage"
  >("all");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(10);
  const isComponentMounted = useRef(true);
  const previousLogsRef = useRef<string>("");
  const isMobile = useIsMobile();

  // Memoize the filter function to avoid recreation on each render
  const getFilteredLogs = useCallback((allLogs: GPTLogEntry[]) => {
    if (activeFilter === "all") {
      return allLogs.slice(0, showCount);
    }
    return allLogs
      .filter((log) => log.type === activeFilter)
      .slice(0, showCount);
  }, [activeFilter, showCount]);

  // Separate effect for event listener setup and cleanup
  useEffect(() => {
    isComponentMounted.current = true;

    const handleLogUpdate = () => {
      if (!isComponentMounted.current) return;
      
      try {
        const updatedLogs = getGPTLogs();
        const filteredLogs = getFilteredLogs(updatedLogs);
        const logsString = JSON.stringify(filteredLogs);
        
        // Only update state if logs actually changed
        if (logsString !== previousLogsRef.current) {
          previousLogsRef.current = logsString;
          setLogs(filteredLogs);
        }
      } catch (error) {
        console.error("Error updating logs:", error);
      }
    };

    // Load initial logs
    handleLogUpdate();

    // Set up event listener for real-time log updates
    window.addEventListener("gptLogUpdated", handleLogUpdate);

    // Clean up when component unmounts
    return () => {
      isComponentMounted.current = false;
      window.removeEventListener("gptLogUpdated", handleLogUpdate);
    };
  }, [getFilteredLogs]); // Only depend on the memoized function


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
        className={`${isMobile ? 'w-full' : 'w-80'} mx-auto`}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <PixelatedContainer className="flex flex-col p-0 w-full" noPadding>
          {/* Header */}
          <div className="bg-[#ebffb7] text-[#304700] p-2 flex items-center justify-between w-full">
            <span className="text-xl font-bold font-pixelify"> LLM INFO</span>
            <div className="flex items-center">
              <Image
                src="/assets/icons/info.svg"
                alt="Info"
                width={24}
                height={24}
                className="text-[#304700]"
              />
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#CADA9B] p-2 w-full">
            {/* Filter Tabs */}
            <div className="flex space-x-4 mb-4">
              <button
                className={`text-sm font-sk-eliz underline ${
                  activeFilter === "all"
                    ? "text-[#304700] font-bold"
                    : "text-[#304700]"
                }`}
                onClick={() => setActiveFilter("all")}
              >
                All
              </button>
              <button
                className={`text-sm font-sk-eliz underline ${
                  activeFilter === "petBehavior"
                    ? "text-[#304700] font-bold"
                    : "text-[#304700]"
                }`}
                onClick={() => setActiveFilter("petBehavior")}
              >
                Behavior
              </button>
              <button
                className={`text-sm font-sk-eliz underline ${
                  activeFilter === "petMessage"
                    ? "text-[#304700] font-bold"
                    : "text-[#304700]"
                }`}
                onClick={() => setActiveFilter("petMessage")}
              >
                Msgs
              </button>
            </div>

            {/* Replace ScrollArea with a simple div with overflow */}
            <div className={`${isMobile ? 'h-[350px]' : 'h-[400px]'} overflow-y-auto pr-1`}>
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
                            <span className="text-[#304700] font-num">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>

                          <div className="mb-2">
                            <div className="font-bold text-[#304700] font-sk-eliz mb-1">
                              {isMobile ? "" : "Prompt:"}
                            </div>
                            <div className="text-[#304700] font-sk-eliz break-words whitespace-pre-wrap text-sm">
                              {expandedLog === index
                                ? log.prompt
                                : truncateText(log.prompt, isMobile ? 80 : 150)}
                            </div>
                          </div>

                          {log.response && (
                            <div>
                              <div className="font-bold text-[#304700] font-sk-eliz mb-1">
                                {isMobile ? "" : "Response:"}
                              </div>
                              <div className="text-[#304700] font-sk-eliz break-words whitespace-pre-wrap text-sm">
                                {expandedLog === index
                                  ? typeof log.response === "string"
                                    ? log.response
                                    : JSON.stringify(log.response, null, 2)
                                  : truncateText(
                                      typeof log.response === "string"
                                        ? log.response
                                        : JSON.stringify(log.response),
                                      isMobile ? 60 : 100
                                    )}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end mt-2">
                            <button
                              className="bg-transparent text-[#304700] px-2 py-1 font-sk-eliz hover:underline text-xs"
                              onClick={() => toggleLogExpansion(index)}
                            >
                              {expandedLog === index
                                ? "Less"
                                : "More"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {logs.length >= showCount && (
                      <div className="flex justify-center mt-4">
                        <button
                          className="bg-[#ebffb7] border-2 border-[#304700] text-[#304700] px-4 py-1 hover:bg-[#d1e599] font-sk-eliz text-sm"
                          onClick={loadMoreLogs}
                        >
                          View more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </PixelatedContainer>
      </motion.div>
    </AnimatePresence>
  );
};