# CihazInfo — Cihaz Karşılaştırma ve Yönetim Platformu

Demo: https://cihazinfo.vercel.app/

CihazInfo; cihazları filtreleme, karşılaştırma ve detay sayfalarında yorum/puanlama gibi kullanıcı özellikleri sunan, aynı zamanda kapsamlı bir admin paneli ile içerik yönetimini kolaylaştıran bir platformdur. Supabase + React (Vite) + Tailwind/shadcn-ui altyapısıyla geliştirilmiştir.

## Öne Çıkan Özellikler
- Kategori, marka, fiyat ve teknik alanlara göre dinamik filtreleme
- Cihaz karşılaştırma akışı
- Cihaz detay sayfasında yorum sistemi
- 100 üzerinden puanlama + ortalama puan/oy sayısı
- Admin paneli
  - Bekleyen içerik onay/ret
  - Cihaz düzenleme/silme
  - Üye yönetimi (rol, ban)
  - Admin ayarları (kategoriler, bölümler, filtre alanları)
- Supabase Edge Functions ile API

## Teknolojiler
- React + Vite
- Tailwind CSS + shadcn-ui
- Supabase (Auth + Edge Functions + KV/DB)

## Kurulum

### 1) Supabase Proje Bilgileri
Bu repo’da `src/utils/supabase/info.tsx` dosyası **placeholder** olarak bırakıldı. Kendi Supabase bilgilerinle güncelle:

```ts
export const projectId = "YOUR_SUPABASE_PROJECT_ID"
export const publicAnonKey = "YOUR_SUPABASE_ANON_KEY"
```

### 2) NPM Kurulum
```bash
npm install
npm run dev
```

## Supabase Edge Functions
Bu proje Supabase Edge Functions kullanır.

### Secrets (Dashboard)
Supabase Dashboard → Project Settings → Functions → Secrets

Gerekli secret:
- `SERVICE_ROLE_KEY` = **service_role JWT** (eyJ… ile başlayan)

> `SUPABASE_URL` varsayılan olarak edge ortamında mevcut; istersen ayrıca ekleyebilirsin.

### Deploy
```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest secrets set SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_JWT
npx supabase@latest functions deploy make-server-ac750b50
```

## Admin Yetkisi
İlk admin kullanıcısını yapmak için:
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-ac750b50/make-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "ADMIN_EMAIL"}'
```

## Notlar
- Bu repo’da **gizli anahtar** bulunmaz. Lütfen key’leri paylaşma ve commit’leme.
- Prod’da güvenlik için admin endpoint’leri kısıtlanmalıdır.

## Lisans
Bu proje kişisel kullanım için hazırlanmıştır. İstersen bir lisans ekleyebilirsin.
