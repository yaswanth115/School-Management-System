import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Clock } from 'lucide-react';

interface ModulePlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
  features: string[];
}

export const ModulePlaceholderPage: React.FC<ModulePlaceholderPageProps> = ({
  title,
  phase,
  description,
  features,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <Badge variant="indigo">{phase}</Badge>
          </div>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <Card className="border-dashed border-2">
        <div className="max-w-2xl py-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-4 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Scheduled in Development Roadmap
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Module Architecture & Data Schema Ready
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            This module is planned as part of {phase}. Its database relations, endpoints, and UI workflows will be activated in accordance with the specified phase implementation order.
          </p>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Planned Capabilities for {title}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs font-medium text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
