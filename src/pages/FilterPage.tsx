import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, SlidersHorizontal, X } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { buildPhoneSlug } from '../utils/phoneSlug';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { fetchSettings, mergeSettings, AdminSettings } from '../utils/adminSettings';
import { readCache, writeCache } from '../utils/localCache';
import { DualRangeSlider } from '../components/ui/dual-range-slider';

type SummaryPhone = {
  id: string;
  title: string;
  brand: string;
  images?: { src: string; alt: string; color: string }[];
  category?: string;
  price?: string;
  submittedAt?: string;
  filters?: Record<string, unknown>;
  table?: Record<string, unknown>;
  specs?: Record<string, unknown>;
};



const parsePrice = (value?: string) => {
  if (!value) return null;
  const raw = String(value).replace(/[^0-9.,]/g, '').trim();
  if (!raw) return null;
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  if (hasComma && hasDot) {
    return Number(raw.replace(/\./g, '').replace(',', '.'));
  }
  if (hasComma && !hasDot) {
    return Number(raw.replace(',', '.'));
  }
  return Number(raw);
};

const normalize = (value?: string) => (value || '').trim().toLowerCase();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getUnitLabel = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('ram') || normalized.includes('bellek')) return 'GB';
  if (normalized.includes('depolama') || normalized.includes('dahili depolama')) return 'GB';
  if (normalized.includes('ekran boyutu')) return 'inç';
  if (normalized.includes('batarya kapasitesi')) return 'mAh';
  if (normalized.includes('kamera çözünürlüğü') || normalized.includes('kamera cozunurlugu')) return 'MP';
  if (normalized.includes('cpu çekirdeği') || normalized.includes('cpu cekirdegi') || normalized.includes('işlemci çekirdeği') || normalized.includes('islemci cekirdegi')) {
    return 'çekirdek';
  }
  if (normalized.includes('antutu')) return 'puan';
  return '';
};

const formatFilterValue = (value: unknown, label: string, type?: string) => {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'checkbox') {
    if (typeof value === 'boolean') return value ? 'Var' : 'Yok';
    const normalized = String(value).trim().toLowerCase();
    if (['var', 'true', 'evet', 'yes'].includes(normalized)) return 'Var';
    if (['yok', 'false', 'hayir', 'no'].includes(normalized)) return 'Yok';
  }
  const strValue = String(value);
  const unit = getUnitLabel(label);
  // Değer zaten birimi içeriyorsa tekrar ekleme
  if (unit && strValue.toLowerCase().includes(unit.toLowerCase())) {
    return strValue;
  }
  return unit ? `${strValue} ${unit}` : strValue;
};

export default function FilterPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings>(mergeSettings());

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedBrand, setSelectedBrand] = useState('Tümü');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const [rangeFilters, setRangeFilters] = useState<Record<string, { min: string; max: string }>>({});
  const [applied, setApplied] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    selectedCategory: 'Tümü',
    selectedBrand: 'Tümü',
    minPrice: '',
    maxPrice: '',
    sortBy: 'latest',
    fieldFilters: {} as Record<string, string>,
    rangeFilters: {} as Record<string, { min: string; max: string }>,
  });

  useEffect(() => {
    const loadSettings = async () => {
      const remote = await fetchSettings();
      setSettings(mergeSettings(remote));
    };
    loadSettings();
  }, []);

  const summaryCacheKey = 'phonesSummary:v1';
  const cachedSummary = readCache<SummaryPhone[]>(summaryCacheKey);
  const fetchSummary = async () => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/summary`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
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
  const phones: SummaryPhone[] = data || [];

  const categories = useMemo(() => {
    const fromSettings = settings.categories || [];
    const fromData = Array.from(new Set(phones.map(phone => phone.category).filter(Boolean))) as string[];
    const merged = Array.from(new Set([...fromSettings, ...fromData]));
    return merged.length > 0 ? merged : ['Telefon'];
  }, [phones, settings.categories]);

  const brands = useMemo(() => {
    return Array.from(new Set(phones.map(phone => phone.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [phones]);

  const filterFields = settings.filterFields || [];
  const sectionCategories = settings.sectionCategories || {};
  const resolveFilterFields = (category: string) => {
    if (category === 'Tümü') return filterFields;
    return filterFields.filter(field => (sectionCategories[field.sectionId] || []).includes(category));
  };
  const activeFilterFields = useMemo(
    () => resolveFilterFields(selectedCategory),
    [filterFields, sectionCategories, selectedCategory]
  );
  const appliedFilterFields = useMemo(
    () => resolveFilterFields(appliedFilters.selectedCategory),
    [filterFields, sectionCategories, appliedFilters.selectedCategory]
  );
  const parseNumericValue = (value: unknown, label?: string) => {
    if (value === null || value === undefined) return null;
    const raw = String(value);

    const normalizedLabel = (label || '').toLowerCase();
    const pickMaxUnder = (limit: number) => {
      const filtered = values.filter(val => val <= limit);
      if (filtered.length > 0) return Math.max(...filtered);
      return Math.min(...values);
    };

    if (normalizedLabel.includes('ram') || normalizedLabel.includes('bellek')) {
      const unitMatches = Array.from(raw.matchAll(/(\d+(?:[.,]\d+)?)(?:\s*)(GB|MB)/gi));
      if (unitMatches.length > 0) {
        const values = unitMatches
          .map(match => {
            const num = Number(match[1].replace(',', '.'));
            if (!Number.isFinite(num)) return null;
            const unit = match[2]?.toUpperCase();
            return unit === 'MB' ? num / 1024 : num;
          })
          .filter((num): num is number => num !== null);
        if (values.length > 0) {
          const filtered = values.filter(val => val <= 128);
          return filtered.length > 0 ? Math.max(...filtered) : Math.min(...values);
        }
      }
      const matches = raw.match(/\d+(?:[.,]\d+)?/g);
      if (!matches || matches.length === 0) return null;
      const values = matches
        .map(item => Number(item.replace(',', '.')))
        .filter(num => Number.isFinite(num));
      if (values.length === 0) return null;
      return pickMaxUnder(128);
    }

    const matches = raw.match(/\d+(?:[.,]\d+)?/g);
    if (!matches || matches.length === 0) return null;
    const values = matches
      .map(item => Number(item.replace(',', '.')))
      .filter(num => Number.isFinite(num));
    if (values.length === 0) return null;
    if (normalizedLabel.includes('depolama')) {
      return pickMaxUnder(4096);
    }
    if (normalizedLabel.includes('ekran boyutu')) {
      return values[0];
    }
    if (normalizedLabel.includes('batarya')) {
      return pickMaxUnder(20000);
    }
    if (normalizedLabel.includes('kamera')) {
      return pickMaxUnder(300);
    }
    if (normalizedLabel.includes('cpu') || normalizedLabel.includes('işlemci') || normalizedLabel.includes('cekirdek')) {
      return pickMaxUnder(32);
    }
    if (normalizedLabel.includes('antutu')) {
      return Math.max(...values);
    }
    return values[0];
  };

  const numericStats = useMemo(() => {
    const stats: Record<string, { min: number; max: number }> = {};
    activeFilterFields.forEach(field => {
      const mode = field.filterType || (field.type === 'checkbox' ? 'boolean' : 'text');
      if (mode !== 'range') return;
      const key = `${field.sectionId}:${field.fieldKey}`;
      const values = phones
        .map(phone => parseNumericValue(phone.filters?.[key], field.label))
        .filter((value): value is number => value !== null);
      if (values.length === 0) return;
      stats[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });
    return stats;
  }, [phones, activeFilterFields]);

  const appliedNumericStats = useMemo(() => {
    const stats: Record<string, { min: number; max: number }> = {};
    appliedFilterFields.forEach(field => {
      const mode = field.filterType || (field.type === 'checkbox' ? 'boolean' : 'text');
      if (mode !== 'range') return;
      const key = `${field.sectionId}:${field.fieldKey}`;
      const values = phones
        .map(phone => parseNumericValue(phone.filters?.[key], field.label))
        .filter((value): value is number => value !== null);
      if (values.length === 0) return;
      stats[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });
    return stats;
  }, [phones, appliedFilterFields]);

  useEffect(() => {
    setRangeFilters(prev => {
      const next = { ...prev };
      Object.entries(numericStats).forEach(([key, range]) => {
        if (!next[key]) {
          next[key] = { min: String(range.min), max: String(range.max) };
        }
      });
      return next;
    });
  }, [numericStats]);

  const updateFieldFilter = (key: string, value: string) => {
    setFieldFilters(prev => ({ ...prev, [key]: value }));
  };

  const normalizeBool = (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (['var', 'true', 'evet', 'yes'].includes(lower)) return true;
      if (['yok', 'false', 'hayir', 'no'].includes(lower)) return false;
    }
    return null;
  };

  const filtered = useMemo(() => {
    if (!applied) return [];
    const query = normalize(appliedFilters.search);
    const min = parsePrice(appliedFilters.minPrice);
    const max = parsePrice(appliedFilters.maxPrice);
    return phones
      .filter(phone => {
        if (appliedFilters.selectedCategory !== 'Tümü' && normalize(phone.category) !== normalize(appliedFilters.selectedCategory)) {
          return false;
        }
        if (appliedFilters.selectedBrand !== 'Tümü' && normalize(phone.brand) !== normalize(appliedFilters.selectedBrand)) {
          return false;
        }
        if (query) {
          const text = `${phone.brand || ''} ${phone.title || ''}`.toLowerCase();
          if (!text.includes(query)) return false;
        }
        const priceValue = parsePrice(phone.price);
        if (min !== null && priceValue !== null && priceValue < min) return false;
        if (max !== null && priceValue !== null && priceValue > max) return false;
        if (min !== null && priceValue === null) return false;
        if (max !== null && priceValue === null) return false;
        for (const field of appliedFilterFields) {
          const key = `${field.sectionId}:${field.fieldKey}`;
          const filterMode = field.filterType || (field.type === 'checkbox' ? 'boolean' : 'text');
          if (filterMode === 'range') {
            const range = appliedFilters.rangeFilters[key];
            const stats = appliedNumericStats[key];
            if (!range || !stats) continue;
            const minValue = range.min === '' ? stats.min : Number(range.min);
            const maxValue = range.max === '' ? stats.max : Number(range.max);
            const value = parseNumericValue(phone.filters?.[key], field.label);
            if (value === null) return false;
            if (value < minValue || value > maxValue) return false;
            continue;
          }
          const filterValue = appliedFilters.fieldFilters[key];
          if (!filterValue || filterValue === 'all') continue;
          const raw = phone.filters?.[key];
          if (filterMode === 'boolean') {
            const boolValue = normalizeBool(raw);
            if (filterValue === 'true' && boolValue !== true) return false;
            if (filterValue === 'false' && boolValue !== false) return false;
            continue;
          }
          const normalized = normalize(String(raw ?? ''));
          if (!normalized || !normalized.includes(normalize(filterValue))) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (appliedFilters.sortBy === 'priceAsc') {
          return (parsePrice(a.price) ?? 0) - (parsePrice(b.price) ?? 0);
        }
        if (appliedFilters.sortBy === 'priceDesc') {
          return (parsePrice(b.price) ?? 0) - (parsePrice(a.price) ?? 0);
        }
        if (appliedFilters.sortBy === 'name') {
          return `${a.brand} ${a.title}`.localeCompare(`${b.brand} ${b.title}`);
        }
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateB - dateA;
      });
  }, [phones, applied, appliedFilters, appliedFilterFields, appliedNumericStats]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('Tümü');
    setSelectedBrand('Tümü');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('latest');
    setFieldFilters({});
    setRangeFilters(Object.fromEntries(
      Object.entries(numericStats).map(([key, range]) => [
        key,
        { min: String(range.min), max: String(range.max) },
      ])
    ));
    setApplied(false);
    setAppliedFilters({
      search: '',
      selectedCategory: 'Tümü',
      selectedBrand: 'Tümü',
      minPrice: '',
      maxPrice: '',
      sortBy: 'latest',
      fieldFilters: {},
      rangeFilters: Object.fromEntries(
        Object.entries(numericStats).map(([key, range]) => [
          key,
          { min: String(range.min), max: String(range.max) },
        ])
      ),
    });
  };

  const applyFilters = () => {
    setApplied(true);
    setAppliedFilters({
      search,
      selectedCategory,
      selectedBrand,
      minPrice,
      maxPrice,
      sortBy,
      fieldFilters: { ...fieldFilters },
      rangeFilters: { ...rangeFilters },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-10 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl">Filtreleme</h1>
              <p className="text-sm text-muted-foreground">
                Cihazları kategori, marka ve fiyat aralığına göre filtreleyin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 overflow-hidden">
            <Card className="p-5 bg-white/5 backdrop-blur-xl border-white/10 h-fit">
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Arama</label>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Marka veya model"
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Kategori</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tümü">Tümü</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Marka</label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Marka seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tümü">Tümü</SelectItem>
                      {brands.map(brand => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Fiyat Aralığı</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      inputMode="numeric"
                    />
                    <Input
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Sıralama</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sıralama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">En Yeni</SelectItem>
                      <SelectItem value="priceAsc">Fiyat (Artan)</SelectItem>
                      <SelectItem value="priceDesc">Fiyat (Azalan)</SelectItem>
                      <SelectItem value="name">İsim (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeFilterFields.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Teknik Filtreler
                    </div>
                    {activeFilterFields.map((field) => {
                      const key = `${field.sectionId}:${field.fieldKey}`;
                      const label = field.label;
                      const filterMode = field.filterType || (field.type === 'checkbox' ? 'boolean' : 'text');
                      if (filterMode === 'boolean') {
                        return (
                          <div key={key}>
                            <label className="text-xs text-muted-foreground">{label}</label>
                            <Select
                              value={fieldFilters[key] || 'all'}
                              onValueChange={(value: string) => updateFieldFilter(key, value)}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Tümü" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tümü</SelectItem>
                                <SelectItem value="true">Var</SelectItem>
                                <SelectItem value="false">Yok</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      if (filterMode === 'range') {
                        const range = numericStats[key];
                        if (!range) {
                          return (
                            <div key={key} className="text-xs text-muted-foreground">
                              {label} verisi bulunamadı.
                            </div>
                          );
                        }
                        const current = rangeFilters[key] || { min: String(range.min), max: String(range.max) };
                        const step = Math.max(0.1, (range.max - range.min) / 200);
                        const minValue = clamp(
                          Math.min(Number(current.min || range.min), Number(current.max || range.max)),
                          range.min,
                          range.max
                        );
                        const maxValue = clamp(
                          Math.max(Number(current.max || range.max), Number(current.min || range.min)),
                          range.min,
                          range.max
                        );
                        const unit = getUnitLabel(label);
                        const unitHint = unit ? ` (${unit})` : '';
                        return (
                          <div key={key} className="space-y-3">
                            <label className="text-xs text-muted-foreground">{label}{unitHint}</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={current.min}
                                onChange={(e) =>
                                  setRangeFilters(prev => ({
                                    ...prev,
                                    [key]: { ...current, min: e.target.value },
                                  }))
                                }
                                inputMode="decimal"
                                placeholder={`${range.min}${unit ? ` ${unit}` : ''}`}
                              />
                              <Input
                                value={current.max}
                                onChange={(e) =>
                                  setRangeFilters(prev => ({
                                    ...prev,
                                    [key]: { ...current, max: e.target.value },
                                  }))
                                }
                                inputMode="decimal"
                                placeholder={`${range.max}${unit ? ` ${unit}` : ''}`}
                              />
                            </div>
                            <DualRangeSlider
                              min={range.min}
                              max={range.max}
                              step={step}
                              value={[minValue, maxValue]}
                              unit={unit}
                              showLabels={false}
                              onValueChange={(next: [number, number]) =>
                                setRangeFilters(prev => ({
                                  ...prev,
                                  [key]: { min: String(next[0]), max: String(next[1]) },
                                }))
                              }
                            />
                          </div>
                        );
                      }
                      return (
                        <div key={key}>
                          <label className="text-xs text-muted-foreground">{label}</label>
                          <Input
                            className="mt-2"
                            value={fieldFilters[key] || ''}
                            onChange={(e) => updateFieldFilter(key, e.target.value)}
                            placeholder="Ara..."
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button className="w-full" onClick={applyFilters}>
                  Filtrele
                </Button>

                <Button variant="outline" className="w-full" onClick={resetFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Filtreleri Sıfırla
                </Button>
              </div>
            </Card>

            <div className="space-y-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {applied ? `${filtered.length} sonuç bulundu` : 'Filtreleri seçip "Filtrele"ye basın.'}
                </div>
                {selectedCategory !== 'Tümü' && (
                  <Badge variant="outline" className="text-xs">
                    {selectedCategory}
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : error ? (
                <Card className="p-6 bg-white/5 border-white/10">
                  <p className="text-sm text-muted-foreground">Liste yüklenirken hata oluştu.</p>
                </Card>
              ) : !applied ? (
                <Card className="p-10 bg-white/5 border-white/10 text-center">
                  <p className="text-sm text-muted-foreground">Filtreleri seçip sonuçları getir.</p>
                </Card>
              ) : filtered.length === 0 ? (
                <Card className="p-10 bg-white/5 border-white/10 text-center">
                  <p className="text-sm text-muted-foreground">Sonuç bulunamadı.</p>
                </Card>
              ) : (
                <Card className="bg-white/5 border-white/10 overflow-hidden max-w-full p-6">
                  <div className="overflow-x-auto px-2">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Görsel</TableHead>
                          <TableHead>Marka</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Fiyat</TableHead>
                          {appliedFilterFields.map(field => (
                            <TableHead key={`${field.sectionId}:${field.fieldKey}`}>{field.label}</TableHead>
                          ))}
                          <TableHead className="text-right">Detay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(phone => (
                          <TableRow
                            key={phone.id}
                            className="cursor-pointer hover:bg-white/5"
                            onClick={() => navigate(`/phone/${buildPhoneSlug(phone)}`)}
                          >
                            <TableCell>
                              <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                                <ImageWithFallback
                                  src={phone.images?.[0]?.src || ''}
                                  alt={phone.title}
                                  className="h-10 w-10 object-contain"
                                  unsplashQuery="electronics"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {phone.brand}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{phone.title}</TableCell>
                            <TableCell>{phone.category || '—'}</TableCell>
                            <TableCell>{phone.price || '—'}</TableCell>
                            {appliedFilterFields.map(field => {
                              const key = `${field.sectionId}:${field.fieldKey}`;
                              const value = phone.filters?.[key];
                              const formatted = formatFilterValue(value, field.label, field.type);
                              return <TableCell key={key}>{formatted}</TableCell>;
                            })}
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="group-hover:bg-white/5">
                                Detaylar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
