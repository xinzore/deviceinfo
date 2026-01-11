import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Loader2, Upload, Plus, X } from 'lucide-react';
import { getCurrentUser, getAccessToken } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { SectionConfig } from '../utils/specConfig';
import { fetchSettings, getFormSections, mergeSettings, AdminSettings } from '../utils/adminSettings';
import { buildPhoneSpecs } from '../utils/buildPhoneSpecs';

export default function SubmitPhonePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<AdminSettings>(mergeSettings());

  // Basic Info
  const [brand, setBrand] = useState('');
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [tagline, setTagline] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<{ src: string; alt: string; color: string }[]>([
    { src: '', alt: '', color: '' }
  ]);

  const buildSectionValues = (
    sections: SectionConfig[],
    previous: Record<string, Record<string, string | boolean>> = {}
  ) => {
    const next: Record<string, Record<string, string | boolean>> = { ...previous };
    for (const section of sections) {
      if (!next[section.id]) next[section.id] = {};
      for (const field of section.fields) {
        if (next[section.id][field.key] === undefined) {
          next[section.id][field.key] = field.type === 'checkbox' ? false : '';
        }
      }
    }
    return next;
  };

  const sections = useMemo(() => getFormSections(settings, category), [settings, category]);

  const [sectionValues, setSectionValues] = useState<Record<string, Record<string, string | boolean>>>(
    () => buildSectionValues(sections)
  );

  const updateField = (sectionId: string, fieldKey: string, value: string | boolean) => {
    setSectionValues(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldKey]: value,
      },
    }));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const remote = await fetchSettings();
      setSettings(mergeSettings(remote));
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!category && (settings.categories || []).length > 0) {
      setCategory(settings.categories?.[0] || '');
    }
  }, [category, settings.categories]);

  useEffect(() => {
    setSectionValues(prev => buildSectionValues(sections, prev));
  }, [sections]);

  const checkAuth = async () => {
    const session = await getCurrentUser();
    if (!session) {
      toast.error('İçerik eklemek için giriş yapmalısınız');
      navigate('/login');
      return;
    }
    setUser(session.user);

    // Check if admin
    const token = await getAccessToken();
    if (token) {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
      }
    }
  };

  const addImageField = () => {
    setImages([...images, { src: '', alt: '', color: '' }]);
  };

  const removeImageField = (index: number) => {
    if (images.length > 1) {
      setImages(images.filter((_, i) => i !== index));
    }
  };

  const updateImage = (index: number, field: 'src' | 'alt' | 'color', value: string) => {
    const newImages = [...images];
    newImages[index][field] = value;
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Oturum süresi doldu, lütfen tekrar giriş yapın');
        navigate('/login');
        return;
      }

      if (!category) {
        toast.error('Lütfen kategori seçin');
        setLoading(false);
        return;
      }

      const validImages = images.filter(img => img.src.trim() !== '');
      if (validImages.length === 0) {
        toast.error('En az bir resim URL\'si girmelisiniz');
        setLoading(false);
        return;
      }

      const specs = buildPhoneSpecs(sectionValues, sections);
      const phoneData = {
        brand,
        title,
        shortDesc,
        tagline,
        price,
        category,
        images: validImages,
        specs,
        // If admin, auto-approve
        ...(profile?.role === 'admin' && { autoApprove: true })
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(phoneData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      if (profile?.role === 'admin') {
        toast.success('Telefon başarıyla eklendi ve yayınlandı!');
      } else {
        toast.success('Telefon başarıyla eklendi! Admin onayından sonra yayınlanacak.');
      }
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Telefon eklenirken hata oluştu');
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">Yeni Telefon Ekle</h1>
          <p className="text-muted-foreground">
            Detaylı telefon özelliklerini girin. {profile?.role === 'admin' ? 'Admin olarak direkt yayınlanır.' : 'İçerik admin onayından sonra yayınlanacaktır.'}
          </p>
        </div>

        <Card className="p-6 md:p-8 bg-white/5 backdrop-blur-xl border-white/10">
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <div className="w-full max-w-full mb-8 flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden">
                <TabsList className="contents !bg-transparent !p-0 !rounded-none !h-auto">
                  <TabsTrigger
                    value="basic"
                    className="flex-none shrink-0 rounded-full border border-black/10 bg-transparent px-4 py-2 text-xs whitespace-nowrap text-center transition-colors hover:bg-black/5 data-[state=active]:border-[#deb887] data-[state=active]:text-black data-[state=active]:!bg-[#deb887] dark:border-white/10 dark:hover:bg-white/10 sm:text-sm"
                  >
                    Temel
                  </TabsTrigger>
                  {sections.map(section => (
                    <TabsTrigger
                      key={section.id}
                      value={section.id}
                      className="flex-none shrink-0 rounded-full border border-black/10 bg-transparent px-4 py-2 text-xs whitespace-nowrap text-center transition-colors hover:bg-black/5 data-[state=active]:border-[#deb887] data-[state=active]:text-black data-[state=active]:!bg-[#deb887] dark:border-white/10 dark:hover:bg-white/10 sm:text-sm"
                    >
                      {section.tabLabel}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* BASIC INFO */}
              <TabsContent value="basic" className="space-y-4">
                <h3 className="text-xl mb-4">Temel Bilgiler</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marka *</Label>
                    <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Model *</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortDesc">Kısa Açıklama *</Label>
                  <Textarea id="shortDesc" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} disabled={loading} rows={2} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Slogan</Label>
                    <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Fiyat *</Label>
                    <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} required disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={category} onValueChange={setCategory} disabled={loading}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {(settings.categories || []).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Resimler *</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addImageField} disabled={loading}>
                      <Plus className="mr-2 w-4 h-4" />Resim Ekle
                    </Button>
                  </div>

                  {images.map((image, index) => (
                    <Card key={index} className="p-4 bg-white/5 border-white/10">
                      <div className="flex gap-4">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input placeholder="URL" value={image.src} onChange={(e) => updateImage(index, 'src', e.target.value)} required={index === 0} disabled={loading} />
                          <Input placeholder="Alt" value={image.alt} onChange={(e) => updateImage(index, 'alt', e.target.value)} disabled={loading} />
                          <Input placeholder="Renk" value={image.color} onChange={(e) => updateImage(index, 'color', e.target.value)} disabled={loading} />
                        </div>
                        {images.length > 1 && (
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeImageField(index)} disabled={loading}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {sections.map(section => (
                <TabsContent key={section.id} value={section.id} className="space-y-4">
                  <h3 className="text-xl mb-4">{section.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map(field => {
                      const id = `${section.id}-${field.key}`;
                      const value = sectionValues?.[section.id]?.[field.key];

                      if (field.type === 'checkbox') {
                        const checked = Boolean(value);
                        return (
                          <div key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={(next) => updateField(section.id, field.key, next === true)}
                              disabled={loading}
                            />
                            <Label htmlFor={id} className="cursor-pointer">
                              {field.label}
                            </Label>
                          </div>
                        );
                      }

                      const commonProps = {
                        id,
                        value: (value as string) || '',
                        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                          updateField(section.id, field.key, e.target.value),
                        disabled: loading,
                      };

                      const isTextarea = field.type === 'textarea';
                      return (
                        <div key={id} className={`${isTextarea ? 'md:col-span-2 ' : ''}space-y-2`}>
                          <Label htmlFor={id}>{field.label}</Label>
                          {isTextarea ? (
                            <Textarea {...commonProps} rows={3} />
                          ) : (
                            <Input {...commonProps} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Submit */}
            <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/')} disabled={loading}>
                İptal
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Gönderiliyor...</>
                ) : (
                  <><Upload className="mr-2 w-4 h-4" />Gönder</>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
