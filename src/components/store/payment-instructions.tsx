'use client';

import { useEffect, useRef } from 'react';
import { ExternalLink, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PaymentInit } from '@/lib/store/payments';
import { cn } from '@/lib/utils';

function isReferenceLine(line: string): boolean {
  return /^(reference|ref)\s*:/i.test(line);
}

export function PaymentInstructions({ payment }: { payment: PaymentInit }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (payment.kind === 'redirect' && payment.method === 'POST') {
      formRef.current?.submit();
    }
  }, [payment]);

  if (payment.kind === 'redirect') {
    if (payment.method === 'POST') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Continue to payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Redirecting you to the payment page. If nothing happens, use the button below.
            </p>
            <form ref={formRef} method="POST" action={payment.url}>
              {Object.entries(payment.fields || {}).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <Button type="submit" className="min-h-[44px]">
                Continue to payment
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Continue to payment</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild className="min-h-[44px]">
            <a href={payment.url}>
              Continue to payment
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Landmark className="w-4 h-4 text-primary" />
        </div>
        <CardTitle className="font-heading">{payment.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">
          {payment.lines.map((line, i) => (
            <li
              key={i}
              className={cn(
                isReferenceLine(line) && 'font-mono font-semibold text-primary select-all'
              )}
            >
              {line}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
