# Grupanya Task Yönetim Monorepo

Web tabanlı “Task Yönetim Modülü” için monorepo iskeleti.

## Yapı
- `apps/api`: NestJS tabanlı REST API (Prisma/PostgreSQL, Redis hazır)
- `apps/web`: Next.js 14 (App Router) arayüzü
- `packages/ui`: Paylaşılan basit UI bileşenleri
- `packages/config`: Ortak tsconfig

## Başlangıç
1) Docker servislerini başlat:
```
docker compose up -d
```
2) Bağımlılıkları yükle (root’ta):
```
npm install
```
3) API için env dosyası oluştur:
```
cp apps/api/.env.example apps/api/.env
```
4) Prisma migrate ve client (opsiyonel, ilk kurulumda):
```
npx prisma migrate dev --schema apps/api/prisma/schema.prisma
```
5) Geliştirme modunda çalıştır:
```
npm run dev:api
npm run dev:web
```
- API: http://localhost:3001/api/health
- WEB: http://localhost:3000/

## Notlar
- RBAC, detaylı şema ve iş kuralları sonraki adımlarda eklenecek.
- `docker-compose.yml` Postgres (5432) ve Redis (6379) kurar.

### Şehir/İlçe (City/District) Seed
Uygulamadaki City/District seçimleri Lookup tablosundan beslenir. CSV’den seed etmek için:

1) Docker servislerini başlatın:
```
docker compose up -d
```
2) CSV dosyası repo kökünde olmalı: `il_ilce.csv` (kolonlar: `il,ilce`).
3) Seed komutu (app/env yüklü olmalı):
```
npm --workspace=apps/api run seed:cities
```
Bu komut CITY ve DISTRICT değerlerini `Lookup` tablosuna yazar. İstanbul iki şehir olarak bölünür: “İstanbul Avrupa” ve “İstanbul Anadolu”. DISTRICT’ler ilgili CITY’nin `parentId`’si ile ilişkilendirilir.

## OpenAPI ve SDK
- Swagger UI: `http://localhost:3001/api/docs`
- JSON: `http://localhost:3001/api/docs-json`
- Basit TypeScript SDK: `packages/sdk` altında. Kullanım örneği:
```
import { GrupanyaSDK } from '@grupanya/sdk'
const sdk = new GrupanyaSDK({ baseUrl: 'http://localhost:3001/api', headers: { 'x-user-role': 'MANAGER' } })
const leads = await sdk.leadsList()
```

## RBAC (Geliştirme Kolaylığı)
API, gerçek kimlik doğrulama eklenene kadar geliştime amaçlı bir middleware ile `req.user` bilgisini şu HTTP header’larından üretir:
- `x-user-id`
- `x-user-email`
- `x-user-role` (ADMIN | MANAGER | TEAM_LEADER | SALESPERSON)

En az rol şartı için `@MinRole()` dekoratörü kullanılır. Örnekler:
- `GET /api/users/me` → SALESPERSON ve üzeri
- `GET /api/admin/ping` → ADMIN ve üzeri

Örnek istek:
```
curl -H "x-user-id: u1" -H "x-user-role: MANAGER" http://localhost:3001/api/users/me
```

## Hata Formatı ve Loglama
- Tüm hatalar standart bir gövde ile döner:
```
{
  "error": { "message": "...", "status": 400, "code": 400, "details": {} },
  "path": "/api/...",
  "method": "GET",
  "requestId": "<uuid>",
  "timestamp": "..."
}
```
- Her isteğe `x-request-id` atanır ve response header’ına yazılır.
- Basit erişim logları (method/url/status/ms) konsola JSON olarak düşer.

## Örnek API Çağrıları

Leads
- Liste: `curl -H "x-user-role: MANAGER" "http://localhost:3001/api/leads?from=2024-01-01&to=2025-12-31"`
- Detay: `curl -H "x-user-role: MANAGER" http://localhost:3001/api/leads/<leadId>`
- Convert: `curl -X POST -H "Content-Type: application/json" -H "x-user-role: MANAGER" \
  -d '{"leadId":"<id>","account":{"accountName":"ACME","businessName":"ACME LTD","category":"Food","type":"LONG_TAIL","source":"QUERY","status":"ACTIVE"}}' \
  http://localhost:3001/api/leads/convert`
- Linkup: `curl -X POST -H "Content-Type: application/json" -H "x-user-role: MANAGER" \
  -d '{"leadId":"<id>","accountId":"<accountId>"}' http://localhost:3001/api/leads/linkup`

Accounts
- Liste: `curl -H "x-user-role: SALESPERSON" "http://localhost:3001/api/accounts?q=acme&sort=newest"`
- Detay: `curl -H "x-user-role: SALESPERSON" http://localhost:3001/api/accounts/<accountId>`
- Oluştur: `curl -X POST -H "Content-Type: application/json" -H "x-user-role: MANAGER" -d '{"accountName":"ACME","businessName":"ACME LTD","category":"Food","source":"QUERY","type":"LONG_TAIL","status":"ACTIVE"}' http://localhost:3001/api/accounts`
- Güncelle: `curl -X PATCH -H "Content-Type: application/json" -H "x-user-role: MANAGER" -d '{"notes":"Güncellendi"}' http://localhost:3001/api/accounts/<accountId>`
- TaskList
  - Liste: `curl -H "x-user-role: SALESPERSON" http://localhost:3001/api/tasklists`
  - Oluştur: `curl -X POST -H "Content-Type: application/json" -H "x-user-role: TEAM_LEADER" -d '{"name":"Haftalık","tag":"GENERAL"}' http://localhost:3001/api/tasklists`
  - Güncelle: `curl -X PATCH -H "Content-Type: application/json" -H "x-user-role: TEAM_LEADER" -d '{"name":"Genel"}' http://localhost:3001/api/tasklists/<id>`
  - Sil: `curl -X DELETE -H "x-user-role: TEAM_LEADER" http://localhost:3001/api/tasklists/<id>`

Tasks
- Oluştur (General için açık task tekillik kuralı uygulanır):
```
curl -X POST -H "Content-Type: application/json" -H "x-user-role: TEAM_LEADER" \
  -d '{
    "taskListId":"<taskListId>",
    "accountId":"<accountId>",
    "category":"ISTANBUL_CORE","type":"GENERAL","priority":"MEDIUM",
    "accountType":"LONG_TAIL","source":"QUERY",
    "mainCategory":"Food","subCategory":"Cafe",
    "details":"İlk arama"
  }' http://localhost:3001/api/tasks
```
- Atama: `curl -X POST -H "Content-Type: application/json" -H "x-user-role: TEAM_LEADER" -d '{"ownerId":"u1","durationDays":7}' http://localhost:3001/api/tasks/<taskId>/assign`
- Salesperson Aktivite: `curl -X POST -H "Content-Type: application/json" -H "x-user-id: u1" -H "x-user-role: SALESPERSON" -d '{"reason":"TEKRAR_ARANACAK","followUpDate":"2025-12-31"}' http://localhost:3001/api/tasks/<taskId>/activity`
- Durum/Kapatma: `curl -X PATCH -H "Content-Type: application/json" -H "x-user-id: u1" -H "x-user-role: SALESPERSON" -d '{"status":"DEAL","close":true}' http://localhost:3001/api/tasks/<taskId>/status`

Notifications
- Liste (benim): `curl -H "x-user-id: u1" -H "x-user-role: SALESPERSON" http://localhost:3001/api/notifications/me`
- Okundu işaretle: `curl -X PATCH -H "x-user-role: SALESPERSON" http://localhost:3001/api/notifications/<id>/read`

## Zamanlanmış İşler
- Overdue task auto-close: her dakika çalışır (dev için). `DUE_DATE_PASSED` olarak ActivityHistory’ye log düşer ve owner’a bildirim yazılır.

Reports
- Özet: `curl -H "x-user-role: MANAGER" http://localhost:3001/api/reports/summary`
- Tasks CSV: `curl -H "x-user-role: MANAGER" -L -o tasks.csv "http://localhost:3001/api/reports/tasks.csv?status=HOT"`
- Accounts CSV: `curl -H "x-user-role: MANAGER" -L -o accounts.csv http://localhost:3001/api/reports/accounts.csv`
- CSV Import (Sheets → DB)
  1) Google Sheets dosyalarınızı CSV olarak dışa aktarın ve `artifacts/import/` altına aşağıdaki adlarla yerleştirin (gerekli olanları):
     - `users.csv` (email,name,role)
     - `accounts.csv` (externalId,accountName,businessName,status,source,category,type,creationDate,businessContact,contactPerson,notes)
     - `leads.csv` (externalId,createdAt,accountName,businessName,category,payloadJson,linkedAccountName)
     - `tasklists.csv` (name,tag)
     - `tasks.csv` (externalId,taskListName,accountName,ownerEmail,category,type,priority,accountType,source,mainCategory,subCategory,contact,details,creationDate,assignmentDate,durationDays,dueDate,status,generalStatus)
     - `activity_logs.csv` (taskExternalId,authorEmail,reason,followUpDate,text,createdAt,adFee,commission,joker)
     - `offers.csv` (taskExternalId,adFee,commission,joker)
  2) Import komutu:
```
npm --workspace=apps/api run import:sheets -- ./artifacts/import
```
  - `--dry` opsiyonu kuru çalıştırma yapar (yazmadan sayar).
  - Eşleşme stratejisi: accounts by `accountName`, users by `email`, lists by `name`, tasks ilişkileri `taskListName` + `accountName` üzerinden, log/offer ise `taskExternalId` eşleştirmesiyle yapılır.
