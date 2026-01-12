Grupanya Task Modülü — GitHub → Canlı Deploy Rehberi

Genel Akış
- API (NestJS) Render üzerinde çalışır (Postgres + Redis ile). Blueprint dosyası: `render.yaml`.
- Web (Next.js) Vercel üzerinde çalışır. GitHub Actions ile otomatik deploy.

Ön Koşullar
1) Bu repoyu GitHub’a push edin.
2) Render hesabınız (free plan yeterli) ve Vercel hesabınız olmalı.

API (Render) — Blueprint ile Kurulum
Render free plan sınırlaması: hesap başına yalnızca 1 ücretsiz Postgres ve 1 ücretsiz Redis. Bu nedenle blueprint artık DB/Redis oluşturmaz.
1) Render Dashboard → New → Blueprint → GitHub repo’yu seçin.
2) `render.yaml` otomatik bulunur. Onaylayın ve deploy edin.
   - Oluşacak kaynaklar:
     - Web Service: `grupanya-task-test-api` (apps/api)
     - Web Service: `grupanya-task-test-web` (apps/web)
   - API için env vars:
     - `DATABASE_URL` = SET_IN_DASHBOARD (hazır boşluk). Deploy sonrasında mevcut Postgres’inizin bağlantı adresiyle güncelleyin ve Re-deploy yapın.
     - `DISABLE_JOBS=true`, `CORS_ORIGINS=*` hazır gelir.
3) API env’de `DATABASE_URL`’ü mevcut ücretsiz Postgres bağlantınızla değiştirin (Render → Services → grupanya-task-test-api → Environment → Edit → Deploy).
4) API Health: `https://<api-domain>/api/health`, Swagger: `https://<api-domain>/api/docs`

Not: CORS için `CORS_ORIGINS=*` public demo içindir. Dilerseniz güvence için Vercel domain’i ile sınırlandırın.

Web (Vercel) — GitHub Actions ile Deploy (opsiyonel)
Gerekli GitHub Secrets (repo → Settings → Secrets and variables → Actions → New repository secret):
- `VERCEL_TOKEN`: Vercel kişisel token.
- `VERCEL_ORG_ID`: Vercel Organization ID.
- `VERCEL_PROJECT_ID`: Vercel Project ID (web için).
- `WEB_API_BASE`: Örn. `https://<api-domain>/api` (Render’daki API domain’i).
- `WEB_DEV_USER_ID` (opsiyonel): Örn. `public-viewer`.
- `WEB_DEV_ROLE` (opsiyonel): Örn. `MANAGER`.

İlk Kurulum Seçenekleri:
- Vercel projesini önceden oluşturup Project ID/Org ID’yi alın. Veya `amondnet/vercel-action` ilk koşuda da proje yaratabilir (önerilen: projeyi Vercel’de önceden yaratmak).

Dağıtım
- Branch `main`’e push → `.github/workflows/deploy-web-vercel.yml` tetiklenir ve prod deploy yapılır.
- CI: `.github/workflows/ci.yml` typecheck/test çalıştırır.

Yerel Doğrulama
1) `docker compose up -d`
2) `npm install`
3) `cp apps/api/.env.example apps/api/.env`
4) `npx prisma migrate dev --schema apps/api/prisma/schema.prisma`
5) `npm run dev:api` ve `npm run dev:web`
6) Web: `http://localhost:3000`, API: `http://localhost:3001/api/health`

Notlar
- CORS: Prod’da herkese açık demo için API `CORS_ORIGINS=*` kabul eder. Güvenlik için domain’e özel kısıtlama önerilir.
- Seed/Import: Prod’da CSV seed gerekirse Render Shell’den komutlar çalıştırılabilir.
