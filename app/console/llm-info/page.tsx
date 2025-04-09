'use client';

import React from 'react';
import { GPTLogsPanel } from '@/components/ui/gpt-logs-panel';

// Ensure dynamic rendering for this page as logs update
export const dynamic = 'force-dynamic';

export default function LLMInfoPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4 font-pixelify">LLM Interaction Logs</h1>
      <GPTLogsPanel />
    </div>
  );
} 