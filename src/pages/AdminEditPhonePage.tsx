import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Loader2, Upload, Plus, X, Trash2 } from 'lucide-react';
import { getCurrentUser, getAccessToken } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { SectionConfig } from '../utils/specConfig';
import { fetchSettings, getFormSections, mergeSettings, AdminSettings } from '../utils/adminSettings';
import { buildPhoneSpecs } from '../utils/buildPhoneSpecs';

export default function AdminEditPhonePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<AdminSettings>(mergeSettings());
  const [phoneData, setPhoneData] = useState<any>(null);
  const [comments, setComments] = useState<Array<{
    id: string;
    userId: string;
    name?: string;
    message: string;
    createdAt: string;
  }>>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDeleteId, setCommentDeleteId] = useState<string | null>(null);

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
    const checkAuth = async () => {
      const session = await getCurrentUser();
      if (!session) {
        toast.error('Düzenleme için giriş yapmalısınız');
        navigate('/login');
        return;
      }
      setUser(session.user);

      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        toast.error('Profil bilgisi alınamadı');
        navigate('/');
        return;
      }

      const profileData = await response.json();
      setProfile(profileData);
      if (profileData.role !== 'admin') {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        navigate('/');
        return;
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchPhone = async () => {
      if (!id) return;
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${id}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (!response.ok) {
          toast.error('Telefon bulunamadı');
          navigate('/admin');
          return;
        }

        const data = await response.json();
        setPhoneData(data);
      } catch (error) {
        console.error('Error fetching phone:', error);
        toast.error('Telefon bilgisi alınamadı');
        navigate('/admin');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchPhone();
  }, [id, navigate]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!id) return;
      setCommentsLoading(true);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones/${id}/comments`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
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

    fetchComments();
  }, [id]);

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    if (!window.confirm('Bu yorumu silmek istiyor musunuz?')) return;
    setCommentDeleteId(commentId);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Oturum süresi doldu, lütfen tekrar giriş yapın');
        navigate('/login');
        return;
      }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/phones/${id}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
    if (!phoneData) return;
    setBrand(phoneData.brand || '');
    setTitle(phoneData.title || '');
    setShortDesc(phoneData.shortDesc || '');
    setTagline(phoneData.tagline || '');
    setPrice(phoneData.price || '');
    setCategory(phoneData.category || '');
    setImages(phoneData.images && phoneData.images.length > 0 ? phoneData.images : [{ src: '', alt: '', color: '' }]);
  }, [phoneData]);

  useEffect(() => {
    if (!phoneData) return;
    setSectionValues(buildSectionValues(sections, phoneData.specs?.sections || {}));
  }, [phoneData, sections]);

  useEffect(() => {
    setSectionValues(prev => buildSectionValues(sections, prev));
  }, [sections]);

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
    if (!id) return;
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
      const phonePayload = {
        brand,
        title,
        shortDesc,
        tagline,
        price,
        category,
        images: validImages,
        specs,
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/phones/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(phonePayload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Telefon güncellendi!');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Telefon güncellenirken hata oluştu');
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">Telefonu Düzenle</h1>
          <p className="text-muted-foreground">
            Seçilen telefonun tüm bilgilerini düzenleyin ve kaydedin.
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
                  <TabsTrigger
                    value="comments"
                    className="flex-none shrink-0 rounded-full border border-black/10 bg-transparent px-4 py-2 text-xs whitespace-nowrap text-center transition-colors hover:bg-black/5 data-[state=active]:border-[#deb887] data-[state=active]:text-black data-[state=active]:!bg-[#deb887] dark:border-white/10 dark:hover:bg-white/10 sm:text-sm"
                  >
                    Yorumlar
                  </TabsTrigger>
                </TabsList>
              </div>

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
                      const fieldId = `${section.id}-${field.key}`;
                      const value = sectionValues?.[section.id]?.[field.key];

                      if (field.type === 'checkbox') {
                        const checked = Boolean(value);
                        return (
                          <div key={fieldId} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
                            <Checkbox
                              id={fieldId}
                              checked={checked}
                              onCheckedChange={(next) => updateField(section.id, field.key, next === true)}
                              disabled={loading}
                            />
                            <Label htmlFor={fieldId} className="cursor-pointer">
                              {field.label}
                            </Label>
                          </div>
                        );
                      }

                      const commonProps = {
                        id: fieldId,
                        value: (value as string) || '',
                        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                          updateField(section.id, field.key, e.target.value),
                        disabled: loading,
                      };

                      const isTextarea = field.type === 'textarea';
                      return (
                        <div key={fieldId} className={`${isTextarea ? 'md:col-span-2 ' : ''}space-y-2`}>
                          <Label htmlFor={fieldId}>{field.label}</Label>
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

              <TabsContent value="comments" className="space-y-4">
                <h3 className="text-xl mb-4">Yorumlar</h3>
                {commentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yorumlar yükleniyor...
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Bu cihaz için yorum bulunamadı.</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map(comment => (
                      <Card key={comment.id} className="p-4 bg-white/5 border-white/10">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{comment.name || 'Kullanıcı'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={commentDeleteId === comment.id}
                          >
                            {commentDeleteId === comment.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Sil
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{comment.message}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/admin')} disabled={loading}>
                Geri
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Kaydediliyor...</>
                ) : (
                  <><Upload className="mr-2 w-4 h-4" />Kaydet</>
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
