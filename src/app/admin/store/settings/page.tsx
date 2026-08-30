import { Settings } from 'lucide-react';
import { SettingsForm } from '@/components/admin/store/settings-form';
import { CategoriesManager } from '@/components/admin/store/categories-manager';
import { CollectionPointsManager } from '@/components/admin/store/collection-points-manager';

export const metadata = {
  title: 'Store settings - Admin - KZN Chess',
};

export default function AdminStoreSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Store settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Opening status, delivery, payment details, categories and collection points.
        </p>
      </div>
      <SettingsForm />
      <CategoriesManager />
      <CollectionPointsManager />
    </div>
  );
}
