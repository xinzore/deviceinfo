import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { SpecData } from '../App';
import { CheckCircle2 } from 'lucide-react';

interface SpecDetailSheetProps {
  spec: SpecData | null;
  onClose: () => void;
}

export function SpecDetailSheet({ spec, onClose }: SpecDetailSheetProps) {
  if (!spec) return null;

  const Icon = spec.icon;

  return (
    <Sheet open={!!spec} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden p-0 bg-black/80 backdrop-blur-2xl border-white/10" style={{ backdropFilter: 'blur(40px)' }}>
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              {/* Icon and Category */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`${spec.iconColor} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">
                    {spec.category}
                  </Badge>
                  <SheetTitle className="text-2xl">{spec.title}</SheetTitle>
                </div>
              </div>
              
              <SheetDescription className="text-base">
                {spec.primaryValue}
                {spec.secondaryValue && ` • ${spec.secondaryValue}`}
              </SheetDescription>
            </SheetHeader>

            {/* Highlights */}
            {spec.highlights && spec.highlights.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                  Key Features
                </h3>
                <div className="space-y-2">
                  {spec.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            {/* Detailed Specs */}
            <div>
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Detailed Specifications
              </h3>
              <div className="space-y-3">
                {spec.details.map((detail, index) => (
                  <Card key={index} className="p-4 bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-colors" style={{ backdropFilter: 'blur(12px)' }}>
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-muted-foreground flex-shrink-0">
                          {detail.label}
                        </p>
                        <p className="text-sm text-right">
                          {detail.value}
                        </p>
                      </div>
                      {detail.description && (
                        <p className="text-xs text-muted-foreground pt-1">
                          {detail.description}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Specifications are subject to change. Actual performance may vary based on usage conditions.
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}