'use client';
import React from 'react';
import { GPTLogsPanel } from '@/components/ui/gpt-logs-panel';

export const pageDynamicConfig = 'force-dynamic'; // Force dynamic rendering (renamed)

// Define the component
const LLMInfoPage: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">LLM Info</h1>
      <GPTLogsPanel />
    </div>
  );
};

// Export the component as default
export default LLMInfoPage;
