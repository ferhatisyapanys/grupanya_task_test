# Katkı Rehberi (Grupanya Task Yönetim)

Bu repo NestJS (API) + Next.js (Web) + Prisma (PostgreSQL) kullanır. Aşağıda yerel geliştirme ve veri/seed adımları özetlenmiştir.

## Önkoşullar
- Node.js 18+
- Docker (PostgreSQL/Redis için)

## Geliştirme Ortamı
1) Docker servislerini başlatın:
```
docker compose up -d
```
2) Bağımlılıkları yükleyin (repo kökü):
```
npm install
```
3) API env dosyası (gerekirse):
```
cp apps/api/.env.example apps/api/.env
```
4) Prisma migrate ve client:
```
npx prisma migrate dev --schema apps/api/prisma/schema.prisma
```
5) Uygulamaları başlatın:
```
npm run dev:api
npm run dev:web
```

## Veri/Seed
### Şehir/İlçe (City/District)
Uygulama, City/District seçimlerini Lookup tablosundan besler. CSV’den seed etmek için:
1) `il_ilce.csv` dosyasını repo köküne yerleştirin (kolonlar: `il,ilce`).
2) Seed komutunu çalıştırın:
```
npm --workspace=apps/api run seed:cities
```
- İstanbul otomatik olarak iki CITY olarak bölünür: “İstanbul Avrupa” ve “İstanbul Anadolu”.
- District’ler ilgili CITY’nin `parentId`’si ile ilişkilendirilir.
- Komut idempotent çalışır; eksik parentId’ler de güncellenir.

### Sheets → DB import (opsiyonel)
CSV import için README’deki “CSV Import (Sheets → DB)” bölümünü izleyin.

## Kodlama Notları
- API tarafında DTO’larda `class-validator` + `class-transformer` kullanın. `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` aktif.
- Yeni filtreler/parametreler için ilgili DTO’ları güncellemeyi unutmayın (ör. page/limit/city/district).
- DB şema değişikliklerinde Prisma migrate + generate çalıştırın.
- UI’da City/District seçimleri için mevcut `AsyncSelect` + `/lov` uçlarını kullanın; City değişince District’i resetleyin.

Teşekkürler! Her türlü sorun/öneri için PR’larda kısa bir açıklama ve test adımlarını eklemeyi unutmayın.
