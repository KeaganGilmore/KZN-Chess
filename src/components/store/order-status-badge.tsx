import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/store/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/lib/store/status';
import { cn } from '@/lib/utils';

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(ORDER_STATUS_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
