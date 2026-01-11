import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PhoneCarousel } from '../components/PhoneCarousel';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Sheet, SheetContent } from '../components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import {
  BadgeCheck,
  Battery,
  Camera,
  Cpu,
  Fingerprint,
  HardDrive,
  Monitor,
  Radio,
  Ruler,
  Shield,
  Signal,
  Usb,
  Wifi,
  Calendar,
  Smartphone,
  Speaker,
  Loader2,
  icons,
  X,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getAccessToken } from '../utils/supabase/client';
import { SectionConfig } from '../utils/specConfig';
import { fetchSettings, getCardSections, mergeSettings, AdminSettings } from '../utils/adminSettings';
import { buildPhoneSlug } from '../utils/phoneSlug';
import { readCache, writeCache } from '../utils/localCache';
import { toast } from 'sonner@2.0.3';



const SECTION_META: Record<
  string,
  { icon: any; bg: string; hex: string; label: string }
> = {
  ekran: { icon: Monitor, bg: 'bg-purple-500', hex: '#a855f7', label: 'Ekran Boyutu' },
  batarya: { icon: Battery, bg: 'bg-green-500', hex: '#22c55e', label: 'Batarya Bilgisi' },
  kamera: { icon: Camera, bg: 'bg-orange-500', hex: '#f97316', label: 'Kameralar' },
  temelDonanim: { icon: Cpu, bg: 'bg-blue-500', hex: '#3b82f6', label: 'Yonga Seti/CPU' },
  ramDepolama: { icon: HardDrive, bg: 'bg-pink-500', hex: '#ec4899', label: 'Ram/Depolama' },
  tasarim: { icon: Ruler, bg: 'bg-amber-500', hex: '#f59e0b', label: 'Tasarım/Renkler' },
  agBaglantilari: { icon: Signal, bg: 'bg-cyan-500', hex: '#06b6d4', label: '5G Desteği' },
  isletimSistemi: { icon: Smartphone, bg: 'bg-indigo-500', hex: '#6366f1', label: 'İşletim Sistemi' },
  kablosuzBaglantilar: { icon: Wifi, bg: 'bg-sky-500', hex: '#0ea5e9', label: 'Kablosuz Ağlar' },
  cokluOrtam: { icon: Speaker, bg: 'bg-emerald-500', hex: '#10b981', label: 'Çoklu Ortamlar' },
  dayaniklilik: { icon: Shield, bg: 'bg-lime-500', hex: '#84cc16', label: 'Dayanıklılık' },
  sensorServis: { icon: Fingerprint, bg: 'bg-rose-500', hex: '#f43f5e', label: 'Sensörler/Apps' },
  digerBaglantilar: { icon: Usb, bg: 'bg-zinc-500', hex: '#71717a', label: 'Bağlantılar/Sim' },
  abEtiket: { icon: BadgeCheck, bg: 'bg-teal-500', hex: '#14b8a6', label: 'AB Etiketi/Direnç' },
  temelBilgiler: { icon: Calendar, bg: 'bg-slate-500', hex: '#64748b', label: 'Temel Bilgiler' },
};

export default function PhoneDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [settings, setSettings] = useState<AdminSettings>(mergeSettings());
  const [compareSelection, setCompareSelection] = useState<{ slug: string; label: string } | null>(null);
  const [comments, setComments] = useState<Array<{
    id: string;
    userId: string;
    name?: string;
    message: string;
    createdAt: string;
  }>>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentDeleteId, setCommentDeleteId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingValue, setRatingValue] = useState(80);
  const [ratingSending, setRatingSending] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const compareStorageKey = 'compareSelection';
  const specCardSize = { width: 180, height: 46 };
  const phoneCacheKey = slug ? `phone-detail:${slug}` : '';
  const cachedPhone = slug ? readCache<any>(phoneCacheKey) : null;

  const sections = getCardSections(settings, phone?.category);

  const fetchPhoneById = async (phoneId: string) => {
    const cacheKey = `phone-detail:${phoneId}`;
    const cached = readCache<any>(cacheKey);
    if (cached) return cached;
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${phoneId}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      writeCache(cacheKey, data, 30 * 60 * 1000);
      return data;
    }
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    throw new Error(errorText || 'Phone fetch failed');
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

    if (response.ok) {
      const data = await response.json();
      writeCache(cacheKey, data, 30 * 60 * 1000);
      return data;
    }
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    throw new Error(errorText || 'Phone fetch failed');
  };

  const { data, error, isLoading } = useSWR(
    slug ? ['phone', slug] : null,
    async () => {
      if (!slug) return null;
      const fromSlug = await fetchPhoneBySlug(slug);
      if (fromSlug) return fromSlug;
      return fetchPhoneById(slug);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      fallbackData: cachedPhone ?? undefined,
      onSuccess: (value) => {
        if (!slug || !value) return;
        writeCache(`phone-detail:${slug}`, value, 30 * 60 * 1000);
        const builtSlug = buildPhoneSlug(value);
        if (builtSlug && builtSlug !== slug) {
          writeCache(`phone-detail:${builtSlug}`, value, 30 * 60 * 1000);
        }
      },
    }
  );

  useEffect(() => {
    if (data) {
      setPhone(data);
    } else if (data === null && slug) {
      navigate('/');
    }
  }, [data, navigate, slug]);

  useEffect(() => {
    if (error) {
      console.error('Error resolving phone slug:', error);
      navigate('/');
    }
  }, [error, navigate]);

  useEffect(() => {
    const loadSettings = async () => {
      const remote = await fetchSettings();
      setSettings(mergeSettings(remote));
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadComments = async () => {
      if (!phone?.id) return;
      setCommentsLoading(true);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${phone.id}/comments`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        setComments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Comments fetch error:', error);
      } finally {
        setCommentsLoading(false);
      }
    };
    loadComments();
  }, [phone?.id]);

  useEffect(() => {
    const loadRatings = async () => {
      if (!phone?.id) return;
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${phone.id}/ratings`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data = await response.json();
        setRatingAverage(Number(data?.average || 0));
        setRatingCount(Number(data?.count || 0));
      } catch (error) {
        console.error('Ratings fetch error:', error);
      }
    };
    loadRatings();
  }, [phone?.id]);

  useEffect(() => {
    const resolveAdmin = async () => {
      try {
        const token = await getAccessToken();
        setIsLoggedIn(!!token);
        if (!token) {
          setIsAdmin(false);
          setUserRating(null);
          return;
        }
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          setIsAdmin(false);
          return;
        }
        const profile = await response.json();
        setIsAdmin(profile?.role === 'admin');

        if (phone?.id) {
          const ratingResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${phone.id}/ratings/me`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );
          if (ratingResponse.ok) {
            const ratingData = await ratingResponse.json();
            if (ratingData?.score !== null && ratingData?.score !== undefined) {
              setUserRating(Number(ratingData.score));
            }
          }
        }
      } catch (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
      }
    };
    resolveAdmin();
  }, [phone?.id]);

  const getRatingMood = (average: number) => {
    if (average >= 85) return { emoji: '🔥', label: 'Havalı' };
    if (average >= 70) return { emoji: '😎', label: 'İyi' };
    if (average >= 50) return { emoji: '🙂', label: 'Orta' };
    return { emoji: '😕', label: 'Zayıf' };
  };

  const handleSubmitComment = async () => {
    const message = commentDraft.trim();
    if (!message) {
      toast.error('Yorum boş olamaz');
      return;
    }
    if (message.length > 500) {
      toast.error('Yorum 500 karakteri geçemez');
      return;
    }

    try {
      setCommentSending(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Yorum yapmak için giriş yapın');
        navigate('/login');
        return;
      }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${phone.id}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      if (data?.comment) {
        setComments(prev => [data.comment, ...prev]);
      }
      setCommentDraft('');
      toast.success('Yorum eklendi');
    } catch (error: any) {
      toast.error(error.message || 'Yorum eklenemedi');
    } finally {
      setCommentSending(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!phone?.id) return;
    const score = Math.min(100, Math.max(0, Math.round(ratingValue)));
    try {
      setRatingSending(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Puan vermek için giriş yapın');
        navigate('/login');
        return;
      }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${phone.id}/ratings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ score }),
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setRatingAverage(Number(data?.average || 0));
      setRatingCount(Number(data?.count || 0));
      setUserRating(score);
      toast.success('Puanın kaydedildi');
    } catch (error: any) {
      const message = String(error.message || '');
      if (message.includes('Already rated')) {
        toast.error('Bu cihazı zaten puanladın');
        setUserRating(score);
      } else {
        toast.error(error.message || 'Puan kaydedilemedi');
      }
    } finally {
      setRatingSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!phone?.id) return;
    if (!window.confirm('Bu yorumu silmek istiyor musunuz?')) return;
    setCommentDeleteId(commentId);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Yetki bulunamadı');
        return;
      }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/phones/${phone.id}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success('Yorum silindi');
    } catch (error: any) {
      toast.error(error.message || 'Yorum silinemedi');
    } finally {
      setCommentDeleteId(null);
    }
  };

  useEffect(() => {
    if (!phone) return;

    // Check all marquee containers for overflow
    const checkOverflow = () => {
      const containers = document.querySelectorAll('.marquee-container');
      containers.forEach(container => {
        const span = container.querySelector('.marquee-text') as HTMLElement;
        if (span && container) {
          // Temporarily position absolutely to escape container constraints
          const originalPosition = span.style.position;
          const originalWidth = span.style.width;
          const originalLeft = span.style.left;

          span.style.position = 'absolute';
          span.style.width = 'max-content';
          span.style.left = '-9999px';

          // Measure true width
          const containerWidth = container.clientWidth;
          const spanWidth = span.offsetWidth;
          const isOverflowing = spanWidth > containerWidth;

          // Restore styles
          span.style.position = originalPosition;
          span.style.width = originalWidth;
          span.style.left = originalLeft;

          if (isOverflowing) {
            // Calculate exact distance to show end of text
            const distance = containerWidth - spanWidth;
            (container as HTMLElement).style.setProperty('--marquee-distance', `${distance}px`);

            // Calculate duration based on distance to ensure consistent speed (approx 20px/s)
            // Travel distance is abs(distance). 
            // Movement happens in 25% + 25% = 50% of the timeline.
            // So total duration = (distance * 2 / speed) / 0.5 = distance * 4 / speed
            // Let's use a simpler multiplier: distance needs to be travelled in roughly X seconds.
            // abs(distance) / 15px/s = movement time. Max with 6s minimum.
            const absDist = Math.abs(distance);
            const duration = Math.max(absDist / 10, 6);
            (container as HTMLElement).style.setProperty('--marquee-duration', `${duration}s`);

            container.classList.add('overflow');
          } else {
            (container as HTMLElement).style.removeProperty('--marquee-distance');
            container.classList.remove('overflow');
          }
        }
      });
    };

    // Check after a small delay to ensure DOM is ready
    setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);

    if ('fonts' in document) {
      document.fonts.ready.then(checkOverflow);
    }

    return () => window.removeEventListener('resize', checkOverflow);
  }, [phone]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(compareStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.slug) {
        setCompareSelection(parsed);
      } else {
        localStorage.removeItem(compareStorageKey);
      }
    } catch {
      localStorage.removeItem(compareStorageKey);
    }
  }, []);




  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Var' : 'Yok';
    return String(value);
  };

  const resolveIconByName = (name?: string) => {
    if (!name) return undefined;
    const exact = (icons as any)[name];
    if (exact) return exact;
    const normalized = name
      .replace(/[-_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    const pascal = (icons as any)[normalized];
    if (pascal) return pascal;
    const lower = name.toLowerCase();
    const matchKey = Object.keys(icons).find(key => key.toLowerCase() === lower);
    return matchKey ? (icons as any)[matchKey] : undefined;
  };

  const renderSectionCard = (
    cardKey: string,
    sectionId: string,
    title: string,
    primaryValue: string,
    secondaryValue?: string
  ) => {
    const configuredSection = settings.customSections?.find(section => section.id === sectionId);
    const customIconName = configuredSection?.iconName;
    const customHex = configuredSection?.iconHex;
    const customIcon = resolveIconByName(customIconName);
    const meta = SECTION_META[sectionId] || { icon: Cpu, bg: 'bg-blue-500', hex: '#3b82f6', label: title };
    const Icon = meta.icon;
    const FinalIcon = customIcon || Icon;
    const hex = customHex || meta.hex;

    return (
      <Card
        key={cardKey}
        className="relative cursor-pointer bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group h-full w-full p-2.5 md:p-3 min-w-0 overflow-hidden"
        style={{ backdropFilter: 'blur(20px)', padding: '5px' }}
        onClick={() => setSelectedSection({ sectionId, title, primaryValue, secondaryValue })}
      >
        <div className="flex h-full items-start gap-3">
          <div
            className={`${meta.bg} h-8 w-8 flex items-center justify-center rounded-md flex-shrink-0`}
            style={{ backgroundColor: hex }}
          >
            <FinalIcon className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="marquee-container text-xs tracking-[0.18em] text-muted-foreground mb-1 cursor-help">
                  <span className="marquee-text">{title}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{title}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="marquee-container text-xs font-medium leading-tight group-hover:text-foreground transition-colors cursor-help">
                  <span className="marquee-text">{primaryValue}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{primaryValue}</p>
              </TooltipContent>
            </Tooltip>

            {secondaryValue && (
              <p className="text-xs text-muted-foreground leading-tight line-clamp-2 break-words">{secondaryValue}</p>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const getSectionPrimaryValue = (sectionId: string, fieldKey?: string) => {
    if (fieldKey) {
      const fromSections = phone?.specs?.sections?.[sectionId]?.[fieldKey];
      const formatted = formatValue(fromSections);
      if (formatted) return formatted;
    }

    // Backward-compat fallback for older phones without `specs.sections`
    switch (sectionId) {
      case 'ekran':
        return phone?.specs?.display?.size || phone?.specs?.display?.type || '';
      case 'batarya':
        return phone?.specs?.battery?.type || '';
      case 'kamera':
        return phone?.specs?.mainCamera?.triple || '';
      case 'temelDonanim':
        return phone?.specs?.platform?.chipset || '';
      case 'ramDepolama':
        return phone?.specs?.memory?.internal || '';
      case 'kablosuzBaglantilar':
        return phone?.specs?.comms?.wlan || '';
      case 'digerBaglantilar':
        return phone?.specs?.comms?.usb || '';
      case 'temelBilgiler':
        return phone?.specs?.network?.announced || '';
      default:
        return '';
    }
  };

  const getSectionCardFields = (section: SectionConfig) => {
    const configured = settings.cardFields?.[section.id];
    if (configured && configured.length > 0) {
      const set = new Set(configured);
      return section.fields.filter(field => set.has(field.key));
    }
    const defaults = section.fields.filter(field => field.isCard);
    if (defaults.length > 0) return defaults;
    return section.fields.slice(0, 1);
  };

  const renderDetailRows = (items: { label: string; value?: string; multiline?: boolean }[]) => {
    const validItems = items.filter(item => item.value);
    if (validItems.length === 0) {
      return (
        <div className="rounded-xl border border-border bg-black/5 px-4 py-3 text-sm text-muted-foreground dark:bg-white/5">
          Bu kategori için detay bulunamadı.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {validItems.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-black/5 px-4 py-3 dark:bg-white/5"
          >
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</span>
            <span className={`text-sm text-right leading-relaxed ${item.multiline ? 'whitespace-pre-line' : ''}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderSectionDetails = () => {
    if (!selectedSection || !phone?.specs) return null;
    const sectionId = selectedSection.sectionId as string;
    const sectionCfg = sections.find(s => s.id === sectionId);
    if (!sectionCfg) return null;

    const sectionValues = phone?.specs?.sections?.[sectionId] || {};

    const items = sectionCfg.fields.map(field => {
      const raw = sectionValues?.[field.key];
      const value = formatValue(raw);
      const multiline = field.type === 'textarea';
      return { label: field.label, value, multiline };
    });

    return renderDetailRows(items);
  };

  const handleCompareClick = () => {
    if (!phone) return;
    const currentSlug = buildPhoneSlug(phone);
    if (!currentSlug) return;
    const currentLabel = `${phone.brand ?? ''} ${phone.title ?? ''}`.trim();

    if (!compareSelection) {
      const selection = { slug: currentSlug, label: currentLabel };
      localStorage.setItem(compareStorageKey, JSON.stringify(selection));
      setCompareSelection(selection);
      return;
    }

    if (compareSelection.slug === currentSlug) {
      localStorage.removeItem(compareStorageKey);
      setCompareSelection(null);
      return;
    }

    const firstSlug = compareSelection.slug;
    localStorage.removeItem(compareStorageKey);
    setCompareSelection(null);
    navigate(`/compare/${firstSlug}-vs-${currentSlug}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!phone) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground phone-detail-page">
      <style>
        {`
      .phone-detail-page .flex-col {
        flex-direction: unset !important;
      }
      
      /* Marquee animation for truncated text */
      .marquee-text {
        display: inline-block;
      }
      
      .marquee-container {
        overflow: hidden;
        white-space: nowrap;
        position: relative;
      }
      
      /* Only animate when overflow class is present */
      .marquee-container.overflow .marquee-text {
        animation: marquee-pingpong var(--marquee-duration, 8s) ease-in-out infinite;
      }
      
      .marquee-container.overflow:hover .marquee-text {
        animation-play-state: paused;
      }
      
      @keyframes marquee-pingpong {
        0%, 20% {
          transform: translateX(0);
        }
        45%, 55% {
          transform: translateX(var(--marquee-distance));
        }
        80%, 100% {
          transform: translateX(0);
        }
      }
      `}
      </style>
      <Header />

      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2" style={{ width: 120.42 }}>
            <Badge variant="outline" className="px-4 py-2 gap-2 bg-white/5 backdrop-blur-md border-white/10 w-fit">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              {phone.category || phone.brand || 'SERIES'}
            </Badge>
            <div className="space-y-1">{phone.brand}
              <h1 className="text-3xl md:text-4xl tracking-tight leading-tight font-semibold">{phone.title}</h1>
              <p className="text-muted-foreground text-sm">{phone.tagline || phone.shortDesc}</p>
            </div>
          </div>

          {/* Content Row */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="space-y-4 flex-shrink-0" style={{ width: 120.42 }}>
              <div className="w-[120px]">
                <PhoneCarousel
                  variant="compact"
                  compactSize={{ width: 100, height: 170 }}
                  images={
                    phone.images && phone.images.length > 0
                      ? phone.images
                      : [{ src: '', alt: phone.title, color: 'Default' }]
                  }
                  className="rounded-xl overflow-hidden shadow-lg"
                />
              </div>

              {phone.price && (
                <Card className="px-4 py-3 bg-white/5 backdrop-blur-xl border-white/10 w-fit" style={{ backdropFilter: 'blur(20px)', width: 100.42 }}>
                  <div className="text-xs text-muted-foreground tracking-wider mb-1 font-medium">Fiyatı</div>
                  <div className="text-xs font-semibold text-[#deb887]">{phone.price}</div>

                </Card>
              )}

              <Card className="px-4 py-3 bg-white/5 backdrop-blur-xl border-white/10 w-full min-w-0" style={{ backdropFilter: 'blur(20px)' }}>
                <div className="text-xs text-muted-foreground tracking-wider mb-1 font-medium">Puan</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#deb887]">{ratingAverage || 0}/100</span>
                  <span className="text-lg leading-none">{getRatingMood(ratingAverage).emoji}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{ratingCount} oy</div>
              </Card>

              <div className="space-y-2">
                <Button
                  type="button"
                  className="w-full"
                  variant={compareSelection ? 'secondary' : 'default'}
                  onClick={handleCompareClick}
                >
                  {compareSelection
                    ? (compareSelection.slug === buildPhoneSlug(phone) ? 'Secimi Temizle' : 'Karsilastir')
                    : 'Karsilastir'}
                </Button>
                {compareSelection && compareSelection.slug !== buildPhoneSlug(phone) && (
                  <p className="text-[11px] text-muted-foreground">
                    Secili cihaz: {compareSelection.label}. Bu telefonu da secip karsilastirabilirsin.
                  </p>
                )}
              </div>
            </div>

            <TooltipProvider delayDuration={300}>
              <div
                className="flex-1 grid gap-3 justify-center"
                style={{
                  gridTemplateColumns: `repeat(auto-fit, minmax(${specCardSize.width}px, ${specCardSize.width}px))`,
                  gridAutoRows: `${specCardSize.height}px`,
                }}
              >
                {sections.flatMap(section => {
                  const cardFields = getSectionCardFields(section);
                  return cardFields.map(field => {
                    const primary = getSectionPrimaryValue(section.id, field.key) || 'Bilgi eklenmemiş';
                    return renderSectionCard(`${section.id}:${field.key}`, section.id, field.label, primary);
                  });
                })}
              </div>
            </TooltipProvider>
          </div>

          {isLoggedIn && userRating === null && (
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl">Puan Ver</h2>
                  <p className="text-xs text-muted-foreground">0 - 100 arası puanlayın</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  <span className="text-base leading-none">{getRatingMood(ratingAverage).emoji}</span> {ratingAverage || 0}/100 • {getRatingMood(ratingAverage).label}
                </Badge>
              </div>
              <div className="space-y-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ratingValue}
                  onChange={(e) => setRatingValue(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={ratingValue}
                      onChange={(e) => setRatingValue(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                  <Button onClick={handleSubmitRating} disabled={ratingSending}>
                    {ratingSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Puanı Gönder
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl">Yorumlar</h2>
                <p className="text-xs text-muted-foreground">{comments.length} yorum</p>
              </div>
            </div>

            <div className="space-y-3">
              <Textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Bu cihaz hakkında yorumunu yaz..."
                className="min-h-[120px] bg-white/5 border-white/10"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{commentDraft.length}/500</p>
                <Button onClick={handleSubmitComment} disabled={commentSending}>
                  {commentSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Yorumu Gönder
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {commentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yorumlar yükleniyor...
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz yorum yok. İlk yorumu sen yaz!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{comment.name || 'Kullanıcı'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={commentDeleteId === comment.id}
                          >
                            {commentDeleteId === comment.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <X className="mr-2 h-4 w-4" />
                            )}
                            Sil
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{comment.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <Footer />

      {/* Spec Detail Sheet */}
      <Sheet open={!!selectedSection} onOpenChange={() => setSelectedSection(null)}>
        <SheetContent
          className="w-[92vw] sm:w-[420px] md:w-[480px] bg-white/95 text-foreground backdrop-blur-2xl border border-border pt-6 pb-6 dark:bg-black/95"
          style={{ backdropFilter: 'blur(25px)' }}
        >
          {selectedSection && (
            <div className="flex h-full flex-col overflow-hidden" style={{ padding: 10 }}>
              <div className="flex items-start gap-3 border-b border-border pb-4 px-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${(SECTION_META[selectedSection.sectionId]?.bg || 'bg-blue-500')} text-white`}
                  style={{
                    backgroundColor:
                      (settings.customSections?.find(section => section.id === selectedSection.sectionId)?.iconHex
                        || SECTION_META[selectedSection.sectionId]?.hex
                        || '#3b82f6'),
                    marginLeft: 10,
                  }}
                >
                  {(() => {
                    const configuredSection = settings.customSections?.find(section => section.id === selectedSection.sectionId);
                    const customIconName = configuredSection?.iconName;
                    const customIcon = resolveIconByName(customIconName);
                    const Icon = (customIcon || SECTION_META[selectedSection.sectionId]?.icon || Cpu) as any;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <div className="flex-1">
                  <p className="text-xs tracking-wider text-muted-foreground">{selectedSection.title}</p>
                  <h3 className="text-xl font-semibold leading-tight">{selectedSection.primaryValue || selectedSection.title}</h3>
                  {selectedSection.secondaryValue && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedSection.secondaryValue}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-2 pb-8">
                <div className="px-1">
                  <p className="text-l font-semibold tracking-wider text-muted-foreground mb-2">Detaylı Bilgiler</p>
                  {renderSectionDetails()}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
