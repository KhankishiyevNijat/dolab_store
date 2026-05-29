# Dolab.az

İkinci əl geyim üçün marketpleys — Azərbaycan dilində statik veb tətbiqi.
Backend kimi [Supabase](https://supabase.com) (autentifikasiya, Postgres verilənlər
bazası, fayl saxlama) istifadə olunur. Build addımı yoxdur — bütün səhifələr
brauzerdə birbaşa işləyən HTML/CSS/JS fayllarıdır.

## Xüsusiyyətlər

- 🔐 İstifadəçi qeydiyyatı / giriş (e-poçt + parol, Google OAuth)
- 🛍️ Məhsul elanları, kateqoriyalar, axtarış və filtrlər
- ❤️ Sevimlilər (favorites)
- 💬 Alıcı–satıcı mesajlaşması + qiymət təklifləri (offers)
- 🔨 Auksiyonlar (vaxtlı və təklifli)
- 📱 Swipe rejimi (Tinder üslubu kəşf)
- 📝 Bloq (admin təsdiqi ilə)
- 👤 İstifadəçi profilləri və rəylər
- 🛠️ Admin paneli (istifadəçi/elan/bloq/əlaqə idarəetməsi)

## Struktur

| Fayl | Təyinat |
|------|---------|
| `index.html` | Ana səhifə |
| `category.html` | Kateqoriya / axtarış nəticələri |
| `product.html` | Məhsul detalı |
| `sell.html` | Yeni elan yaratmaq |
| `profile.html` | İstifadəçi profili + mesajlar |
| `feed.html` | Sosial lent |
| `swipe.html` | Swipe kəşf rejimi |
| `auction.html` | Auksiyonlar |
| `blog.html`, `blog-post.html` | Bloq |
| `login.html` | Giriş / qeydiyyat |
| `favorites.html` | Sevimlilər |
| `admin.html` | Admin paneli |
| `assets/supabase-client.js` | Paylaşılan Supabase klienti + köməkçi funksiyalar |
| `assets/shared.css` | Paylaşılan stillər |

## Lokal işə salma

Build sistemi olmadığı üçün sadəcə statik server kifayətdir:

```bash
# Python ilə
python3 -m http.server 8000
# və ya Node ilə
npx serve .
```

Sonra brauzerdə `http://localhost:8000` açın.

## Konfiqurasiya

Supabase URL və **anon** açarı `assets/supabase-client.js` faylındadır.
Anon açarı dizaynına görə publikdir — verilənlərin qorunması tamamilə
Supabase **Row Level Security (RLS)** siyasətlərindən asılıdır. Bax: [`SECURITY.md`](SECURITY.md).

> ⚠️ `service_role` açarını **heç vaxt** klient koduna əlavə etməyin.

## Təhlükəsizlik

- İstifadəçi/DB məzmunu DOM-a yazılmazdan əvvəl mütləq
  `escapeHtml()` / `safeUrl()` / `jsString()` köməkçilərindən keçirilməlidir
  (`assets/supabase-client.js`). Detallar üçün [`SECURITY.md`](SECURITY.md).
- Admin paneli yalnız UI səviyyəsində gizlədilir — əsas qoruma RLS-dədir.
