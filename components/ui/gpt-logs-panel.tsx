import React, { useState, useEffect } from 'react';
import { gptLogs, GPTLogEntry } from '@/utils/openai-service';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';

export const GPTLogsPanel = () => {
  const [logs, setLogs] = useState<GPTLogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'petBehavior' | 'petMessage'>('all');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(5);

  // Update logs every 3 seconds
  useEffect(() => {
    const updateLogs = () => {
      if (activeFilter === 'all') {
        setLogs([...gptLogs].slice(0, showCount));
      } else {
        setLogs([...gptLogs].filter(log => log.type === activeFilter).slice(0, showCount));
      }
    };

    updateLogs();
    const interval = setInterval(updateLogs, 3000);

    return () => clearInterval(interval);
  }, [activeFilter, showCount]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setExpandedLog(null); // Reset expanded log when toggling panel
    setShowCount(isExpanded ? 5 : 10); // Show more logs when expanded
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString();
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
        className={`absolute left-0 top-1/4 z-10 bg-white shadow-lg rounded-r-lg overflow-hidden ${isExpanded ? 'w-80' : 'w-16'}`}
        initial={{ x: -10 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="bg-indigo-600 text-white p-2 flex items-center justify-between cursor-pointer"
          onClick={toggleExpand}
        >
          {isExpanded ? (
            <>
              <span className="text-sm font-semibold">GPT Logs</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-white p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                ←
              </Button>
            </>
          ) : (
            <span className="whitespace-nowrap text-xs font-semibold">GPT Logs</span>
          )}
        </div>

        {isExpanded && (
          <div className="p-2">
            <div className="flex space-x-1 mb-2">
              <Button 
                variant={activeFilter === 'all' ? "default" : "outline"} 
                size="sm" 
                className="text-xs h-6 flex-1"
                onClick={() => setActiveFilter('all')}
              >
                All
              </Button>
              <Button 
                variant={activeFilter === 'petBehavior' ? "default" : "outline"} 
                size="sm" 
                className="text-xs h-6 flex-1"
                onClick={() => setActiveFilter('petBehavior')}
              >
                Behavior
              </Button>
              <Button 
                variant={activeFilter === 'petMessage' ? "default" : "outline"} 
                size="sm" 
                className="text-xs h-6 flex-1"
                onClick={() => setActiveFilter('petMessage')}
              >
                Msgs
              </Button>
            </div>

            <ScrollArea className="h-[450px]">
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-xs">No logs yet</div>
                ) : (
                  <>
                    {logs.map((log, index) => (
                      <Card key={index} className="p-2 text-xs">
                        <div className="flex justify-between items-start">
                          <span className={`font-medium ${log.type === 'petBehavior' ? 'text-blue-600' : 'text-green-600'}`}>
                            {log.type === 'petBehavior' ? 'AI' : 'Msg'}
                          </span>
                          <span className="text-gray-500">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        
                        <div className="mt-1 border-t pt-1">
                          <div className="flex justify-between">
                            <div className="text-gray-700 font-semibold">Prompt:</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-xs px-1 py-0 -mt-1 -mr-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLogExpansion(index);
                              }}
                            >
                              {expandedLog === index ? 'Hide' : 'View'}
                            </Button>
                          </div>
                          <div className="text-gray-600">
                            {expandedLog === index 
                              ? <pre className="bg-gray-50 p-1 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-[150px]">{log.prompt}</pre> 
                              : truncateText(log.prompt, 100)}
                          </div>
                        </div>
                        
                        {log.response && (
                          <div className="mt-1 border-t pt-1">
                            <div className="text-gray-700 font-semibold">Response:</div>
                            <div className="text-gray-600">
                              {expandedLog === index 
                                ? typeof log.response === 'string' 
                                  ? log.response 
                                  : (
                                    <pre className="bg-gray-50 p-1 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-[150px]">
                                      {JSON.stringify(log.response, null, 2)}
                                    </pre>
                                  )
                                : truncateText(typeof log.response === 'string' ? log.response : JSON.stringify(log.response), 100)}
                            </div>
                          </div>
                        )}
                        
                        {log.error && (
                          <div className="mt-1 border-t pt-1">
                            <div className="text-red-600 font-semibold">Error:</div>
                            <div className="text-red-500">
                              {expandedLog === index 
                                ? <pre className="bg-red-50 p-1 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-[100px]">{log.error}</pre>
                                : truncateText(log.error, 100)}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2 py-0"
                            onClick={() => toggleLogExpansion(index)}
                          >
                            {expandedLog === index ? 'View Less' : 'View More'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                    
                    {gptLogs.length > logs.length && (
                      <div className="flex justify-center mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={loadMoreLogs}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}; 