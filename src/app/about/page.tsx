import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Trophy } from 'lucide-react';
import type { District, SiteContent } from '@/lib/types';

export const metadata = {
  title: 'About - KZN Chess',
  description: 'Learn about KZN Chess and the districts of KwaZulu-Natal.',
};

export const revalidate = 0;

async function getData() {
  const supabase = createServerClient();
  const [contentRes, districtsRes] = await Promise.all([
    supabase.from('site_content').select('*').eq('key', 'about').single(),
    supabase.from('districts').select('*').eq('is_active', true).order('name'),
  ]);

  return {
    aboutContent: (contentRes.data?.value as any)?.content || '',
    districts: (districtsRes.data || []) as District[],
  };
}

export default async function AboutPage() {
  const { aboutContent, districts } = await getData();

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            About <span className="text-gold">KZN Chess</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            The central platform for chess in KwaZulu-Natal, connecting players,
            organizers, and districts across the province.
          </p>
        </div>

        {/* About Content */}
        {aboutContent && (
          <Card className="mb-12">
            <CardContent className="pt-6 prose prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: aboutContent }} />
            </CardContent>
          </Card>
        )}

        {/* Districts Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Our Districts</h2>
          <p className="text-muted-foreground mb-8">
            KwaZulu-Natal is divided into 11 districts, each with its own
            vibrant chess community.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {districts.map((district) => (
              <Card
                key={district.id}
                className="group hover:border-primary/20 transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {district.name}
                    </h3>
                    <Badge variant="outline" className="text-xs shrink-0">
                      Active
                    </Badge>
                  </div>
                  {district.region && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {district.region}
                    </div>
                  )}
                  {district.coordinator_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {district.coordinator_name}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Trophy,
                title: 'Organizers Submit',
                description:
                  'Approved organizers submit tournament details through our platform.',
              },
              {
                icon: Users,
                title: 'Admin Approves',
                description:
                  'Our admin team reviews and approves tournaments for quality assurance.',
              },
              {
                icon: MapPin,
                title: 'Players Discover',
                description:
                  'Players browse tournaments by district, date, or type and register directly.',
              },
            ].map((step, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-8 pb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
