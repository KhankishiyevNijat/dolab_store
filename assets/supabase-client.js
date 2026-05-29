// ══════════════════════════════════════
// DOLAB.AZ — Supabase Client
// Bütün səhifələr bu faylı import edir
// ══════════════════════════════════════

const SUPABASE_URL = 'https://xgmnwhwcselxiyfzfbtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbW53aHdjc2VseGl5ZnpmYnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDE4MTEsImV4cCI6MjA5MTA3NzgxMX0._C6i5SgkqdnIMPT77-fyh14tgK_I-teLVOcAgk1B5Gk';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth helper: cari user
async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

// ── Auth helper: cari profil
async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await db.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

// ── Nav-ı auth vəziyyətinə görə yenilə
async function updateNavAuth() {
  const user = await getCurrentUser();
  const authBtn = document.getElementById('nav-auth-btn');
  const sellBtn = document.getElementById('nav-sell-btn');
  const profileBtn = document.getElementById('nav-profile-btn');

  if (user) {
    if (authBtn) authBtn.style.display = 'none';
    if (sellBtn) sellBtn.href = 'sell.html';
    if (profileBtn) {
      profileBtn.style.display = 'flex';
      profileBtn.href = 'profile.html';
    }
  } else {
    if (authBtn) authBtn.style.display = 'inline-flex';
    if (profileBtn) profileBtn.href = 'login.html';
  }
}

// ── Auth state dinlə
db.auth.onAuthStateChange(() => {
  updateNavAuth();
});

// ── Məhsul şəkli URL-i al
function getProductImageUrl(path) {
  if (!path) return 'assets/placeholder.png';
  if (path.startsWith('http')) return path;
  const { data } = db.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// ── Qiymət formatı
function formatPrice(price) {
  return '₼' + parseFloat(price).toFixed(0);
}

// ── Vəziyyət adları
const conditionLabels = {
  'new_with_tags': '✨ Yeni, etiketle',
  'excellent':     '⭐ Əla vəziyyət',
  'good':          '👍 Yaxşı vəziyyət',
  'fair':          '✔️ Kafi vəziyyət'
};

// ── Məhsul kartı HTML-i yarat
function createProductCard(product) {
  const img = product.images && product.images.length > 0
    ? getProductImageUrl(product.images[0])
    : null;

  const discount = product.old_price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : null;

  return `
    <a class="card" href="product.html?id=${product.id}">
      <div class="card-img">
        ${img
          ? `<img src="${img}" alt="${product.title}" style="width:100%;height:100%;object-fit:cover;object-position:top;">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:52px;background:linear-gradient(135deg,#f3efe9,#e8d5c4);">👗</div>`
        }
        ${discount ? `<span class="card-badge badge-sale">−${discount}%</span>` : '<span class="card-badge badge-new">Yeni</span>'}
        <div class="fav-btn" onclick="toggleFav(event,'${product.id}')">${product.is_favorited ? '❤️' : '🤍'}</div>
      </div>
      <div class="card-body">
        <div class="card-brand">${product.brand || ''}</div>
        <div class="card-name">${product.title}</div>
        ${product.size ? `<span class="card-size">${product.size}</span>` : ''}
        <div class="card-footer">
          <div>
            <span class="card-price">${formatPrice(product.price)}</span>
            ${product.old_price ? `<span class="card-price-old">${formatPrice(product.old_price)}</span>` : ''}
          </div>
          <span class="card-rating">${product.seller_rating ? '⭐ ' + product.seller_rating : ''}</span>
        </div>
      </div>
    </a>
  `;
}

// ── Favori toggle
async function toggleFav(event, productId) {
  event.preventDefault();
  event.stopPropagation();
  const btn = event.currentTarget;
  const user = await getCurrentUser();
  if (!user) { location.href = 'login.html'; return; }

  const { data: existing } = await db
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await db.from('favorites').delete().eq('id', existing.id);
    btn.textContent = '🤍';
    btn.dataset.fav = '0';
  } else {
    await db.from('favorites').insert({ user_id: user.id, product_id: productId });
    btn.textContent = '❤️';
    btn.dataset.fav = '1';
  }
}
