# SpecVault - Modern Telefon Spec Platformu

Modern, premium tasarımlı akıllı telefon özellik keşif platformu. React, Supabase ve Tailwind CSS ile geliştirilmiştir.

## 🚀 Özellikler

- ✨ **Modern Tasarım**: Apple/Samsung lansman etkinliklerinden ilham alan premium arayüz
- 🎨 **Glassmorphism**: Backdrop blur efektleri ve yumuşak gradyanlar
- 🌓 **Dark/Light Mode**: Tema değiştirme desteği
- 📱 **Responsive**: Tüm cihazlarda mükemmel görünüm
- 🔐 **Authentication**: Supabase Auth ile güvenli giriş/kayıt
- 👥 **Community-driven**: Herkes içerik ekleyebilir
- 👑 **Admin Paneli**: İçerik onay/reddetme sistemi
- 🖼️ **Image Carousel**: Çoklu renk seçenekleri için slider
- 💾 **Database**: Supabase KV Store ile veri saklama

## 📁 Sayfa Yapısı

### 🏠 Anasayfa (`/`)
- Hero section
- Özellik kartları
- Onaylanmış telefonların listesi
- Modern landing page tasarımı

### 📱 Telefon Detay (`/phone/:id`)
- Telefon özellikleri (8 kategori)
- Image carousel
- Spec kartları (tıklanabilir)
- Detaylı özellik görünümü (sliding sheet)

### ➕ İçerik Ekleme (`/submit`)
- Yeni telefon ekleme formu
- Resim URL'leri ekleme
- Otomatik admin onayına gönderme
- **Not**: Giriş yapmış kullanıcılar erişebilir

### 👑 Admin Paneli (`/admin`)
- Bekleyen içerikleri görüntüleme
- İçerik onaylama/reddetme
- İstatistikler
- **Not**: Sadece admin rolüne sahip kullanıcılar erişebilir

### 🔐 Giriş/Kayıt (`/login`)
- Email/şifre ile giriş
- Yeni hesap oluşturma
- Tab-based arayüz

## 🎯 Kullanım Kılavuzu

### İlk Kurulum

1. **Kayıt Olun**
   - `/login` sayfasına gidin
   - "Kayıt Ol" tab'ına tıklayın
   - Ad, email ve şifre girin
   - Otomatik giriş yapılır

2. **Admin Olmak**
   - İlk kullanıcıyı admin yapmak için backend'e özel istek atılmalı:
   ```bash
   curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/make-server-ac750b50/make-admin \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [ANON_KEY]" \
     -d '{"email":"your@email.com"}'
   ```
   - Veya Supabase dashboard'tan manuel yapılabilir

### Telefon Eklemek

1. `/submit` sayfasına gidin
2. Formu doldurun:
   - **Marka**: Samsung, Apple, Xiaomi vb.
   - **Model**: Galaxy S24 Ultra vb.
   - **Kısa Açıklama**: 1-2 cümle
   - **Slogan**: Opsiyonel
   - **Fiyat**: $1,199 formatında
   - **Kategori**: FLAGSHIP SERIES vb.
   - **Resimler**: Harici URL'ler (Imgur, hosting vb.)
3. "Gönder" butonuna tıklayın
4. İçerik admin onayını bekler

### Admin Onayı

1. Admin olarak giriş yapın
2. Header'daki "Admin" butonuna tıklayın
3. Bekleyen içerikleri görün
4. "Onayla" veya "Reddet" butonlarına tıklayın
5. Onaylanan içerikler anasayfada görünür

## 🗄️ Veritabanı Yapısı

### KV Store Keys

- `phone:{id}` - Telefon verisi
- `user:{userId}` - Kullanıcı profili
- `phones:approved` - Onaylanan telefon ID'leri
- `phones:pending` - Bekleyen telefon ID'leri

### Phone Object
```javascript
{
  id: string,
  brand: string,
  title: string,
  shortDesc: string,
  tagline: string,
  price: string,
  category: string,
  images: [
    { src: string, alt: string, color: string }
  ],
  specs: SpecData[], // Opsiyonel
  status: 'pending' | 'approved' | 'rejected',
  submittedBy: string,
  submittedAt: string,
  reviewedBy?: string,
  reviewedAt?: string
}
```

## 🎨 Tasarım Özellikleri

- **Glassmorphism**: `backdrop-blur-xl` ve transparent backgrounds
- **Dark Mode First**: Siyah (#000000) arka plan
- **Smooth Animations**: Hover efektleri ve transitions
- **Gradient Accents**: Blue, purple, pink gradyanlar
- **Card-based Layout**: Modern kart tasarımı
- **Premium Typography**: Minimal ve temiz yazı tipleri

## 🔧 Teknik Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS v4.0 + shadcn/ui
- **Backend**: Supabase Edge Functions (Hono)
- **Database**: Supabase KV Store
- **Auth**: Supabase Auth
- **Routing**: React Router v6
- **Notifications**: Sonner (Toast)
- **Icons**: Lucide React

## 📝 API Endpoints

### Public
- `GET /phones` - Onaylanan telefonlar
- `GET /phones/:id` - Tek telefon detayı

### Authenticated
- `POST /phones` - Yeni telefon ekle
- `GET /profile` - Kullanıcı profili

### Admin Only
- `GET /admin/phones/pending` - Bekleyen içerikler
- `POST /admin/phones/:id/approve` - İçerik onayla
- `POST /admin/phones/:id/reject` - İçerik reddet

### Utility
- `POST /signup` - Yeni kullanıcı kaydı
- `POST /make-admin` - Kullanıcıyı admin yap (geliştirme için)

## ⚠️ Önemli Notlar

1. **Resim Yükleme**: Resimler harici bir sunucuda barındırılmalı (Imgur, hosting vb.). Doğrudan URL girilir.

2. **Admin Yetkisi**: İlk admin manuel olarak `/make-admin` endpoint'i ile oluşturulmalıdır.

3. **Email Onayı**: Email sunucusu yapılandırılmamış olduğundan, kayıt otomatik onaylanır.

4. **Spec Ekleme**: Şu anda telefon özellikleri (specs) frontend'den eklenemiyor. Admin panelinden eklenebilir (gelecek güncelleme).

## 🚀 Geliştirme Fikirleri

- [ ] Spec ekleme/düzenleme formu
- [ ] Kullanıcı profil sayfası
- [ ] Telefon karşılaştırma özelliği
- [ ] Gelişmiş arama ve filtreleme
- [ ] Resim upload (Supabase Storage)
- [ ] Yorum/değerlendirme sistemi
- [ ] Social sharing
- [ ] Dark/light mode görselleri

## 📄 Lisans

© 2024 SpecVault. Tüm hakları saklıdır.
