import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Loader2, GitCompare, X } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { buildSections, fetchSettings, mergeSettings, AdminSettings } from '../utils/adminSettings';
import { buildPhoneSlug } from '../utils/phoneSlug';
import { readCache, writeCache } from '../utils/localCache';

export default function ComparePage() {
  const navigate = useNavigate();
  const { pair } = useParams();
  const [phone1, setPhone1] = useState<any>(null);
  const [phone2, setPhone2] = useState<any>(null);
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(mergeSettings());
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const summaryCacheKey = 'phonesSummary:v1';
  const cachedSummary = readCache<any[]>(summaryCacheKey);

  const fetchSummary = async () => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/summary`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });
    if (!response.ok) {
      throw new Error('Telefon listesi alınamadı');
    }
    return response.json();
  };

  const { data, error, isLoading } = useSWR('phones-summary', fetchSummary, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    fallbackData: cachedSummary ?? undefined,
    onSuccess: (value) => {
      writeCache(summaryCacheKey, value, 10 * 60 * 1000);
    },
  });
  const phones = data || [];

  useEffect(() => {
    const loadSettings = async () => {
      const remote = await fetchSettings();
      setSettings(mergeSettings(remote));
    };
    loadSettings();
  }, []);

  const sections = useMemo(() => buildSections(settings), [settings]);

  useEffect(() => {
    if (selectedSectionIds.length === 0 && sections.length > 0) {
      setSelectedSectionIds(sections.map(section => section.id));
    }
  }, [sections, selectedSectionIds.length]);

  const filteredPhones1 = useMemo(() => {
    const query = search1.trim().toLowerCase();
    if (!query) return phones;
    return phones.filter((phone) =>
      `${phone.brand} ${phone.title}`.toLowerCase().includes(query)
    );
  }, [phones, search1]);

  const filteredPhones2 = useMemo(() => {
    const query = search2.trim().toLowerCase();
    if (!query) return phones;
    return phones.filter((phone) =>
      `${phone.brand} ${phone.title}`.toLowerCase().includes(query)
    );
  }, [phones, search2]);

  const fetchPhoneById = async (phoneId: string) => {
    const cacheKey = `phone-detail:${phoneId}`;
    const cached = readCache<any>(cacheKey);
    if (cached) return cached;
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${phoneId}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });
    if (!response.ok) {
      throw new Error('Telefon bulunamadı');
    }
    const data = await response.json();
    writeCache(cacheKey, data, 30 * 60 * 1000);
    return data;
  };

  const fetchPhoneBySlug = async (slugValue: string) => {
    const cacheKey = `phone-detail:${slugValue}`;
    const cached = readCache<any>(cacheKey);
    if (cached) return cached;
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/slug/${slugValue}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });
    if (!response.ok) {
      throw new Error('Telefon bulunamadı');
    }
    const data = await response.json();
    writeCache(cacheKey, data, 30 * 60 * 1000);
    return data;
  };

  const parsePair = (value?: string) => {
    if (!value) return null;
    if (value.includes('-vs-')) {
      const [left, right] = value.split('-vs-');
      return left && right ? [left, right] : null;
    }
    if (value.includes('--')) {
      const [left, right] = value.split('--');
      return left && right ? [left, right] : null;
    }
    return null;
  };

  useEffect(() => {
    const loadFromPair = async () => {
      const parsed = parsePair(pair);
      if (!parsed) return;
      try {
        const [slug1, slug2] = parsed;
        const [p1, p2] = await Promise.all([
          fetchPhoneBySlug(slug1),
          fetchPhoneBySlug(slug2),
        ]);
        setPhone1(p1);
        setPhone2(p2);
      } catch (error) {
        console.error('Compare link error:', error);
      }
    };
    loadFromPair();
  }, [pair]);

  const buildShareUrl = () => {
    if (!phone1 || !phone2) return '';
    const slug1 = buildPhoneSlug(phone1);
    const slug2 = buildPhoneSlug(phone2);
    return `${window.location.origin}/compare/${slug1}-vs-${slug2}`;
  };

  const handleCopyLink = async () => {
    const url = buildShareUrl();
    if (!url) return;
    try {
      setShareLoading(true);
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Copy link error:', error);
    } finally {
      setShareLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 bg-white/5 border-white/10">
          <p className="text-sm text-muted-foreground">Telefon listesi yüklenemedi.</p>
        </Card>
      </div>
    );
  }

  const getComparisonData = () => {
    if (!phone1 || !phone2) return [];

    const rows: Array<{ category: string; items: Array<{ label: string; p1: string; p2: string }> }> = [];
    const formatValue = (value: unknown) => {
      if (value === null || value === undefined || value === '') return '';
      if (typeof value === 'boolean') return value ? 'Var' : 'Yok';
      return String(value);
    };

    const sectionRows = sections
      .filter(section => selectedSectionIds.includes(section.id))
      .map(section => {
        const sectionValues1 = phone1?.specs?.sections?.[section.id] || {};
        const sectionValues2 = phone2?.specs?.sections?.[section.id] || {};
        const items = section.fields
          .map(field => {
            const v1 = formatValue(sectionValues1[field.key]);
            const v2 = formatValue(sectionValues2[field.key]);
            if (!v1 && !v2) return null;
            return { label: field.label, p1: v1 || '-', p2: v2 || '-' };
          })
          .filter(Boolean);
        if (items.length === 0) return null;
        return { category: section.title, items };
      })
      .filter(Boolean);

    return [...rows, ...sectionRows];

  };

  const comparisonData = getComparisonData();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <GitCompare className="w-8 h-8" />
              <h1 className="text-4xl">Telefon Karşılaştır</h1>
            </div>
            <p className="text-muted-foreground">
              İki telefonu yan yana karşılaştırın ve özelliklerini inceleyin
            </p>
          </div>

          {/* Phone Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Phone 1 */}
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Telefon 1</label>
                  <Select
                    value={phone1?.id || ''}
                    onValueChange={async (value) => {
                      if (!value) return;
                      try {
                        const selected = await fetchPhoneById(value);
                        setPhone1(selected);
                      } catch (error) {
                        console.error('Phone 1 fetch error:', error);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Telefon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={search1}
                          onChange={(e) => setSearch1(e.target.value)}
                          placeholder="Ara..."
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredPhones1.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sonuç bulunamadı</div>
                      ) : (
                        filteredPhones1.map((phone) => (
                          <SelectItem key={phone.id} value={phone.id}>
                            {phone.brand} {phone.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {phone1 && (
                  <div className="relative">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => setPhone1(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <ImageWithFallback
                      src={phone1.images?.[0]?.src || ''}
                      alt={phone1.title}
                      className="w-full h-48 object-contain rounded-lg"
                      unsplashQuery="smartphone"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="mt-3 text-center">
                      <Badge variant="outline" className="mb-2">{phone1.brand}</Badge>
                      <p className="text-lg">{phone1.title}</p>
                      <p className="text-sm text-muted-foreground">{phone1.price}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Phone 2 */}
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Telefon 2</label>
                  <Select
                    value={phone2?.id || ''}
                    onValueChange={async (value) => {
                      if (!value) return;
                      try {
                        const selected = await fetchPhoneById(value);
                        setPhone2(selected);
                      } catch (error) {
                        console.error('Phone 2 fetch error:', error);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Telefon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          value={search2}
                          onChange={(e) => setSearch2(e.target.value)}
                          placeholder="Ara..."
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredPhones2.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sonuç bulunamadı</div>
                      ) : (
                        filteredPhones2.map((phone) => (
                          <SelectItem key={phone.id} value={phone.id}>
                            {phone.brand} {phone.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {phone2 && (
                  <div className="relative">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => setPhone2(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <ImageWithFallback
                      src={phone2.images?.[0]?.src || ''}
                      alt={phone2.title}
                      className="w-full h-48 object-contain rounded-lg"
                      unsplashQuery="smartphone"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="mt-3 text-center">
                      <Badge variant="outline" className="mb-2">{phone2.brand}</Badge>
                      <p className="text-lg">{phone2.title}</p>
                      <p className="text-sm text-muted-foreground">{phone2.price}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="text-sm text-muted-foreground">
              {phone1 && phone2 ? 'Paylaşılabilir link hazır.' : 'İki cihaz seçince paylaşılabilir link oluşur.'}
            </div>
            <Button
              variant="outline"
              disabled={!phone1 || !phone2 || shareLoading}
              onClick={handleCopyLink}
            >
              {shareLoading ? 'Kopyalanıyor...' : 'Linki Kopyala'}
            </Button>
          </div>

          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 mb-8">
            <h2 className="text-lg mb-4">Karşılaştırılacak Bölümler</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sections.map(section => {
                const checked = selectedSectionIds.includes(section.id);
                return (
                  <label key={section.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        setSelectedSectionIds(prev => {
                          const set = new Set(prev);
                          if (next === true) {
                            set.add(section.id);
                          } else {
                            set.delete(section.id);
                          }
                          return Array.from(set);
                        });
                      }}
                    />
                    {section.title}
                  </label>
                );
              })}
            </div>
          </Card>

          {/* Comparison Table */}
          {phone1 && phone2 ? (
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="space-y-6">
                {comparisonData.map((section, sectionIdx) => (
                  <div key={sectionIdx}>
                    <h3 className="text-lg mb-3 pb-2 border-b border-white/10 uppercase tracking-wider text-blue-400">
                      {section.category}
                    </h3>
                    <div className="space-y-2">
                      {section.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="grid grid-cols-[200px_1fr_1fr] gap-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <div className="text-sm text-muted-foreground">{item.label}</div>
                          <div className="text-sm">{item.p1}</div>
                          <div className="text-sm">{item.p2}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-12 bg-white/5 backdrop-blur-xl border-white/10 text-center">
              <GitCompare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl mb-2">Karşılaştırma Yapmaya Hazır</h3>
              <p className="text-muted-foreground">
                İki telefon seçin ve özelliklerini yan yana karşılaştırın
              </p>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
