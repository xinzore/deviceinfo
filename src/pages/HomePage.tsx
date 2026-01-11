import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Smartphone, Zap, Shield, Eye, Plus } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { buildPhoneSlug } from '../utils/phoneSlug';
import { toCamelKey } from '../utils/specConfig';
import { readCache, writeCache } from '../utils/localCache';

interface Phone {
  id: string;
  title: string;
  brand: string;
  images: { src: string; alt: string; color: string }[];
  shortDesc: string;
  price: string;
  category?: string;
  submittedAt?: string;
  specs?: any;
}

export default function HomePage() {
  const navigate = useNavigate();
  const categories = ['Telefon', 'Televizyon', 'Laptop'];
  const latestCacheKey = `latestByCategory:v1:${categories.join('|')}`;
  const cachedLatest = readCache<Record<string, Phone[]>>(latestCacheKey);
  const fetchLatest = async () => {
    const results = await Promise.all(
      categories.map(async (category) => {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/latest?category=${encodeURIComponent(category)}&limit=6`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        if (!response.ok) {
          throw new Error(`Backend yanıt vermedi: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return [category, data] as const;
      })
    );
    return results.reduce((acc, [category, items]) => {
      acc[category] = items;
      return acc;
    }, {} as Record<string, Phone[]>);
  };

  const { data: latestByCategory = {}, error } = useSWR(['latest', categories], fetchLatest, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    fallbackData: cachedLatest ?? undefined,
    onSuccess: (value) => {
      writeCache(latestCacheKey, value, 2 * 60 * 1000);
    },
  });
  const loading = !error && (!latestByCategory || Object.keys(latestByCategory).length === 0);
  const errorMessage = error?.message || null;

  const normalizeCategory = (value?: string) => (value || 'Cihaz').trim().toLowerCase();

  const getSpecValue = (phone: Phone, sectionId: string, label: string, fallback?: string) => {
    const key = toCamelKey(label);
    const fromSections = phone?.specs?.sections?.[sectionId]?.[key];
    if (fromSections !== undefined && fromSections !== null && String(fromSections).trim() !== '') {
      return String(fromSections);
    }
    return fallback || '';
  };

  const getHighlights = (phone: Phone) => {
    const display = getSpecValue(
      phone,
      'ekran',
      'Ekran Boyutu',
      phone?.specs?.display?.size
    );
    const ram = getSpecValue(
      phone,
      'ramDepolama',
      'Bellek (RAM)',
      phone?.specs?.memory?.ram
    );
    const storage = getSpecValue(
      phone,
      'ramDepolama',
      'Dahili Depolama',
      phone?.specs?.memory?.internal
    );
    const battery = getSpecValue(
      phone,
      'batarya',
      'Batarya Kapasitesi (Tipik)',
      phone?.specs?.battery?.type
    );

    return [
      { label: 'Ekran', value: display },
      { label: 'RAM', value: ram },
      { label: 'Depolama', value: storage },
      { label: 'Batarya', value: battery },
    ];
  };

  const getLatestByCategory = (category: string) => latestByCategory[category] || [];

  const categorySections = [
    { key: 'Telefon', title: 'Son Eklenen Telefonlar', empty: 'Henüz telefon eklenmemiş' },
    { key: 'Televizyon', title: 'Son Eklenen Televizyonlar', empty: 'Henüz televizyon eklenmemiş' },
    { key: 'Laptop', title: 'Son Eklenen Laptoplar', empty: 'Henüz laptop eklenmemiş' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>

        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-6xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-6 animate-fade-in">
              <Badge variant="outline" className="px-4 py-2 gap-2 bg-white/5 backdrop-blur-md border-white/10">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                Yeni Nesil Cihaz Bilgi Platformu
              </Badge>
            </div>

            {/* Hero Title */}
            <div className="text-center mb-12">
              <h1 className="text-6xl md:text-8xl mb-6 tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Cihaz İnfo
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Akıllı telefonların ve diğer elektroniklerin teknik özelliklerini modern, minimal ve premium bir deneyimle keşfedin
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                size="lg"
                className="text-lg px-8 py-6"
                onClick={() => {
                  const phonesSection = document.getElementById('phones');
                  phonesSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Eye className="mr-2 w-5 h-5" />
                Cihazları Keşfet
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10"
                onClick={() => navigate('/submit')}
              >
                <Plus className="mr-2 w-5 h-5" />
                Cihaz Ekle
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-200">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg mb-2">Anında Keşif</h3>
                <p className="text-sm text-muted-foreground">
                  Önemli özellikleri ilk 5 saniyede görün, detaylara hemen ulaşın
                </p>
              </Card>

              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-200">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-lg mb-2">Modern Tasarım</h3>
                <p className="text-sm text-muted-foreground">
                  Modern ve premium arayüz
                </p>
              </Card>

              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-200">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-lg mb-2">Topluluk Destekli</h3>
                <p className="text-sm text-muted-foreground">
                  Herkes içerik ekleyebilir.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Sections */}
      <div id="phones" className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 bg-white/5 backdrop-blur-xl border-white/10 animate-pulse">
                  <div className="w-full h-64 bg-white/10 rounded-lg mb-4"></div>
                  <div className="h-6 bg-white/10 rounded mb-2"></div>
                  <div className="h-4 bg-white/10 rounded w-2/3"></div>
                </Card>
              ))}
            </div>
          ) : errorMessage ? (
            <Card className="p-12 bg-white/5 backdrop-blur-xl border-white/10 text-center">
              <Smartphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl mb-2">Cihazlar yüklenirken hata oluştu</h3>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <Button onClick={() => navigate('/submit')}>
                <Plus className="mr-2 w-4 h-4" />
                Telefon Ekle
              </Button>
            </Card>
          ) : Object.values(latestByCategory).every(list => list.length === 0) ? (
            <Card className="p-12 bg-white/5 backdrop-blur-xl border-white/10 text-center">
              <Smartphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl mb-2">Henüz içerik eklenmemiş</h3>
              <p className="text-muted-foreground mb-6">
                İlk cihazı ekleyen siz olun!
              </p>
              <Button onClick={() => navigate('/submit')}>
                <Plus className="mr-2 w-4 h-4" />
                Cihaz Ekle
              </Button>
            </Card>
          ) : (
            <div className="space-y-12">
              {categorySections.map(section => {
                const items = getLatestByCategory(section.key);
                return (
                  <div key={section.key}>
                    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-3xl md:text-4xl mb-2">{section.title}</h2>
                        <p className="text-muted-foreground text-sm">
                          Son eklenen {section.key.toLowerCase()} ürünleri
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/submit')}>
                        <Plus className="mr-2 w-4 h-4" />
                        Yeni Ekle
                      </Button>
                    </div>

                    {items.length === 0 ? (
                      <Card className="p-10 bg-white/5 backdrop-blur-xl border-white/10 text-center">
                        <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <h3 className="text-lg mb-2">{section.empty}</h3>
                        <p className="text-sm text-muted-foreground">
                          İlk {section.key.toLowerCase()} ürününü sen ekle.
                        </p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((phone) => {
                          const highlights = getHighlights(phone);
                          return (
                            <Card
                              key={phone.id}
                              className="group flex gap-4 p-4 bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
                              onClick={() => navigate(`/phone/${buildPhoneSlug(phone)}`)}
                            >
                              <div className="relative w-24 sm:w-28 flex-shrink-0">
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-blue-500/10 to-transparent"></div>
                                <ImageWithFallback
                                  src={phone.images?.[0]?.src || ''}
                                  alt={phone.title}
                                  className="w-full h-40 object-contain rounded-xl group-hover:scale-105 transition-transform duration-300" style={{ maxHeight: 220 }}
                                  unsplashQuery="electronics"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <Badge variant="outline" className="mb-2 text-xs">
                                  {phone.brand}
                                </Badge>
                                <h3 className="text-base sm:text-lg mb-2 leading-tight">
                                  {phone.title}
                                </h3>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                  {highlights.map((item) => (
                                    <div key={item.label} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                                      <p className="text-[10px] uppercase text-muted-foreground">{item.label}</p>
                                      <p className="text-xs font-medium">
                                        {item.value || '—'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm sm:text-base font-medium">{phone.price}</span>
                                  <Button size="sm" variant="ghost" className="group-hover:bg-white/5">
                                    Detaylar
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
