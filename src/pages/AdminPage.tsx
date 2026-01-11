import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Shield, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Image as ImageIcon,
  Users,
  Settings,
  ListChecks,
  Pencil,
  ShieldOff,
  Trash2,
  Plus,
  Save
} from 'lucide-react';
import { getCurrentUser, getAccessToken } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { AdminSettings, buildSections, mergeSettings, FilterFieldConfig } from '../utils/adminSettings';
import { FieldConfig, SectionConfig, toCamelKey } from '../utils/specConfig';
import { buildPhoneSpecs, SectionValues } from '../utils/buildPhoneSpecs';

interface Phone {
  id: string;
  title: string;
  brand: string;
  shortDesc: string;
  price: string;
  category?: string;
  images: { src: string; alt: string; color: string }[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  submittedBy: string;
}

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  status?: string;
  bannedAt?: string | null;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: 'Bekliyor', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  approved: { label: 'Onaylı', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  rejected: { label: 'Reddedildi', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [pendingPhones, setPendingPhones] = useState<Phone[]>([]);
  const [allPhones, setAllPhones] = useState<Phone[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<AdminSettings>(mergeSettings());
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionTabLabel, setNewSectionTabLabel] = useState('');
  const [newSectionIconName, setNewSectionIconName] = useState('');
  const [newSectionIconHex, setNewSectionIconHex] = useState('#3b82f6');
  const [newSectionCategories, setNewSectionCategories] = useState<string[]>([]);
  const [templateCategory, setTemplateCategory] = useState('');
  const [newFieldSection, setNewFieldSection] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldConfig['type']>('text');
  const [newFieldIsCard, setNewFieldIsCard] = useState(false);
  const [importQueue, setImportQueue] = useState<Array<{
    id: string;
    payload: any;
    title: string;
    brand: string;
    category: string;
    source: string;
  }>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [devicePage, setDevicePage] = useState(1);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await getCurrentUser();
      if (!session) {
        toast.error('Giriş yapmalısınız');
        setAuthError('Oturum bulunamadı. Lütfen giriş yapın.');
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Get user profile to check admin status
      const token = await getAccessToken();
      if (!token) {
        setAuthError('Oturum anahtarı bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        setAuthError(`Profil alınamadı (HTTP ${response.status}). ${errorText || 'Lütfen tekrar giriş yapın.'}`);
        setProfile(null);
        return;
      }

      const profileData = await response.json();
      setProfile(profileData);

      if (profileData.role !== 'admin') {
        setAuthError('Bu sayfaya erişim yetkiniz yok.');
        return;
      }

      await Promise.all([
        fetchPendingPhones(token),
        fetchAllPhones(token),
        fetchUsers(token),
        fetchAdminSettings(token),
      ]);
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError('Oturum doğrulanamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const sortedDevices = useMemo(() => {
    if (allPhones.length === 0) return [];
    const sorted = [...allPhones].sort((a, b) => {
      const dateA = new Date(a.submittedAt || 0).getTime();
      const dateB = new Date(b.submittedAt || 0).getTime();
      return dateB - dateA;
    });
    return sorted;
  }, [allPhones]);

  const devicesPerPage = 20;
  const totalDevicePages = Math.max(1, Math.ceil(sortedDevices.length / devicesPerPage));
  const pagedDevices = useMemo(() => {
    const safePage = Math.min(Math.max(devicePage, 1), totalDevicePages);
    const start = (safePage - 1) * devicesPerPage;
    return sortedDevices.slice(start, start + devicesPerPage);
  }, [devicePage, sortedDevices, totalDevicePages]);

  useEffect(() => {
    if (devicePage > totalDevicePages) {
      setDevicePage(totalDevicePages);
    }
  }, [devicePage, totalDevicePages]);

  const paginationItems = useMemo(() => {
    if (totalDevicePages <= 7) {
      return Array.from({ length: totalDevicePages }, (_, index) => index + 1);
    }
    const items: Array<number | string> = [];
    const siblings = 1;
    const left = Math.max(devicePage - siblings, 2);
    const right = Math.min(devicePage + siblings, totalDevicePages - 1);
    items.push(1);
    if (left > 2) items.push('...');
    for (let page = left; page <= right; page += 1) {
      items.push(page);
    }
    if (right < totalDevicePages - 1) items.push('...');
    items.push(totalDevicePages);
    return items;
  }, [devicePage, totalDevicePages]);

  const fetchPendingPhones = async (token: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/phones/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingPhones(data);
      }
    } catch (error) {
      console.error('Error fetching pending phones:', error);
      toast.error('Bekleyen içerikler yüklenemedi');
    }
  };

  const fetchAllPhones = async (token: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/phones`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllPhones(data);
      }
    } catch (error) {
      console.error('Error fetching all phones:', error);
      toast.error('Cihaz listesi yüklenemedi');
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Üyeler yüklenemedi');
    }
  };

  const fetchAdminSettings = async (token: string) => {
    setSettingsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettingsDraft(mergeSettings(data));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAction = async (phoneId: string, action: 'approve' | 'reject') => {
    setActionLoading(phoneId);

    try {
      const token = await getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/phones/${phoneId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(action === 'approve' ? 'İçerik onaylandı!' : 'İçerik reddedildi!');
      
      // Remove from pending list
      setPendingPhones(prev => prev.filter(p => p.id !== phoneId));
      setAllPhones(prev => prev.map(phone => (
        phone.id === phoneId
          ? { ...phone, status: action === 'approve' ? 'approved' : 'rejected' }
          : phone
      )));
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız');
      console.error('Action error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    setDeleteLoading(phoneId);
    try {
      const token = await getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/phones/${phoneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Cihaz silindi');
      setAllPhones(prev => prev.filter(phone => phone.id !== phoneId));
      setPendingPhones(prev => prev.filter(phone => phone.id !== phoneId));
    } catch (error: any) {
      toast.error(error.message || 'Silme işlemi başarısız');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleUserEdit = async (member: UserProfile) => {
    const label = member.name || member.email || 'Üye';
    try {
      const nextName = window.prompt('Yeni isim', member.name || '');
      if (nextName === null) return;
      const nextEmail = window.prompt('Yeni e-posta', member.email || '');
      if (nextEmail === null) return;
      const trimmedName = nextName.trim();
      const trimmedEmail = nextEmail.trim();
      if (!trimmedName) {
        toast.error('İsim boş olamaz');
        return;
      }
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        toast.error('Geçerli bir e-posta girin');
        return;
      }
      const token = await getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/users/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setUsers(prev => prev.map(u => (u.id === member.id ? data.user : u)));
      toast.success(`${label} güncellendi`);
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız');
    }
  };

  const handleUserRoleChange = async (member: UserProfile, nextRole: string) => {
    const label = member.name || member.email || 'Üye';
    const normalized = nextRole.trim().toLowerCase();
    if (!['admin', 'user'].includes(normalized)) {
      toast.error('Rol admin veya user olmalı');
      return;
    }
    try {
      const token = await getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/users/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: normalized })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setUsers(prev => prev.map(u => (u.id === member.id ? data.user : u)));
      toast.success(`${label} rolü güncellendi`);
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız');
    }
  };

  const handleUserBan = async (member: UserProfile) => {
    const label = member.name || member.email || 'Üye';
    try {
      const token = await getAccessToken();
      const isBanned = (member.status || 'active') === 'banned';
      const confirmText = isBanned
        ? `${label} için banı kaldırmak istiyor musunuz?`
        : `${label} için ban uygulamak istiyor musunuz?`;
      if (!window.confirm(confirmText)) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/users/${member.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: isBanned ? 'unban' : 'ban' })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setUsers(prev => prev.map(u => (u.id === member.id ? data.user : u)));
      toast.success(isBanned ? `${label} banı kaldırıldı` : `${label} banlandı`);
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız');
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settingsDraft)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Ayarlar kaydedildi');
    } catch (error: any) {
      toast.error(error.message || 'Ayarlar kaydedilemedi');
    } finally {
      setSettingsSaving(false);
    }
  };

  const sectionConfigs = buildSections({ ...settingsDraft, hiddenFields: {} });
  const sectionOptions = sectionConfigs.map(section => ({
    value: section.id,
    label: section.title,
  }));
  const customSectionIds = new Set((settingsDraft.customSections || []).map(section => section.id));

  const toggleSectionList = (key: 'formSectionIds' | 'cardSectionIds', sectionId: string, enabled: boolean) => {
    setSettingsDraft(prev => {
      const current = new Set(prev[key] || []);
      if (enabled) {
        current.add(sectionId);
      } else {
        current.delete(sectionId);
      }
      return { ...prev, [key]: Array.from(current) };
    });
  };

  const toggleFieldVisibility = (sectionId: string, fieldKey: string, visible: boolean) => {
    setSettingsDraft(prev => {
      const hiddenFields = { ...(prev.hiddenFields || {}) };
      const current = new Set(hiddenFields[sectionId] || []);
      if (visible) {
        current.delete(fieldKey);
      } else {
        current.add(fieldKey);
      }
      hiddenFields[sectionId] = Array.from(current);
      const cardFields = { ...(prev.cardFields || {}) };
      if (!visible && cardFields[sectionId]) {
        cardFields[sectionId] = cardFields[sectionId].filter(key => key !== fieldKey);
      }
      return { ...prev, hiddenFields, cardFields };
    });
  };

  const toggleCardField = (
    sectionId: string,
    fieldKey: string,
    enabled: boolean,
    defaultKeys: string[] = []
  ) => {
    setSettingsDraft(prev => {
      const cardFields = { ...(prev.cardFields || {}) };
      const seed = cardFields[sectionId] && cardFields[sectionId].length > 0
        ? cardFields[sectionId]
        : defaultKeys;
      const current = new Set(seed || []);
      if (enabled) {
        current.add(fieldKey);
      } else {
        current.delete(fieldKey);
      }
      cardFields[sectionId] = Array.from(current);
      return { ...prev, cardFields };
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setSettingsDraft(prev => {
      const categories = new Set(prev.categories || []);
      categories.add(trimmed);
      const templates = { ...(prev.categorySectionTemplates || {}) };
      if (!templates[trimmed]) {
        templates[trimmed] = [];
      }
      return { ...prev, categories: Array.from(categories), categorySectionTemplates: templates };
    });
    setNewCategory('');
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setSettingsDraft(prev => ({
      ...prev,
      categories: (prev.categories || []).filter(cat => cat !== categoryToRemove),
      sectionCategories: Object.fromEntries(
        Object.entries(prev.sectionCategories || {}).map(([key, value]) => [
          key,
          (value || []).filter(cat => cat !== categoryToRemove),
        ])
      ),
      categorySectionTemplates: Object.fromEntries(
        Object.entries(prev.categorySectionTemplates || {}).filter(([key]) => key !== categoryToRemove)
      ),
      customSections: (prev.customSections || []).map(section => ({
        ...section,
        categories: (section.categories || []).filter(cat => cat !== categoryToRemove),
      })),
    }));
  };

  const toggleNewSectionCategory = (category: string, enabled: boolean) => {
    setNewSectionCategories(prev => {
      const next = new Set(prev);
      if (enabled) {
        next.add(category);
      } else {
        next.delete(category);
      }
      return Array.from(next);
    });
  };

  const toggleSectionCategory = (sectionId: string, category: string, enabled: boolean) => {
    setSettingsDraft(prev => {
      const map = { ...(prev.sectionCategories || {}) };
      const current = new Set(map[sectionId] || []);
      if (enabled) {
        current.add(category);
      } else {
        current.delete(category);
      }
      map[sectionId] = Array.from(current);
      const customSections = (prev.customSections || []).map(section =>
        section.id === sectionId ? { ...section, categories: map[sectionId] } : section
      );
      return { ...prev, sectionCategories: map, customSections };
    });
  };

  const toggleTemplateSection = (sectionId: string, enabled: boolean) => {
    if (!templateCategory) return;
    setSettingsDraft(prev => {
      const templates = { ...(prev.categorySectionTemplates || {}) };
      const current = new Set(templates[templateCategory] || []);
      if (enabled) {
        current.add(sectionId);
      } else {
        current.delete(sectionId);
      }
      templates[templateCategory] = Array.from(current);
      return { ...prev, categorySectionTemplates: templates };
    });
  };

  const applyTemplateToCategory = () => {
    if (!templateCategory) return;
    setSettingsDraft(prev => {
      const templates = prev.categorySectionTemplates || {};
      const templateSet = new Set(templates[templateCategory] || []);
      const sectionCategories = { ...(prev.sectionCategories || {}) };
      sectionConfigs.forEach(section => {
        const current = new Set(sectionCategories[section.id] || []);
        if (templateSet.has(section.id)) {
          current.add(templateCategory);
        } else {
          current.delete(templateCategory);
        }
        sectionCategories[section.id] = Array.from(current);
      });
      return { ...prev, sectionCategories };
    });
    toast.success('Şablon uygulandı');
  };

  const handleAddSection = () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    const tabLabel = (newSectionTabLabel || title).trim();
    const id = toCamelKey(tabLabel || title);
    const exists = sectionConfigs.some(section => section.id === id);
    if (exists) {
      toast.error('Bu bölüm zaten mevcut');
      return;
    }
    const categories = newSectionCategories.length > 0 ? newSectionCategories : (settingsDraft.categories || []);
    const newSection: SectionConfig & { iconName?: string; iconHex?: string } = {
      id,
      title,
      tabLabel,
      fields: [],
      iconName: newSectionIconName.trim(),
      iconHex: newSectionIconHex.trim(),
      categories,
    };
    setSettingsDraft(prev => ({
      ...prev,
      customSections: [...(prev.customSections || []), newSection],
      formSectionIds: [...(prev.formSectionIds || []), id],
      cardSectionIds: [...(prev.cardSectionIds || []), id],
      cardFields: {
        ...(prev.cardFields || {}),
        [id]: [],
      },
      sectionCategories: {
        ...(prev.sectionCategories || {}),
        [id]: categories,
      },
      categorySectionTemplates: Object.fromEntries(
        Object.entries(prev.categorySectionTemplates || {}).map(([key, value]) => [
          key,
          categories.includes(key) ? [...new Set([...(value || []), id])] : value || [],
        ])
      ),
    }));
    setNewSectionTitle('');
    setNewSectionTabLabel('');
    setNewSectionIconName('');
    setNewSectionIconHex('#3b82f6');
    setNewSectionCategories([]);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (!customSectionIds.has(sectionId)) return;
    setSettingsDraft(prev => ({
      ...prev,
      customSections: (prev.customSections || []).filter(section => section.id !== sectionId),
      formSectionIds: (prev.formSectionIds || []).filter(id => id !== sectionId),
      cardSectionIds: (prev.cardSectionIds || []).filter(id => id !== sectionId),
      cardFields: Object.fromEntries(
        Object.entries(prev.cardFields || {}).filter(([key]) => key !== sectionId)
      ),
      categorySectionTemplates: Object.fromEntries(
        Object.entries(prev.categorySectionTemplates || {}).map(([key, value]) => [
          key,
          (value || []).filter(id => id !== sectionId),
        ])
      ),
      filterFields: (prev.filterFields || []).filter(item => item.sectionId !== sectionId),
    }));
  };

  const parseBooleanValue = (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value !== 'string') return Boolean(value);
    const normalized = value.trim().toLowerCase();
    if (['var', 'evet', 'true', '1', 'yes'].includes(normalized)) return true;
    if (['yok', 'hayır', 'hayir', 'false', '0', 'no'].includes(normalized)) return false;
    return Boolean(normalized);
  };

  const parseTextValue = (value: unknown) => {
    if (Array.isArray(value)) return value.map(item => String(item)).join(' / ');
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const buildImportPayload = (entry: any, source: string, index: number) => {
    const title = entry['Model'] || entry['model'] || entry['title'] || 'Bilinmeyen Model';
    const brand = entry['Marka'] || entry['brand'] || 'Bilinmeyen Marka';
    const category = entry['Kategori'] || entry['kategori'] || 'Telefon';
    const shortDesc =
      entry['Kısa Açıklama'] ||
      entry['Kisa Aciklama'] ||
      entry['shortDesc'] ||
      entry['Açıklama'] ||
      '';
    const tagline = entry['Slogan'] || entry['tagline'] || '';
    const price = entry['Fiyat'] || entry['price'] || '';
    const imageUrl = entry['resim url'] || entry['Resim URL'] || entry['resimUrl'] || entry['image'] || '';
    const imageList = entry['images'];
    const images = Array.isArray(imageList)
      ? imageList.map((src: string) => ({ src, alt: title, color: '' }))
      : [{ src: imageUrl, alt: title, color: '' }];

    const categorySectionIds = new Set(
      sectionConfigs
        .filter(section => (settingsDraft.sectionCategories?.[section.id] || []).includes(category))
        .map(section => section.id)
    );
    const sectionPool = categorySectionIds.size > 0
      ? sectionConfigs.filter(section => categorySectionIds.has(section.id))
      : sectionConfigs;

    const sectionFieldMap = sectionConfigs.reduce((acc, section) => {
      acc[section.id] = section.fields.reduce((fieldAcc, field) => {
        fieldAcc[field.key] = field.type;
        return fieldAcc;
      }, {} as Record<string, FieldConfig['type']>);
      return acc;
    }, {} as Record<string, Record<string, FieldConfig['type']>>);

    const sectionFieldKeys = sectionConfigs.reduce((acc, section) => {
      acc[section.id] = new Set(section.fields.map(field => field.key));
      return acc;
    }, {} as Record<string, Set<string>>);

    const labelToSection = sectionPool.reduce((acc, section) => {
      section.fields.forEach(field => {
        if (!acc[field.label]) {
          acc[field.label] = section.id;
        }
      });
      return acc;
    }, {} as Record<string, string>);

    const sectionIdSet = new Set(sectionConfigs.map(section => section.id));
    const nameToSection = sectionPool.reduce((acc, section) => {
      [section.id, section.title, section.tabLabel].forEach(name => {
        const key = toCamelKey(name);
        if (key && !acc[key]) {
          acc[key] = section.id;
        }
      });
      return acc;
    }, {} as Record<string, string>);
    const aliasMap: Record<string, string> = {
      dayaniklilikOzellikleri: 'dayaniklilik',
      ozellikler: 'sensorServis',
      sensorlerVeServisler: 'sensorServis',
      abUrunKayitVeEnerjiEtiketi: 'abEtiket',
    };

    const sectionValues: SectionValues = {};
    const otherKey = toCamelKey('Diğer');

    Object.entries(entry || {}).forEach(([sectionName, sectionValue]) => {
      if (!sectionValue || typeof sectionValue !== 'object' || Array.isArray(sectionValue)) return;
      const normalized = toCamelKey(sectionName);
      const mappedFromPool = nameToSection[normalized];
      const mappedFallback = sectionIdSet.has(normalized) ? normalized : aliasMap[normalized];
      const mapped = mappedFromPool || mappedFallback;
      const fallbackSection = mapped || undefined;
      Object.entries(sectionValue as Record<string, unknown>).forEach(([label, value]) => {
        const trimmedLabel = label.trim();
        const targetSection = labelToSection[trimmedLabel] || fallbackSection;
        if (!targetSection) return;
        const fieldKey = toCamelKey(trimmedLabel);
        const fieldType = sectionFieldMap[targetSection]?.[fieldKey];
        const parsed = fieldType === 'checkbox' ? parseBooleanValue(value) : parseTextValue(value);
        if (!sectionValues[targetSection]) sectionValues[targetSection] = {};

        if (sectionFieldKeys[targetSection]?.has(fieldKey)) {
          sectionValues[targetSection][fieldKey] = parsed;
          return;
        }

        if (sectionFieldKeys[targetSection]?.has(otherKey)) {
          const existing = parseTextValue(sectionValues[targetSection][otherKey]);
          const line = `${trimmedLabel}: ${parseTextValue(value)}`;
          sectionValues[targetSection][otherKey] = existing ? `${existing}\n${line}` : line;
          return;
        }

        sectionValues[targetSection][fieldKey] = parsed;
      });
    });

    const specs = buildPhoneSpecs(sectionValues, sectionConfigs);

    const payload = {
      brand,
      title,
      shortDesc,
      tagline,
      price,
      category,
      images,
      specs,
      autoApprove: true,
    };

    return {
      id: `${source}:${index}`,
      payload,
      title,
      brand,
      category,
      source,
    };
  };

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const entries: Array<{ entry: any; source: string; index: number }> = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        list.forEach((entry, index) => {
          entries.push({ entry, source: file.name, index });
        });
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message || 'JSON okunamadı'}`);
      }
    }

    const queue: typeof importQueue = [];
    entries.forEach(({ entry, source, index }) => {
      try {
        queue.push(buildImportPayload(entry, source, index));
      } catch (error: any) {
        errors.push(`${source} #${index + 1}: ${error.message || 'Veri eşlemesi başarısız'}`);
      }
    });

    setImportQueue(queue);
    setImportErrors(errors);
    setImportProgress({ done: 0, total: queue.length });
  };

  const handleImportSubmit = async () => {
    if (importQueue.length === 0) return;
    setImportLoading(true);
    setImportErrors([]);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Oturum süresi doldu, lütfen tekrar giriş yapın');
        return;
      }
      let done = 0;
      const errors: string[] = [];
      for (const item of importQueue) {
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/phones`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item.payload)
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Sunucu hatası');
          }
        } catch (error: any) {
          errors.push(`${item.title}: ${error.message || 'İçe aktarma başarısız'}`);
        } finally {
          done += 1;
          setImportProgress({ done, total: importQueue.length });
        }
      }

      setImportErrors(errors);
      if (errors.length === 0) {
        toast.success('JSON içe aktarma tamamlandı');
      } else {
        toast.error('Bazı kayıtlar içe aktarılamadı');
      }
      const tokenForRefresh = await getAccessToken();
      if (tokenForRefresh) {
        fetchAllPhones(tokenForRefresh);
      }
    } finally {
      setImportLoading(false);
    }
  };

  const handleAddField = () => {
    const sectionId = newFieldSection || sectionConfigs[0]?.id;
    const label = newFieldLabel.trim();
    if (!sectionId || !label) return;
    const key = toCamelKey(label);
    const sectionExists = sectionConfigs.find(section => section.id === sectionId);
    if (sectionExists && sectionExists.fields.some(field => field.key === key)) {
      toast.error('Bu alan zaten mevcut');
      return;
    }
    const field: FieldConfig = {
      key,
      label,
      type: newFieldType,
      ...(newFieldIsCard ? { isCard: true } : {}),
    };
    if (customSectionIds.has(sectionId)) {
      setSettingsDraft(prev => ({
        ...prev,
        customSections: (prev.customSections || []).map(section =>
          section.id === sectionId
            ? { ...section, fields: [...section.fields, field] }
            : section
        ),
        cardFields: newFieldIsCard
          ? {
              ...(prev.cardFields || {}),
              [sectionId]: [...new Set([...(prev.cardFields?.[sectionId] || []), key])],
            }
          : prev.cardFields,
      }));
    } else {
      setSettingsDraft(prev => ({
        ...prev,
        extraFields: {
          ...(prev.extraFields || {}),
          [sectionId]: [...(prev.extraFields?.[sectionId] || []), field],
        },
        cardFields: newFieldIsCard
          ? {
              ...(prev.cardFields || {}),
              [sectionId]: [...new Set([...(prev.cardFields?.[sectionId] || []), key])],
            }
          : prev.cardFields,
      }));
    }
    setNewFieldLabel('');
    setNewFieldIsCard(false);
    setNewFieldType('text');
  };

  const toggleFilterField = (sectionId: string, field: FieldConfig, enabled: boolean) => {
    const key = `${sectionId}:${field.key}`;
    setSettingsDraft(prev => {
      const current = prev.filterFields || [];
      const exists = current.some(item => `${item.sectionId}:${item.fieldKey}` === key);
      if (enabled && !exists) {
        const next: FilterFieldConfig = {
          sectionId,
          fieldKey: field.key,
          label: field.label,
          type: field.type,
          filterType: field.type === 'checkbox' ? 'boolean' : 'text',
        };
        return { ...prev, filterFields: [...current, next] };
      }
      if (!enabled && exists) {
        return {
          ...prev,
          filterFields: current.filter(item => `${item.sectionId}:${item.fieldKey}` !== key),
        };
      }
      return prev;
    });
  };

  const updateFilterFieldType = (sectionId: string, fieldKey: string, filterType: FilterFieldConfig['filterType']) => {
    setSettingsDraft(prev => {
      const current = prev.filterFields || [];
      return {
        ...prev,
        filterFields: current.map(item => {
          if (item.sectionId === sectionId && item.fieldKey === fieldKey) {
            return { ...item, filterType };
          }
          return item;
        }),
      };
    });
  };

  const handleRemoveExtraField = (sectionId: string, fieldKey: string) => {
    if (customSectionIds.has(sectionId)) {
      setSettingsDraft(prev => ({
        ...prev,
        customSections: (prev.customSections || []).map(section =>
          section.id === sectionId
            ? { ...section, fields: section.fields.filter(field => field.key !== fieldKey) }
            : section
        ),
        cardFields: {
          ...(prev.cardFields || {}),
          [sectionId]: (prev.cardFields?.[sectionId] || []).filter(key => key !== fieldKey),
        },
        filterFields: (prev.filterFields || []).filter(item => !(item.sectionId === sectionId && item.fieldKey === fieldKey)),
      }));
      return;
    }

    setSettingsDraft(prev => ({
      ...prev,
      extraFields: {
        ...(prev.extraFields || {}),
        [sectionId]: (prev.extraFields?.[sectionId] || []).filter(field => field.key !== fieldKey),
      },
      cardFields: {
        ...(prev.cardFields || {}),
        [sectionId]: (prev.cardFields?.[sectionId] || []).filter(key => key !== fieldKey),
      },
      filterFields: (prev.filterFields || []).filter(item => !(item.sectionId === sectionId && item.fieldKey === fieldKey)),
    }));
  };

  useEffect(() => {
    if (!newFieldSection && sectionOptions.length > 0) {
      setNewFieldSection(sectionOptions[0].value);
    }
  }, [newFieldSection, sectionOptions]);

  useEffect(() => {
    if (newSectionCategories.length === 0 && (settingsDraft.categories || []).length > 0) {
      setNewSectionCategories([settingsDraft.categories?.[0] || 'Telefon']);
    }
  }, [newSectionCategories.length, settingsDraft.categories]);

  useEffect(() => {
    setNewSectionCategories(prev =>
      prev.filter(cat => (settingsDraft.categories || []).includes(cat))
    );
  }, [settingsDraft.categories]);

  useEffect(() => {
    if (!templateCategory && (settingsDraft.categories || []).length > 0) {
      setTemplateCategory(settingsDraft.categories?.[0] || 'Telefon');
    }
  }, [templateCategory, settingsDraft.categories]);

  useEffect(() => {
    if (templateCategory && !(settingsDraft.categories || []).includes(templateCategory)) {
      setTemplateCategory(settingsDraft.categories?.[0] || '');
    }
  }, [templateCategory, settingsDraft.categories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 max-w-md w-full text-center">
          <h2 className="text-xl mb-2">Admin paneline erişilemiyor</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {authError || 'Lütfen tekrar giriş yapın.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => navigate('/login')}>Giriş Yap</Button>
            <Button onClick={() => navigate('/')}>Ana Sayfa</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900/50 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_45%)]" />
        <div className="container relative mx-auto px-4 py-10 max-w-6xl">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-sky-400" />
                <h1 className="text-4xl">Admin Paneli</h1>
              </div>
              <p className="text-muted-foreground">
                Hoş geldin, {profile.name}! Bekleyen içerikleri onayla, cihazları yönet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl">{pendingPhones.length}</p>
                    <p className="text-sm text-muted-foreground">Bekleyen İçerik</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <ListChecks className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl">{allPhones.length}</p>
                    <p className="text-sm text-muted-foreground">Toplam Cihaz</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-white/5 backdrop-blur-xl border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-2xl">{users.length}</p>
                    <p className="text-sm text-muted-foreground">Üye Sayısı</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-6xl">

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6 flex flex-wrap gap-2 bg-transparent p-0">
            <TabsTrigger
              value="pending"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs data-[state=active]:bg-white/15 sm:text-sm"
            >
              Bekleyenler
            </TabsTrigger>
            <TabsTrigger
              value="phones"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs data-[state=active]:bg-white/15 sm:text-sm"
            >
              Cihazlar
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs data-[state=active]:bg-white/15 sm:text-sm"
            >
              Üyeler
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs data-[state=active]:bg-white/15 sm:text-sm"
            >
              Ayarlar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <h2 className="text-2xl mb-6">Bekleyen İçerikler</h2>

              {pendingPhones.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl mb-2">Bekleyen içerik yok</h3>
                  <p className="text-muted-foreground">
                    Tüm içerikler incelendi!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPhones.map((phone) => (
                    <Card key={phone.id} className="p-6 bg-white/5 border-white/10">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-48 flex-shrink-0">
                          {phone.images?.[0]?.src ? (
                            <img
                              src={phone.images[0].src}
                              alt={phone.title}
                              className="w-full h-48 object-contain rounded-lg bg-white/5"
                            />
                          ) : (
                            <div className="w-full h-48 rounded-lg bg-white/5 flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <Badge variant="outline" className="mb-2 text-xs">
                                {phone.brand}
                              </Badge>
                              <h3 className="text-xl mb-1">{phone.title}</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {phone.shortDesc}
                              </p>
                              <p className="text-lg">{phone.price}</p>
                            </div>

                            <Badge variant="secondary" className="gap-2">
                              <Clock className="w-3 h-3" />
                              Bekliyor
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Gönderilme: {new Date(phone.submittedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-3 pt-3">
                            <Button
                              onClick={() => handleAction(phone.id, 'approve')}
                              disabled={actionLoading === phone.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {actionLoading === phone.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 w-4 h-4" />
                                  Onayla
                                </>
                              )}
                            </Button>

                            <Button
                              variant="destructive"
                              onClick={() => handleAction(phone.id, 'reject')}
                              disabled={actionLoading === phone.id}
                            >
                              {actionLoading === phone.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="mr-2 w-4 h-4" />
                                  Reddet
                                </>
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => navigate(`/admin/phones/${phone.id}`)}
                            >
                              <Pencil className="mr-2 w-4 h-4" />
                              Düzenle
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="phones">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-2xl">Son 20 Cihaz</h2>
                  <p className="text-xs text-muted-foreground">Toplam {allPhones.length} cihaz kayıtlı</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/submit')}>
                  <Plus className="mr-2 w-4 h-4" />
                  Yeni Cihaz
                </Button>
              </div>

              {pagedDevices.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl mb-2">Cihaz bulunamadı</h3>
                  <p className="text-muted-foreground">
                    Henüz kayıtlı cihaz yok.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cihaz</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Gönderim</TableHead>
                        <TableHead>İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedDevices.map((phone) => {
                        const statusMeta = STATUS_STYLES[phone.status] || { label: phone.status, className: '' };
                        return (
                          <TableRow key={phone.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                                  {phone.images?.[0]?.src ? (
                                    <img
                                      src={phone.images[0].src}
                                      alt={phone.title}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{phone.brand} {phone.title}</p>
                                  <p className="text-xs text-muted-foreground">{phone.price}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{phone.category || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${statusMeta.className}`}>
                                {statusMeta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {phone.submittedAt ? new Date(phone.submittedAt).toLocaleDateString('tr-TR') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/admin/phones/${phone.id}`)}
                                >
                                  <Pencil className="mr-2 w-4 h-4" />
                                  Düzenle
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeletePhone(phone.id)}
                                  disabled={deleteLoading === phone.id}
                                >
                                  {deleteLoading === phone.id ? (
                                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 w-4 h-4" />
                                  )}
                                  Sil
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {totalDevicePages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {paginationItems.map((item, index) => {
                        if (item === '...') {
                          return (
                            <span
                              key={`device-ellipsis-${index}`}
                              className="h-8 w-8 inline-flex items-center justify-center text-xs text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }
                        const page = item as number;
                        const isActive = page === devicePage;
                        return (
                          <Button
                            key={`device-page-${page}`}
                            size="sm"
                            variant={isActive ? 'default' : 'outline'}
                            onClick={() => setDevicePage(page)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <h2 className="text-2xl mb-4">Üyeler</h2>
              {users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl mb-2">Üye bulunamadı</h3>
                  <p className="text-muted-foreground">Henüz kayıtlı kullanıcı yok.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İsim</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Kayıt</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.name || '-'}</TableCell>
                        <TableCell>{member.email || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={member.role || 'user'}
                            onValueChange={(value) => handleUserRoleChange(member, value)}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue placeholder="Rol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {(member.status || 'active') === 'banned' ? (
                            <Badge variant="outline" className="text-xs border-red-500/40 text-red-200">
                              Banlı
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-green-500/30 text-green-200">
                              Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {member.createdAt ? new Date(member.createdAt).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserEdit(member)}
                            >
                              <Pencil className="mr-2 w-4 h-4" />
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUserBan(member)}
                            >
                              <ShieldOff className="mr-2 w-4 h-4" />
                              Ban
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl">Admin Ayarları</h2>
              </div>
              <Button onClick={handleSaveSettings} disabled={settingsSaving || settingsLoading}>
                {settingsSaving ? (
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                ) : (
                  <Save className="mr-2 w-4 h-4" />
                )}
                Kaydet
              </Button>
            </div>

            {settingsLoading ? (
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                <AccordionItem value="categories" className="border-0">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <AccordionTrigger className="px-6 py-5 text-base">Kategoriler</AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="flex flex-col md:flex-row gap-3 mb-4">
                        <Input
                          placeholder="Yeni kategori adı"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCategory();
                            }
                          }}
                        />
                        <Button onClick={handleAddCategory}>
                          <Plus className="mr-2 w-4 h-4" />
                          Ekle
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(settingsDraft.categories || []).map((cat) => (
                          <div
                            key={cat}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm"
                          >
                            <span>{cat}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveCategory(cat)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>

                <AccordionItem value="templates" className="border-0">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <AccordionTrigger className="px-6 py-5 text-base">Kategori Şablonları</AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="text-xs text-muted-foreground">
                          Seçili kategoride görünecek bölümleri işaretle.
                        </div>
                        <Button variant="outline" onClick={applyTemplateToCategory} disabled={!templateCategory}>
                          Şablonu Uygula
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Kategori</Label>
                          <Select value={templateCategory} onValueChange={setTemplateCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Kategori seç" />
                            </SelectTrigger>
                            <SelectContent>
                              {(settingsDraft.categories || []).map(cat => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sectionConfigs.map(section => {
                          const selected = (settingsDraft.categorySectionTemplates?.[templateCategory] || []).includes(section.id);
                          return (
                            <div key={section.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(next) => toggleTemplateSection(section.id, next === true)}
                                disabled={!templateCategory}
                              />
                              <Label className="text-xs">{section.title}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>

                <AccordionItem value="import" className="border-0">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <AccordionTrigger className="px-6 py-5 text-base">JSON İçe Aktarma</AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <p className="text-xs text-muted-foreground">Toplu kayıt ekleme ve doğrulama.</p>
                        <Button onClick={handleImportSubmit} disabled={importLoading || importQueue.length === 0}>
                          {importLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          İçe Aktar
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="json-import">JSON dosyaları</Label>
                          <Input
                            id="json-import"
                            type="file"
                            accept="application/json,.json"
                            multiple
                            onChange={(e) => handleImportFiles(e.target.files)}
                          />
                        </div>
                        {importQueue.length > 0 && (
                          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
                            <p className="text-muted-foreground">
                              Toplam kayıt: {importQueue.length}
                              {importProgress.total > 0 ? ` • İlerleme: ${importProgress.done}/${importProgress.total}` : ''}
                            </p>
                            <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
                              {importQueue.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <span className="truncate">{item.brand} {item.title}</span>
                                  <span className="text-muted-foreground">{item.category}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {importErrors.length > 0 && (
                          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                            <p className="mb-2 font-medium">Hatalar</p>
                            <ul className="space-y-1">
                              {importErrors.map((err, idx) => (
                                <li key={`${err}-${idx}`}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>

                <AccordionItem value="new-section" className="border-0">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <AccordionTrigger className="px-6 py-5 text-base">Yeni Bölüm</AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="section-title">Başlık</Label>
                          <Input
                            id="section-title"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            placeholder="Örn: Oyun"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="section-tab">Sekme Etiketi</Label>
                          <Input
                            id="section-tab"
                            value={newSectionTabLabel}
                            onChange={(e) => setNewSectionTabLabel(e.target.value)}
                            placeholder="Örn: Oyun"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="section-icon">Icon (lucide-react)</Label>
                          <Input
                            id="section-icon"
                            value={newSectionIconName}
                            onChange={(e) => setNewSectionIconName(e.target.value)}
                            placeholder="Örn: Gamepad2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="section-icon-bg">Icon Renk</Label>
                          <Input
                            id="section-icon-bg"
                            value={newSectionIconHex}
                            onChange={(e) => setNewSectionIconHex(e.target.value)}
                            placeholder="#3b82f6"
                          />
                        </div>
                        <div className="flex items-end md:col-span-4">
                          <Button onClick={handleAddSection}>
                            <Plus className="mr-2 w-4 h-4" />
                            Bölüm Ekle
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label className="mb-2 block">Kategoriler</Label>
                        <div className="flex flex-wrap gap-3">
                          {(settingsDraft.categories || []).map((cat) => {
                            const checked = newSectionCategories.includes(cat);
                            return (
                              <div key={cat} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(next) => toggleNewSectionCategory(cat, next === true)}
                                />
                                <Label className="text-xs">{cat}</Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>

                <AccordionItem value="new-field" className="border-0">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <AccordionTrigger className="px-6 py-5 text-base">Yeni Alan</AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Bölüm</Label>
                          <Select value={newFieldSection} onValueChange={setNewFieldSection}>
                            <SelectTrigger>
                              <SelectValue placeholder="Bölüm seç" />
                            </SelectTrigger>
                            <SelectContent>
                              {sectionOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Etiket</Label>
                          <Input
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            placeholder="Örn: Soğutma Tipi"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tip</Label>
                          <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as FieldConfig['type'])}>
                            <SelectTrigger>
                              <SelectValue placeholder="Tip" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={newFieldIsCard}
                              onCheckedChange={(next) => setNewFieldIsCard(next === true)}
                            />
                            <Label>Kart Alanı</Label>
                          </div>
                          <Button onClick={handleAddField}>
                            <Plus className="mr-2 w-4 h-4" />
                            Alan Ekle
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>

                <AccordionItem value="sections" className="border-0">
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <AccordionTrigger className="px-6 py-5 text-base">Bölümler ve Alanlar</AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-4">
                        {sectionConfigs.map(section => {
                          const formEnabled = (settingsDraft.formSectionIds || []).includes(section.id);
                          const cardEnabled = (settingsDraft.cardSectionIds || []).includes(section.id);
                          const hiddenFields = new Set(settingsDraft.hiddenFields?.[section.id] || []);
                          const cardFieldList = settingsDraft.cardFields?.[section.id] || [];
                          const cardFields = new Set(cardFieldList);
                          const filterFieldSet = new Set(
                            (settingsDraft.filterFields || []).map(item => `${item.sectionId}:${item.fieldKey}`)
                          );
                          const defaultCardKeys = section.fields.filter(field => field.isCard).map(field => field.key);
                          const useDefaultCards = cardFieldList.length === 0;
                          const extraKeys = new Set((settingsDraft.extraFields?.[section.id] || []).map(field => field.key));
                          const isCustom = customSectionIds.has(section.id);

                          return (
                            <Card key={section.id} className="p-5 bg-white/5 border-white/10">
                              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <div>
                                  <p className="text-lg">{section.title}</p>
                                  <p className="text-xs text-muted-foreground">{section.id}</p>
                                  {'iconName' in section && section.iconName ? (
                                    <p className="text-xs text-muted-foreground">Icon: {section.iconName}</p>
                                  ) : null}
                                  {'iconHex' in section && section.iconHex ? (
                                    <p className="text-xs text-muted-foreground">Renk: {section.iconHex}</p>
                                  ) : null}
                                  {(settingsDraft.sectionCategories?.[section.id] || []).length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      Kategoriler: {(settingsDraft.sectionCategories?.[section.id] || []).join(', ')}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={formEnabled}
                                      onCheckedChange={(next) => toggleSectionList('formSectionIds', section.id, next === true)}
                                    />
                                    <Label>Formda</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={cardEnabled}
                                      onCheckedChange={(next) => toggleSectionList('cardSectionIds', section.id, next === true)}
                                    />
                                    <Label>Kartta</Label>
                                  </div>
                                  {isCustom && (
                                    <Button variant="destructive" size="sm" onClick={() => handleRemoveSection(section.id)}>
                                      <Trash2 className="mr-2 w-4 h-4" />
                                      Bölümü Sil
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="mb-4">
                                <Label className="mb-2 block text-xs text-muted-foreground">Kategoriler</Label>
                                <div className="flex flex-wrap gap-2">
                                  {(settingsDraft.categories || []).map((cat) => {
                                    const selected = (settingsDraft.sectionCategories?.[section.id] || []).includes(cat);
                                    return (
                                      <div key={cat} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                                        <Checkbox
                                          checked={selected}
                                          onCheckedChange={(next) => toggleSectionCategory(section.id, cat, next === true)}
                                        />
                                        <Label className="text-xs">{cat}</Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {section.fields.map(field => {
                                  const visible = !hiddenFields.has(field.key);
                                  const cardSelected = useDefaultCards ? !!field.isCard : cardFields.has(field.key);
                                  const filterSelected = filterFieldSet.has(`${section.id}:${field.key}`);
                                  const filterConfig = (settingsDraft.filterFields || []).find(
                                    item => item.sectionId === section.id && item.fieldKey === field.key
                                  );
                                  const removable = isCustom || extraKeys.has(field.key);
                                  return (
                                    <div key={field.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                      <div>
                                        <p className="text-sm">{field.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {field.type}{field.isCard ? ' • kart' : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={visible}
                                            onCheckedChange={(next) => toggleFieldVisibility(section.id, field.key, next === true)}
                                          />
                                          <Label className="text-xs">Görünür</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={cardSelected}
                                            onCheckedChange={(next) =>
                                              toggleCardField(section.id, field.key, next === true, defaultCardKeys)
                                            }
                                            disabled={!cardEnabled || !visible}
                                          />
                                          <Label className="text-xs">Kart</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={filterSelected}
                                            onCheckedChange={(next) => toggleFilterField(section.id, field, next === true)}
                                          />
                                          <Label className="text-xs">Filtre</Label>
                                        </div>
                                        {filterSelected && field.type !== 'checkbox' && (
                                          <Select
                                            value={filterConfig?.filterType || 'text'}
                                            onValueChange={(value) =>
                                              updateFilterFieldType(section.id, field.key, value as FilterFieldConfig['filterType'])
                                            }
                                          >
                                            <SelectTrigger className="h-8 w-[110px]">
                                              <SelectValue placeholder="Tip" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="text">Metin</SelectItem>
                                              <SelectItem value="range">Aralık</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                        {removable && (
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleRemoveExtraField(section.id, field.key)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
}
