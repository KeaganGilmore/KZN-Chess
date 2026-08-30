import { PageTransition } from '@/components/ui/page-transition';
import { CartPage } from '@/components/store/cart-page';

export const metadata = {
  title: 'Cart - KZN Chess',
  robots: { index: false, follow: false },
};

export default function StoreCartPage() {
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-8">
          Your cart
        </h1>
        <CartPage />
      </div>
    </PageTransition>
  );
}
