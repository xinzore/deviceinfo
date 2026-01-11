export type FieldType = 'text' | 'textarea' | 'checkbox';

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  isCard?: boolean;
};

export type SectionConfig = {
  id: string;
  tabLabel: string;
  title: string;
  fields: FieldConfig[];
};

export const turkishToAscii = (input: string) =>
  input
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u');

export const toCamelKey = (label: string) => {
  const cleaned = turkishToAscii(label)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
  const parts = cleaned.match(/[a-z0-9]+/g) || [];
  if (parts.length === 0) return 'value';
  const [first, ...rest] = parts;
  const camel = [first, ...rest.map(p => p.charAt(0).toUpperCase() + p.slice(1))].join('');
  return /^[0-9]/.test(camel) ? `n${camel}` : camel;
};

const longText = (label: string) =>
  /(Özellikleri|Seçenekleri|Sensörler|Servis|Ağır Çekim|Kamera Özellikleri|Ekran Özellikleri)/i.test(label);

const f = (label: string, type?: FieldType, isCard?: boolean): FieldConfig => ({
  key: toCamelKey(label),
  label,
  type: type ?? (longText(label) ? 'textarea' : 'text'),
  ...(isCard ? { isCard: true } : null),
});

const c = (label: string, isCard?: boolean): FieldConfig => f(label, 'checkbox', isCard);

export const SECTION_CONFIG: SectionConfig[] = [
  {
    id: 'ekran',
    tabLabel: 'Ekran',
    title: 'Ekran',
    fields: [
      f('Ekran Boyutu', 'text', true),
      f('Ekran Teknolojisi'),
      f('Ekran Çözünürlüğü'),
      f('Ekran Çözünürlüğü Standardı'),
      f('Piksel Yoğunluğu'),
      f('Ekran Yenileme Hızı'),
      f('Ekran Oranı (Aspect Ratio)'),
      f('Ekran Alanı'),
      f('Ekran Özellikleri'),
      f('Ekran Dayanıklılığı'),
      f('Renk Sayısı'),
      f('Ekran / Gövde Oranı'),
    ],
  },
  {
    id: 'batarya',
    tabLabel: 'Batarya',
    title: 'Batarya',
    fields: [
      f('Batarya Kapasitesi (Tipik)', 'text', true),
      f('Şarj'),
      c('Hızlı Şarj'),
      f('Hızlı Şarj Gücü (Maks.)'),
      f('Hızlı Şarj Özellikleri'),
      f('Şarj Süresi (Üretici Verisi)'),
      c('Kablosuz Şarj'),
      f('Kablosuz Şarj Özellikleri'),
      c('Değişir Batarya'),
      f('Batarya Özellikleri'),
    ],
  },
  {
    id: 'kamera',
    tabLabel: 'Kamera',
    title: 'Kamera',
    fields: [
      f('Kamera Çözünürlüğü', 'text', true),
      c('Optik Görüntü Sabitleyici (OIS)'),
      f('Kamera Özellikleri'),
      f('Flaş'),
      f('Diyafram Açıklığı'),
      f('Odak Uzaklığı'),
      f('Kamera Sensör Boyutu'),
      f('Video Kayıt Çözünürlüğü'),
      f('Video FPS Değeri'),
      f('Video Kayıt Özellikleri'),
      f('Video Kayıt Seçenekleri'),
      f('Ağır Çekim Kayıt Seçenekleri'),
      c('İkinci Arka Kamera'),
      f('İkinci Arka Kamera Çözünürlüğü'),
      f('İkinci Arka Kamera Diyafram'),
      f('İkinci Arka Kamera Özellikleri'),
      c('Üçüncü Arka Kamera'),
      f('Üçüncü Arka Kamera Çözünürlüğü'),
      f('Üçüncü Arka Kamera Diyafram'),
      f('Üçüncü Arka Kamera Özellikleri'),
      f('Ön Kamera Çözünürlüğü'),
      f('Ön Kamera Video Çözünürlüğü'),
      f('Ön Kamera FPS Değeri'),
      f('Ön Kamera Özellikleri'),
    ],
  },
  {
    id: 'temelDonanim',
    tabLabel: 'Temel Donanım',
    title: 'Temel Donanım',
    fields: [
      f('Yonga Seti (Chipset)', 'text', true),
      f('CPU Frekansı'),
      f('CPU Çekirdeği'),
      f('Ana İşlemci (CPU)'),
      f('1. Yardımcı İşlemci'),
      f('İşlemci Mimarisi'),
      f('Grafik İşlemcisi (GPU)'),
      f('GPU Frekansı'),
      f('CPU Üretim Teknolojisi'),
      f('Geekbench 6 (Single-core)'),
      f('Geekbench 6 (Multi-core)'),
    ],
  },
  {
    id: 'ramDepolama',
    tabLabel: 'RAM/Depolama',
    title: 'RAM / Depolama',
    fields: [
      f('Bellek (RAM)', 'text', true),
      f('RAM Tipi'),
      f('Dahili Depolama'),
      f('Dahili Depolama Biçimi'),
      c('Hafıza Kartı Desteği'),
      f('Diğer Bellek (RAM) Seçenekleri'),
      f('Diğer Hafıza Seçenekleri'),
    ],
  },
  {
    id: 'tasarim',
    tabLabel: 'Tasarım',
    title: 'Tasarım',
    fields: [
      f('Boy'),
      f('En'),
      f('Kalınlık'),
      f('Ağırlık'),
      f('Ağırlık Seçenekleri'),
      f('Renk Seçenekleri', 'text', true),
      f('Gövde Malzemesi (Çerçeve)'),
    ],
  },
  {
    id: 'agBaglantilari',
    tabLabel: 'Ağ Bağlantıları',
    title: 'Ağ Bağlantıları',
    fields: [
      c('2G'),
      c('3G'),
      c('4G'),
      f('4G Özellikleri'),
      c('4.5G Desteği'),
      c('5G', true),
    ],
  },
  {
    id: 'isletimSistemi',
    tabLabel: 'İşletim Sistemi',
    title: 'İşletim Sistemi',
    fields: [
      f('İşletim Sistemi'),
      f('İşletim Sistemi Versiyonu', 'text', true),
      f('Kullanıcı Arayüzü'),
      f('Lansman Arayüz Versiyonu'),
    ],
  },
  {
    id: 'kablosuzBaglantilar',
    tabLabel: 'Kablosuz Bağlantılar',
    title: 'Kablosuz Bağlantılar',
    fields: [
      f('Wi-Fi Kanalları', 'text', true),
      f('Wi-Fi Özellikleri'),
      c('NFC'),
      f('Bluetooth Versiyonu'),
      f('Bluetooth Özellikleri'),
      c('Kızılötesi'),
      f('Navigasyon Özellikleri'),
    ],
  },
  {
    id: 'cokluOrtam',
    tabLabel: 'Çoklu Ortam',
    title: 'Çoklu Ortam',
    fields: [
      c('Radyo'),
      f('Hoparlör Özellikleri', 'text', true),
      f('Ses Çıkışı'),
    ],
  },
  {
    id: 'dayaniklilik',
    tabLabel: 'Dayanıklılık',
    title: 'Dayanıklılık Özellikleri',
    fields: [
      c('Suya Dayanıklılık'),
      f('Suya Dayanıklılık Seviyesi', 'text', true),
      c('Toza Dayanıklılık'),
      f('Toza Dayanıklılık Seviyesi'),
    ],
  },
  {
    id: 'sensorServis',
    tabLabel: 'Sensörler ve Servisler',
    title: 'Sensörler ve Servisler',
    fields: [
      c('Görüntülü Konuşma (Uygulama)'),
      f('Sensörler'),
      c('Parmak izi Okuyucu'),
      f('Parmak izi Okuyucu Özellikleri', 'text', true),
      c('Bildirim Işığı (LED)'),
      f('Servis ve Uygulamalar'),
    ],
  },
  {
    id: 'digerBaglantilar',
    tabLabel: 'Diğer Bağlantılar',
    title: 'Diğer Bağlantılar',
    fields: [
      f('USB Versiyonu'),
      f('USB Bağlantı Tipi', 'text', true),
      f('USB Özellikleri'),
      f('Hat Sayısı'),
      f('SIM'),
    ],
  },
  {
    id: 'abEtiket',
    tabLabel: 'AB Etiketi',
    title: 'AB Ürün Kayıt ve Enerji Etiketi',
    fields: [
      f('Enerji Sınıfı'),
      f('Şarj Sonrası Pil Süresi', 'text', true),
      f('Düşme Direnci Sınıfı'),
      f('Onarılabilirlik Sınıfı'),
      f('Şarj Döngü Sayısı (AB)'),
      f('Suya ya da Toza Direnç Sınıfı'),
    ],
  },
  {
    id: 'temelBilgiler',
    tabLabel: 'Temel Bilgiler',
    title: 'Temel Bilgiler',
    fields: [
      f('Çıkış Yılı'),
      f('Duyurulma Tarihi', 'text', true),
      f('Seri'),
    ],
  },
];

export const getCardField = (section: SectionConfig) =>
  section.fields.filter(fld => fld.isCard).slice(-1)[0] || section.fields[0];
