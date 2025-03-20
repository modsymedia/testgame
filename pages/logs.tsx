import React, { useState, useEffect } from 'react';
import { gptLogs, GPTLogEntry } from '@/utils/openai-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/router';

export default function LogsPage() {
  const [logs, setLogs] = useState<GPTLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const router = useRouter();

  // Filter function based on active tab
  const filterLogs = (type: string) => {
    if (type === 'all') return gptLogs;
    return gptLogs.filter(log => log.type === type);
  };

  // Update logs when tab changes or new logs come in
  useEffect(() => {
    setLogs(filterLogs(activeTab));
    
    // Set up a timer to refresh logs every 3 seconds
    const timer = setInterval(() => {
      setLogs(filterLogs(activeTab));
    }, 3000);
    
    return () => clearInterval(timer);
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLogs(filterLogs(value));
  };

  const clearLogs = () => {
    // This doesn't actually clear the logs array because we can't modify the imported array
    // But we can clear the current view
    setLogs([]);
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">GPT Message Logs</h1>
        <div className="space-x-2">
          <Button onClick={() => router.push('/')}>Back to Game</Button>
          <Button variant="destructive" onClick={clearLogs}>Clear View</Button>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Logs ({gptLogs.length})</TabsTrigger>
          <TabsTrigger value="petBehavior">Pet Behavior</TabsTrigger>
          <TabsTrigger value="petMessage">Pet Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <LogsList logs={logs} formatTimestamp={formatTimestamp} formatJson={formatJson} />
        </TabsContent>
        
        <TabsContent value="petBehavior" className="space-y-4">
          <LogsList logs={logs} formatTimestamp={formatTimestamp} formatJson={formatJson} />
        </TabsContent>
        
        <TabsContent value="petMessage" className="space-y-4">
          <LogsList logs={logs} formatTimestamp={formatTimestamp} formatJson={formatJson} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type LogsListProps = {
  logs: GPTLogEntry[];
  formatTimestamp: (date: Date) => string;
  formatJson: (json: any) => string;
};

function LogsList({ logs, formatTimestamp, formatJson }: LogsListProps) {
  if (logs.length === 0) {
    return <div className="text-center py-10 text-gray-500">No logs found</div>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <Card key={index} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-medium text-blue-600">{log.type}</span>
              <span className="text-sm text-gray-500 ml-2">
                {formatTimestamp(log.timestamp)}
              </span>
            </div>
            {log.error && (
              <span className="text-sm font-semibold bg-red-100 text-red-800 px-2 py-1 rounded">
                Error
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold mb-1">Prompt:</h3>
              <ScrollArea className="h-[100px] border border-gray-200 rounded bg-gray-50 p-2">
                <pre className="text-xs whitespace-pre-wrap">{log.prompt}</pre>
              </ScrollArea>
            </div>

            {log.response && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Response:</h3>
                <ScrollArea className="h-[100px] border border-gray-200 rounded bg-gray-50 p-2">
                  <pre className="text-xs whitespace-pre-wrap">{formatJson(log.response)}</pre>
                </ScrollArea>
              </div>
            )}

            {log.error && (
              <div>
                <h3 className="text-sm font-semibold text-red-600 mb-1">Error:</h3>
                <ScrollArea className="h-[60px] border border-red-200 rounded bg-red-50 p-2">
                  <pre className="text-xs text-red-800 whitespace-pre-wrap">{log.error}</pre>
                </ScrollArea>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
} 