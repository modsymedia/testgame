import React, { useState, useEffect } from 'react';
import { getGPTLogs, GPTLogEntry } from '@/utils/openai-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import PixelatedContainer from '@/components/PixelatedContainer';

// No longer need a local log entry interface as we import it from openai-service

export const GPTLogsPanel = () => {
  const [logs, setLogs] = useState<GPTLogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'petBehavior' | 'petMessage'>('all');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(5);

  // Function to get filtered logs based on current settings
  const getFilteredLogs = (allLogs: GPTLogEntry[]) => {
    if (activeFilter === 'all') {
      return allLogs.slice(0, showCount);
    } else {
      return allLogs
        .filter((log) => log.type === activeFilter)
        .slice(0, showCount);
    }
  };

  // Load logs from client storage
  const loadLogs = () => {
    if (!isExpanded) return;
    
    // Get logs directly from client storage
    const allLogs = getGPTLogs();
    setLogs(getFilteredLogs(allLogs));
  };

  // Initial load and setup event listener for real-time updates
  useEffect(() => {
    if (isExpanded) {
      loadLogs();
      
      // Set up event listener for real-time log updates
      const handleLogUpdate = () => loadLogs();
      window.addEventListener('gptLogUpdated', handleLogUpdate);
      
      // Clean up when component unmounts or collapses
      return () => {
        window.removeEventListener('gptLogUpdated', handleLogUpdate);
      };
    }
  }, [isExpanded, activeFilter, showCount]);

  // Update filtered logs when filter or count changes
  useEffect(() => {
    loadLogs();
  }, [activeFilter, showCount]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setExpandedLog(null); // Reset expanded log when toggling panel
    setShowCount(isExpanded ? 5 : 10); // Show more logs when expanded
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleLogExpansion = (index: number) => {
    setExpandedLog(expandedLog === index ? null : index);
  };

  const loadMoreLogs = () => {
    setShowCount(prev => prev + 5);
  };

  return (
    <AnimatePresence>
      <motion.div
        className={`absolute right-4 top-20 z-10 ${isExpanded ? 'w-80' : 'w-16'}`}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <PixelatedContainer className="overflow-hidden" noPadding>
          <div className="bg-[#ebffb7] border-2 border-[#304700] w-full">
            {/* Header */}
            <div
              className="bg-[#ebffb7] text-[#304700] p-2 flex items-center justify-between cursor-pointer border-b-2 border-[#304700]"
              onClick={toggleExpand}
            >
              <span className="text-md font-bold font-sk-eliz">GPT Logs</span>
              <button 
                className="text-[#304700] hover:text-[#71814e] font-bold"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                𝗫
              </button>
            </div>

            {isExpanded && (
              <div className="p-2 bg-[#ebffb7]">
                {/* Filter Tabs */}
                <div className="flex justify-between items-center mb-2 border-b-2 border-[#304700] pb-2">
                  <div className="flex space-x-4 flex-1 px-4">
                    <button 
                      className={`text-md font-sk-eliz ${activeFilter === 'all' ? 'text-[#304700] font-bold' : 'text-[#71814e]'}`}
                      onClick={() => setActiveFilter('all')}
                    >
                      All
                    </button>
                    <button 
                      className={`text-md font-sk-eliz ${activeFilter === 'petBehavior' ? 'text-[#304700] font-bold' : 'text-[#71814e]'}`}
                      onClick={() => setActiveFilter('petBehavior')}
                    >
                      Behavior
                    </button>
                    <button 
                      className={`text-md font-sk-eliz ${activeFilter === 'petMessage' ? 'text-[#304700] font-bold' : 'text-[#71814e]'}`}
                      onClick={() => setActiveFilter('petMessage')}
                    >
                      Msgs
                    </button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-2">
                  <div className="space-y-4">
                    {logs.length === 0 ? (
                      <div className="text-center py-4 text-[#304700] font-sk-eliz">
                        No logs available yet
                      </div>
                    ) : (
                      <>
                        {logs.map((log, index) => (
                          <div key={index} className="mb-4">
                            <div className="bg-[#ebffb7] border-2 border-[#304700] mb-2">
                              <div className="flex justify-between items-start p-2 border-b border-[#304700]">
                                <span className="font-bold text-[#304700] font-sk-eliz">
                                  {log.type === 'petBehavior' ? 'Behavior' : 'Msgs'}
                                </span>
                                <span className="text-[#304700]">
                                  {formatTimestamp(log.timestamp)}
                                </span>
                              </div>
                              
                              <div className="p-2">
                                <div className="font-bold text-[#304700] font-sk-eliz mb-1">Prompt:</div>
                                <div className="text-[#304700] mb-2 font-sk-eliz">
                                  {expandedLog === index 
                                    ? log.prompt
                                    : truncateText(log.prompt, 150)}
                                </div>
                                
                                {log.response && (
                                  <>
                                    <div className="font-bold text-[#304700] font-sk-eliz mb-1">Response:</div>
                                    <div className="text-[#304700] font-sk-eliz">
                                      {expandedLog === index 
                                        ? typeof log.response === 'string' 
                                          ? log.response 
                                          : JSON.stringify(log.response, null, 2)
                                        : truncateText(typeof log.response === 'string' 
                                            ? log.response 
                                            : JSON.stringify(log.response), 100)}
                                    </div>
                                  </>
                                )}
                                
                                <div className="flex justify-end mt-2">
                                  <button
                                    className="bg-[#ebffb7] border-2 border-[#304700] text-[#304700] px-2 py-1 hover:bg-[#d1e599] font-sk-eliz"
                                    onClick={() => toggleLogExpansion(index)}
                                  >
                                    {expandedLog === index ? 'View' : 'View more'}
                                  </button>
                                </div>
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
            )}
          </div>
        </PixelatedContainer>
      </motion.div>
    </AnimatePresence>
  );
}; 