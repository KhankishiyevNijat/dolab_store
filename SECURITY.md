# Təhlükəsizlik qeydləri — Dolab.az

Bu sənəd tətbiqin təhlükəsizlik modelini və əməl olunmalı qaydaları izah edir.

---

## 1. Təhlükəsizliyin əsası: Supabase RLS

Tətbiq tamamilə statikdir və brauzerdən birbaşa Supabase-ə müraciət edir.
Klientdəki **anon** açarı publikdir (dizaynına görə). Bu o deməkdir ki:

> **Verilənlərin yeganə real qoruyucusu Supabase Row Level Security (RLS)
> siyasətləridir.** Klientdəki yoxlamalar (məs. `admin.html` daxilində
> `is_admin` yoxlaması) yalnız UI rahatlığı üçündür — onlar təhlükəsizlik
> sərhədi DEYİL. RLS olmadan istənilən şəxs anon açarı ilə bütün
> verilənləri oxuya/dəyişə bilər.

Hər cədvəldə RLS **aktiv** olmalı və siyasətlər təyin edilməlidir.
Aşağıda tövsiyə olunan nümunə siyasətlər verilib (öz sxeminizə uyğunlaşdırın).

### Köməkçi: admin yoxlaması

```sql
create or replace function public.is_admin()
returns boolean
language sql security definer stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
```

### profiles

```sql
alter table public.profiles enable row level security;

-- Hamı publik profilləri oxuya bilər
create policy "profiles_select" on public.profiles
  for select using (true);

-- İstifadəçi yalnız öz profilini redaktə edə bilər
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- is_admin / is_approved kimi sahələri yalnız admin dəyişə bilər
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());
```

> ⚠️ `is_admin` və `is_approved` sütunlarını adi istifadəçinin update siyasəti
> ilə dəyişə bilməməsinə əmin olun (məs. ayrıca trigger və ya column-level
> qrant). Əks halda istifadəçi özünü admin/təsdiqlənmiş edə bilər.

### products

```sql
alter table public.products enable row level security;

create policy "products_select_active" on public.products
  for select using (is_active = true or auth.uid() = seller_id or public.is_admin());

create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = seller_id);

create policy "products_update_own" on public.products
  for update using (auth.uid() = seller_id or public.is_admin());
```

### favorites / follows / post_likes

```sql
alter table public.favorites enable row level security;
create policy "favorites_own" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### messages

```sql
alter table public.messages enable row level security;

-- Yalnız göndərən və ya qəbul edən görə bilər (+ admin)
create policy "messages_select_participants" on public.messages
  for select using (auth.uid() in (sender_id, receiver_id) or public.is_admin());

create policy "messages_insert_sender" on public.messages
  for insert with check (auth.uid() = sender_id);
```

### contact_messages

```sql
alter table public.contact_messages enable row level security;

-- Hamı göndərə bilər (əlaqə forması), yalnız admin oxuya bilər
create policy "contact_insert_any" on public.contact_messages
  for insert with check (true);
create policy "contact_admin_read" on public.contact_messages
  for select using (public.is_admin());
create policy "contact_admin_update" on public.contact_messages
  for update using (public.is_admin());
```

### blog_posts

```sql
alter table public.blog_posts enable row level security;

create policy "blog_select_published" on public.blog_posts
  for select using (is_verified = true or auth.uid() = author_id or public.is_admin());
create policy "blog_insert_own" on public.blog_posts
  for insert with check (auth.uid() = author_id);
-- is_verified-i yalnız admin dəyişə bilər
create policy "blog_admin_update" on public.blog_posts
  for update using (public.is_admin());
```

### auctions / auction_bids / reviews / posts / post_comments

Eyni prinsip: oxuma əksər hallarda publik, **insert** yalnız `auth.uid()`
sahibi üçün, **update/delete** sahib və ya admin üçün.

### Storage bucket-ləri (`product-images`, `avatars`)

```sql
-- Yükləmə yalnız autentifikasiyalı istifadəçilərə
create policy "uploads_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id in ('product-images','avatars'));

-- İstifadəçi yalnız öz qovluğundakı faylı silə bilər (path: <user_id>/...)
create policy "delete_own_files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images','avatars')
         and (storage.foldername(name))[1] = auth.uid()::text);
```

---

## 2. XSS qarşısının alınması

İstifadəçi və ya DB-dən gələn istənilən məzmun `innerHTML`-ə yazılmazdan əvvəl
`assets/supabase-client.js`-dəki köməkçilərdən keçirilməlidir:

| Köməkçi | Kontekst | Nümunə |
|---------|----------|--------|
| `escapeHtml(v)` | Element məzmunu / atribut dəyəri | `<div>${escapeHtml(p.title)}</div>` |
| `safeUrl(v)` | `src` / `href` (yalnız http(s) və `data:image`) | `<img src="${safeUrl(url)}">` |
| `jsString(v)` | İnline `onclick="fn('...')"` JS sətri | `onclick="open('${jsString(id)}')"` |

**Qaydalar:**

- Yeni `innerHTML` təyinatı əlavə edəndə dəyişəni mütləq uyğun köməkçi ilə sarın.
- Mümkün olduqda `innerHTML` əvəzinə `textContent` istifadə edin.
- `javascript:` URL-ləri `safeUrl` tərəfindən bloklanır — onları keçməyin.

### Bilinən istisna

`blog-post.html`-də `post.content` qəsdən zəngin HTML kimi göstərilir
(formatlaşdırma üçün). Bu, yalnız admin `is_verified = true` təyin etdikdən
sonra publik görünür. Əgər gələcəkdə etibarsız müəlliflərə icazə verilərsə,
bu sahə server tərəfində sanitizasiya olunmalıdır (məs. DOMPurify və ya
HTML sanitizer).

---

## 3. Ümumi tövsiyələr

- `service_role` açarını **heç vaxt** klient koduna qoymayın.
- Admin əməliyyatları (təsdiq, silmə) üçün RLS-in admin yoxlaması olmasına əmin olun.
- Faylların ölçüsünü/tipini həm klientdə, həm də storage siyasətlərində məhdudlaşdırın.
