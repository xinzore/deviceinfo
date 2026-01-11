import { Card } from './ui/card';
import { ChevronRight } from 'lucide-react';
import { SpecData } from '../App';

interface SpecCardProps {
  spec: SpecData;
  onClick: () => void;
}

export function SpecCard({ spec, onClick }: SpecCardProps) {
  const Icon = spec.icon;

  return (
    <Card
      className="p-4 cursor-pointer bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
      style={{ backdropFilter: 'blur(20px)' }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`${spec.iconColor} p-2.5 rounded-lg flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {spec.category}
          </p>
          <p className="text-sm mb-0.5 group-hover:text-foreground transition-colors">
            {spec.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {spec.primaryValue}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </Card>
  );
}