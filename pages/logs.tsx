import React, { useState, useEffect } from 'react';
import { getGPTLogs, GPTLogEntry } from '@/utils/openai-service';
import { Button } from '@/components/ui/forms/button';
import { Card } from '@/components/ui/layout/card';
import { ScrollArea } from '@/components/ui/layout/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/layout/tabs';
import { useRouter } from 'next/router';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<GPTLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch and filter logs
  const fetchLogs = () => {
    setIsLoading(true);
    const allLogs = getGPTLogs();
    
    if (activeTab === 'all') {
      setLogs(allLogs);
    } else {
      setLogs(allLogs.filter(log => log.type === activeTab));
    }
    setIsLoading(false);
  };

  // Update logs when tab changes or new logs come in
  useEffect(() => {
    fetchLogs();
    
    // Listen for log updates
    const handleLogUpdate = () => fetchLogs();
    window.addEventListener('gptLogUpdated', handleLogUpdate);
    
    // Set up a timer to refresh logs every 5 seconds
    const timer = setInterval(fetchLogs, 5000);
    
    return () => {
      window.removeEventListener('gptLogUpdated', handleLogUpdate);
      clearInterval(timer);
    };
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    fetchLogs();
  };

  const clearLogs = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gpt_logs_cache');
      fetchLogs();
    }
  };

  const toggleLogExpansion = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatJson = (json: string) => {
    try {
      if (typeof json === 'string') {
        return JSON.stringify(JSON.parse(json), null, 2);
      }
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return json;
    }
  };

  // Get counts for each tab
  const allLogs = typeof window !== 'undefined' ? getGPTLogs() : [];
  const behaviorCount = allLogs.filter(log => log.type === 'petBehavior').length;
  const messageCount = allLogs.filter(log => log.type === 'petMessage').length;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">GPT Message Logs</h1>
        <div className="space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push('/')}>Back to Game</Button>
          <Button variant="destructive" onClick={clearLogs}>Clear Logs</Button>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Logs ({allLogs.length})</TabsTrigger>
          <TabsTrigger value="petBehavior">Pet Behavior ({behaviorCount})</TabsTrigger>
          <TabsTrigger value="petMessage">Pet Messages ({messageCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <LogsList 
            logs={logs} 
            formatTimestamp={formatTimestamp} 
            formatJson={formatJson} 
            expandedLogs={expandedLogs}
            toggleLogExpansion={toggleLogExpansion}
          />
        </TabsContent>
        
        <TabsContent value="petBehavior" className="space-y-4">
          <LogsList 
            logs={logs} 
            formatTimestamp={formatTimestamp} 
            formatJson={formatJson} 
            expandedLogs={expandedLogs}
            toggleLogExpansion={toggleLogExpansion}
          />
        </TabsContent>
        
        <TabsContent value="petMessage" className="space-y-4">
          <LogsList 
            logs={logs} 
            formatTimestamp={formatTimestamp} 
            formatJson={formatJson} 
            expandedLogs={expandedLogs}
            toggleLogExpansion={toggleLogExpansion}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type LogsListProps = {
  logs: GPTLogEntry[];
  formatTimestamp: (date: Date) => string;
  formatJson: (json: any) => string;
  expandedLogs: Set<number>;
  toggleLogExpansion: (index: number) => void;
};

function LogsList({ logs, formatTimestamp, formatJson, expandedLogs, toggleLogExpansion }: LogsListProps) {
  if (logs.length === 0) {
    return <div className="text-center py-10 text-gray-500">No logs found</div>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const isExpanded = expandedLogs.has(index);
        
        return (
          <Card key={index} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium text-blue-600">{log.type}</span>
                <span className="text-sm text-gray-500 ml-2">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {log.error && (
                  <span className="text-sm font-semibold bg-red-100 text-red-800 px-2 py-1 rounded">
                    Error
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 flex items-center gap-1"
                  onClick={() => toggleLogExpansion(index)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      View Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      View More
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-1">Prompt:</h3>
                <ScrollArea className={`${isExpanded ? 'h-[200px]' : 'h-[80px]'} border border-gray-200 rounded bg-gray-50 p-2`}>
                  <pre className="text-xs whitespace-pre-wrap">{log.prompt}</pre>
                </ScrollArea>
              </div>

              {log.response && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Response:</h3>
                  <ScrollArea className={`${isExpanded ? 'h-[200px]' : 'h-[80px]'} border border-gray-200 rounded bg-gray-50 p-2`}>
                    <pre className="text-xs whitespace-pre-wrap">{formatJson(log.response)}</pre>
                  </ScrollArea>
                </div>
              )}

              {log.error && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-1">Error:</h3>
                  <ScrollArea className={`${isExpanded ? 'h-[120px]' : 'h-[60px]'} border border-red-200 rounded bg-red-50 p-2`}>
                    <pre className="text-xs text-red-800 whitespace-pre-wrap">{log.error}</pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
} 