"use client";

import React from 'react';
import { BookOpen, Search, GraduationCap, ClipboardCheck } from 'lucide-react';

interface AgentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface AgentTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  courseColors: { primary: string; secondary: string };
  isDisabled?: boolean;
}

export default function AgentTypeSelector({ value, onChange, courseColors, isDisabled }: AgentTypeSelectorProps) {
  // Component logging
  React.useEffect(() => {
    console.log('[AgentTypeSelector] Component mounted', { value, isDisabled });
    return () => console.log('[AgentTypeSelector] Component unmounted');
  }, []);

  React.useEffect(() => {
    console.log('[AgentTypeSelector] Value changed', { value });
  }, [value]);

  const agentTypes: AgentType[] = [
    {
      id: 'note-taker',
      name: 'Note Taker',
      description: 'Extracts key points and creates structured notes',
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'researcher',
      name: 'Researcher',
      description: 'Analyzes content and provides research insights',
      icon: <Search className="w-5 h-5" />
    },
    {
      id: 'study-buddy',
      name: 'Study Buddy',
      description: 'Creates study guides and practice questions',
      icon: <GraduationCap className="w-5 h-5" />
    },
    {
      id: 'assignment',
      name: 'Complete Assignment',
      description: 'Helps structure and complete assignments',
      icon: <ClipboardCheck className="w-5 h-5" />
    }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Select type of agent</h4>
      <div className="grid grid-cols-2 gap-3">
        {agentTypes.map((agent) => (
          <button
            key={agent.id}
            onClick={() => {
              console.log('[AgentTypeSelector] Agent type selected', { 
                agentId: agent.id, 
                agentName: agent.name 
              });
              onChange(agent.id);
            }}
            disabled={isDisabled}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
              ${value === agent.id ? 'border-opacity-100' : 'border-gray-200 hover:border-opacity-50'}
            `}
            style={{
              borderColor: value === agent.id ? courseColors.primary : undefined,
              backgroundColor: value === agent.id ? courseColors.primary + '10' : undefined
            }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-md"
                style={{ 
                  backgroundColor: value === agent.id ? courseColors.primary + '20' : '#f3f4f6',
                  color: value === agent.id ? courseColors.primary : '#6b7280'
                }}
              >
                {agent.icon}
              </div>
              <div className="flex-1">
                <h5 
                  className="font-semibold text-sm"
                  style={{ color: value === agent.id ? courseColors.primary : '#111827' }}
                >
                  {agent.name}
                </h5>
                <p className="text-xs text-gray-500 mt-1">{agent.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}