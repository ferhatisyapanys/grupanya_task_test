# TASK YÖNETİM SİSTEMİ - CODEX PROMPT LİSTESİ

## 📋 GENEL BAKIŞ

Bu döküman, Task Yönetim Sistemi yazılımının geliştirilmesi için Codex'e verilecek adım adım prompt'ları içermektedir. Her prompt, belirli bir modül veya özelliği kapsar ve birbirini tamamlayacak şekilde sıralanmıştır.

---

## 🏗️ BÖLÜM 1: PROJE ALTYAPISI VE VERİTABANI

### Prompt 1.1: Proje Kurulumu ve Teknoloji Stack
```
Bir Task Yönetim Sistemi (CRM benzeri) için full-stack web uygulaması oluştur.

Teknoloji Stack:
- Frontend: React.js + TypeScript + TailwindCSS
- Backend: Node.js + Express.js + TypeScript
- Veritabanı: PostgreSQL
- ORM: Prisma
- Authentication: JWT + Refresh Token
- API: RESTful API

Proje yapısını oluştur:
/client (React frontend)
/server (Express backend)
/shared (ortak tipler ve utility'ler)

Temel konfigürasyon dosyalarını hazırla:
- package.json (hem client hem server için)
- tsconfig.json
- .env.example
- docker-compose.yml (PostgreSQL için)
```

### Prompt 1.2: Veritabanı Şeması - Kullanıcı ve Rol Yönetimi
```
PostgreSQL için Prisma şeması oluştur - Kullanıcı ve Rol Yönetimi:

1. User tablosu:
   - id (UUID, primary key)
   - email (unique)
   - password (hashed)
   - firstName
   - lastName
   - roleId (foreign key)
   - isActive (boolean)
   - createdAt
   - updatedAt

2. Role tablosu:
   - id (UUID, primary key)
   - name (enum: ADMIN, MANAGER, TEAM_LEADER, SALESPERSON)
   - permissions (JSON array)
   - createdAt

3. Permission tablosu:
   - id (UUID, primary key)
   - name (string)
   - description
   - module (enum: USER, LEAD, ACCOUNT, TASK, REPORT)

4. RolePermission (many-to-many ilişki tablosu)

İlişkileri tanımla ve migration dosyasını oluştur.
```

### Prompt 1.3: Veritabanı Şeması - Lead Yönetimi
```
PostgreSQL için Prisma şeması oluştur - Lead Yönetimi:

1. Lead tablosu:
   - id (UUID, primary key)
   - companyName (string)
   - contactName (string)
   - email (string)
   - phone (string)
   - source (enum: QUERY, FRESH, COMPETITOR, REFERRAL, OLD_ACCOUNT)
   - status (enum: NEW, CONVERTED, LINKED, REJECTED)
   - convertedToAccountId (nullable, foreign key to Account)
   - linkedToAccountId (nullable, foreign key to Account)
   - notes (text)
   - metadata (JSON - ek bilgiler için)
   - createdAt
   - updatedAt
   - createdById (foreign key to User)

2. LeadActivityLog tablosu:
   - id (UUID)
   - leadId (foreign key)
   - action (enum: CREATED, VIEWED, CONVERTED, LINKED, UPDATED)
   - performedById (foreign key to User)
   - details (JSON)
   - createdAt

İlişkileri tanımla: Lead -> Account (one-to-one nullable), Lead -> User (many-to-one)
```

### Prompt 1.4: Veritabanı Şeması - Account Yönetimi
```
PostgreSQL için Prisma şeması oluştur - Account Yönetimi:

1. Account tablosu:
   - id (UUID, primary key)
   - accountName (string, required)
   - businessName (string, required) - Ticari ünvan
   - accountId (string, unique, auto-generated) - Sistem ID'si
   - status (enum: ACTIVE, PASSIVE)
   - source (enum: QUERY, FRESH_ACCOUNT, COMPETITOR, REFERRAL, OLD_ACCOUNT)
   - category (string) - Hizmet kimliği
   - type (enum: KEY_ACCOUNT, LONG_TAIL)
   - createdAt
   - updatedAt

2. AccountContact tablosu (Business Contact Information):
   - id (UUID)
   - accountId (foreign key)
   - type (enum: BUSINESS, PERSON)
   - name (string)
   - phone (string)
   - email (string)
   - address (text)
   - isPrimary (boolean)

3. AccountNote tablosu:
   - id (UUID)
   - accountId (foreign key)
   - content (text)
   - createdById (foreign key to User)
   - createdAt

4. AccountActivityHistory tablosu:
   - id (UUID)
   - accountId (foreign key)
   - activityType (enum: PROFILE_UPDATE, TASK_OPENED, TASK_CLOSED, LEAD_LINKED, DEAL_CREATED)
   - description (text)
   - metadata (JSON)
   - createdAt
   - createdById (foreign key to User)

İlişkileri tanımla ve indexleri ekle.
```

### Prompt 1.5: Veritabanı Şeması - Task Yönetimi
```
PostgreSQL için Prisma şeması oluştur - Task Yönetimi:

1. TaskList tablosu:
   - id (UUID, primary key)
   - name (string)
   - tag (enum: GENERAL, PROJECT)
   - description (text, nullable)
   - isActive (boolean)
   - createdAt
   - updatedAt
   - createdById (foreign key to User)

2. Task tablosu:
   - id (UUID, primary key)
   - taskId (string, unique, auto-generated) - Görüntülenen Task ID
   - taskListId (foreign key to TaskList)
   - accountId (foreign key to Account)
   - category (enum: ISTANBUL_CORE, ANADOLU_CORE, TRAVEL)
   - type (enum: GENERAL, PROJECT)
   - priority (enum: LOW, MEDIUM, HIGH, CRITICAL)
   - mainCategory (string)
   - subCategory (string)
   - ownerId (foreign key to User, nullable)
   - accountType (enum: KEY_ACCOUNT, LONG_TAIL)
   - source (enum: QUERY, FRESH_ACCOUNT, COMPETITOR, REFERRAL, OLD_ACCOUNT)
   - details (text)
   - createdAt (Task Creation Date)
   - assignedAt (Task Assignment Date, nullable)
   - duration (integer, gün cinsinden)
   - dueDate (datetime, nullable)
   - status (enum: HOT, NOT_HOT, DEAL, COLD)
   - generalStatus (enum: OPEN, CLOSED)
   - followUpDate (datetime, nullable)
   - closedAt (datetime, nullable)
   - closedReason (string, nullable)
   - createdById (foreign key to User)

3. TaskContact tablosu:
   - id (UUID)
   - taskId (foreign key)
   - contactId (foreign key to AccountContact)
   - isPrimary (boolean)

İlişkileri tanımla: Task -> TaskList, Task -> Account, Task -> User (owner ve creator)
```

### Prompt 1.6: Veritabanı Şeması - Activity Log ve Offers
```
PostgreSQL için Prisma şeması oluştur - Salesperson Activity Log ve Offers:

1. SalespersonActivityLog tablosu:
   - id (UUID, primary key)
   - taskId (foreign key to Task)
   - reason (enum: 
       REACHED_AUTHORITY,          // 1. Yetkiliye ulaşıldı
       AUTHORITY_NOT_REACHED,      // 2. Yetkiliye ulaşılamadı
       BUSINESS_NOT_REACHED,       // 3. İşletmeye ulaşılamadı
       OFFER_GIVEN,                // 4. Teklif verildi
       COUNTER_OFFER_RECEIVED,     // 5. İşletme karşı teklif verdi
       OFFER_ACCEPTED,             // 6. Teklif Kabul edildi
       OFFER_REJECTED,             // 7. Teklif Kabul edilmedi
       BUSINESS_NOT_INTERESTED,    // 8. İşletme çalışmak istemiyor
       WE_NOT_INTERESTED,          // 9. Grupanya çalışmak istemiyor
       CALLBACK_SCHEDULED          // 10. Tekrar aranacak
   )
   - freeText (text) - Serbest metin notları
   - callbackDate (datetime, nullable) - reason=CALLBACK_SCHEDULED ise zorunlu
   - createdById (foreign key to User)
   - createdAt

2. Offer tablosu:
   - id (UUID, primary key)
   - taskId (foreign key to Task)
   - activityLogId (foreign key to SalespersonActivityLog, nullable)
   - advertisingFee (decimal) - Reklam bedeli
   - commission (decimal) - Komisyon
   - joker (decimal, nullable) - Joker
   - type (enum: OUR_OFFER, COUNTER_OFFER)
   - status (enum: PENDING, ACCEPTED, REJECTED)
   - notes (text, nullable)
   - createdById (foreign key to User)
   - createdAt

Validasyon kuralları:
- reason OFFER_GIVEN veya COUNTER_OFFER_RECEIVED ise Offer zorunlu
- reason CALLBACK_SCHEDULED ise callbackDate zorunlu
```

### Prompt 1.7: Veritabanı Şeması - Deal ve Fırsat Yönetimi
```
PostgreSQL için Prisma şeması oluştur - Deal/Fırsat Yönetimi:

1. Deal tablosu:
   - id (UUID, primary key)
   - dealId (string, unique, auto-generated) - Fırsat ID'si
   - accountId (foreign key to Account)
   - taskId (foreign key to Task, nullable)
   - title (string) - Fırsat başlığı
   - startDate (datetime) - Yayın başlangıç tarihi
   - endDate (datetime) - Yayın bitiş tarihi
   - lastSalespersonId (foreign key to User) - Son satışçı
   - status (enum: ACTIVE, COMPLETED, CANCELLED)
   - value (decimal) - Fırsat değeri
   - metadata (JSON) - Ek detaylar
   - createdAt
   - updatedAt
   - createdById (foreign key to User)

2. DealHistory tablosu:
   - id (UUID)
   - dealId (foreign key)
   - action (enum: CREATED, STATUS_CHANGED, UPDATED, ASSIGNED)
   - previousValue (JSON)
   - newValue (JSON)
   - performedById (foreign key to User)
   - createdAt

İlişkileri tanımla: Deal -> Account, Deal -> Task, Deal -> User
```

### Prompt 1.8: Veritabanı Şeması - Bildirim Sistemi
```
PostgreSQL için Prisma şeması oluştur - Bildirim Sistemi:

1. TaskNotification tablosu:
   - id (UUID, primary key)
   - taskId (foreign key to Task)
   - message (text) - Bildirim mesajı
   - type (enum: INFO, WARNING, URGENT)
   - isRead (boolean, default: false)
   - targetUserId (foreign key to User) - Bildirimin gönderileceği kullanıcı
   - createdById (foreign key to User) - Bildirimi oluşturan
   - createdAt
   - readAt (datetime, nullable)

2. SystemNotification tablosu:
   - id (UUID)
   - userId (foreign key to User)
   - title (string)
   - message (text)
   - type (enum: TASK_ASSIGNED, TASK_DUE, LEAD_RECEIVED, SYSTEM)
   - isRead (boolean)
   - metadata (JSON)
   - createdAt

Index'ler: targetUserId + isRead, createdAt DESC
```

---

## 🔐 BÖLÜM 2: AUTHENTICATION VE AUTHORIZATION

### Prompt 2.1: Authentication Sistemi
```
JWT tabanlı authentication sistemi oluştur:

1. Auth Controller:
   - POST /api/auth/login - Email/password ile giriş
   - POST /api/auth/logout - Çıkış
   - POST /api/auth/refresh - Token yenileme
   - GET /api/auth/me - Mevcut kullanıcı bilgisi

2. Auth Service:
   - validateCredentials(email, password)
   - generateTokens(userId) - Access token (15dk) + Refresh token (7 gün)
   - verifyToken(token)
   - refreshAccessToken(refreshToken)
   - hashPassword(password) - bcrypt kullan
   - comparePassword(plain, hashed)

3. Auth Middleware:
   - authenticateToken - JWT doğrulama
   - Token'ı header'dan al (Bearer token)
   - Expired token kontrolü
   - User bilgisini request'e ekle

4. Refresh Token Storage:
   - RefreshToken tablosu veya Redis kullan
   - Token blacklist mekanizması

Response format:
{
  accessToken: string,
  refreshToken: string,
  user: { id, email, firstName, lastName, role }
}
```

### Prompt 2.2: Role-Based Access Control (RBAC)
```
Role-Based Access Control sistemi oluştur:

1. Permission Definitions:
   ADMIN:
   - Tüm modüllerde tam yetki
   - Rol yönetimi
   
   MANAGER:
   - Lead: convert, linkup, view, list
   - Account: create, update, view, list, add_task, add_contact, add_note
   - Task: create, assign, update_all, view, list, add_notification
   - Report: full_access, export
   
   TEAM_LEADER:
   - Account: view, list, update_status, add_contact, add_note
   - Task: assign, update_owner, update_priority, update_duration, add_notification, view_team
   - Report: view, export
   
   SALESPERSON:
   - Account: view, list, update_status, add_contact, add_note, create_non_task
   - Task: view_own, update_activity_log, update_offers, update_status, update_followup
   - Report: view_own

2. Authorization Middleware:
   - checkPermission(module, action)
   - checkRole(allowedRoles[])
   - checkTaskOwnership(taskId, userId)
   - checkTeamAccess(userId, targetUserId)

3. Permission Service:
   - hasPermission(userId, module, action)
   - getUserPermissions(userId)
   - canAccessTask(userId, taskId)
   - canModifyField(userId, taskId, fieldName)

4. Field-Level Access Control:
   Task güncelleme için field bazlı yetki kontrolü:
   - SALESPERSON sadece: contact, activityLog, offers, status, followUpDate
   - TEAM_LEADER ek olarak: owner, priority, duration
   - MANAGER: tüm alanlar
```

### Prompt 2.3: Kullanıcı Yönetimi API
```
Kullanıcı Yönetimi API endpoints oluştur:

1. User Controller:
   - GET /api/users - Kullanıcı listesi (filtreleme destekli)
   - GET /api/users/:id - Kullanıcı detayı
   - POST /api/users - Yeni kullanıcı oluştur (Admin only)
   - PUT /api/users/:id - Kullanıcı güncelle
   - DELETE /api/users/:id - Kullanıcı sil/pasifleştir
   - PUT /api/users/:id/role - Rol değiştir (Admin only)
   - GET /api/users/:id/tasks - Kullanıcının taskları
   - GET /api/users/:id/performance - Performans metrikleri

2. User Service:
   - createUser(data) - Şifre hash'le, varsayılan rol ata
   - updateUser(id, data)
   - changeRole(userId, newRoleId)
   - deactivateUser(userId)
   - getUserWithPermissions(userId)
   - getTeamMembers(teamLeaderId)
   - getSalespersonStats(userId, dateRange)

3. Validasyonlar:
   - Email formatı ve uniqueness
   - Şifre complexity (min 8 karakter, harf+rakam)
   - Rol değişikliği için Admin yetkisi kontrolü

4. Query Parameters:
   - role: Role'e göre filtrele
   - isActive: Aktif/Pasif filtresi
   - search: İsim/email'de arama
   - page, limit: Pagination
```

---

## 📊 BÖLÜM 3: LEAD YÖNETİMİ

### Prompt 3.1: Lead API Endpoints
```
Lead Yönetimi API endpoints oluştur:

1. Lead Controller:
   - GET /api/leads - Lead listesi
     Query params: status, source, dateFrom, dateTo, search, page, limit
   - GET /api/leads/:id - Lead detayı
   - POST /api/leads - Yeni lead oluştur (sistem veya manuel)
   - PUT /api/leads/:id - Lead güncelle
   - POST /api/leads/:id/convert - Lead'i Account'a çevir (Convert Lead)
   - POST /api/leads/:id/linkup - Lead'i mevcut Account'a bağla (Linkup Lead)
   - GET /api/leads/:id/history - Lead activity history

2. Lead Service:
   - createLead(data)
   - updateLead(id, data)
   - convertToAccount(leadId, accountData):
     * Yeni Account oluştur
     * Lead status'ü CONVERTED yap
     * Account Activity History'ye log ekle
     * Return: { lead, account }
   - linkupToAccount(leadId, accountId):
     * Lead'i mevcut account'a bağla
     * Lead status'ü LINKED yap
     * Account Activity History'ye log ekle
   - getLeadHistory(leadId)

3. Business Rules:
   - Convert: Sistemde kaydı olmayan lead için
   - Linkup: Sistemde kaydı olan account için gelen lead
   - Her iki işlemde de Account Activity History'ye otomatik log

4. Validation:
   - Zaten convert/link edilmiş lead tekrar işlenemez
   - Linkup için accountId zorunlu ve geçerli olmalı
```

### Prompt 3.2: Lead List Ekranı - Frontend
```
React ile Lead List ekranı oluştur:

1. LeadListPage Component:
   - Tablo görünümü: Lead listesi
   - Kolonlar: ID, Company Name, Contact, Email, Phone, Source, Status, Date, Actions
   - Her satırda: Convert Lead ve Linkup Lead butonları
   - Tarih filtresi (date range picker)
   - Search box
   - Pagination

2. LeadDetailModal Component:
   - Lead detay bilgileri görüntüleme
   - Düzenleme modu
   - Activity history sekmesi

3. ConvertLeadModal Component:
   - Lead bilgilerini göster
   - Account oluşturma formu (pre-filled)
   - Category, Type, Source seçimi
   - Confirm/Cancel butonları

4. LinkupLeadModal Component:
   - Lead bilgilerini göster
   - Account arama/seçme (autocomplete)
   - Seçilen account özet bilgisi
   - Confirm/Cancel butonları

5. State Management (React Query veya Redux):
   - leads: Lead listesi
   - selectedLead: Seçili lead
   - filters: Aktif filtreler
   - pagination: Sayfa bilgisi

6. API Integration:
   - useLeads() hook - Liste çekme
   - useConvertLead() mutation
   - useLinkupLead() mutation
```

---

## 🏢 BÖLÜM 4: ACCOUNT YÖNETİMİ

### Prompt 4.1: Account API Endpoints
```
Account Yönetimi API endpoints oluştur:

1. Account Controller:
   - GET /api/accounts - Account listesi
     Query params: 
       - search (Account Name'de arama)
       - salesperson (Salesperson ID)
       - categoryType
       - accountCategory
       - accountSource
       - accountStatus (ACTIVE/PASSIVE)
       - accountType (KEY_ACCOUNT/LONG_TAIL)
       - taskListTag
       - city
       - district
       - sortBy (name_asc, name_desc, created_asc, created_desc)
       - page, limit
   
   - GET /api/accounts/:id - Account detayı (profil + activity history + deal history + task history)
   - POST /api/accounts - Yeni account oluştur (Create New Account)
   - PUT /api/accounts/:id - Account güncelle
   - PUT /api/accounts/:id/status - Status değiştir (Active/Passive)
   
   - POST /api/accounts/:id/contacts - Contact ekle
   - PUT /api/accounts/:id/contacts/:contactId - Contact güncelle
   - DELETE /api/accounts/:id/contacts/:contactId - Contact sil
   
   - POST /api/accounts/:id/notes - Not ekle
   - GET /api/accounts/:id/notes - Notları listele
   
   - GET /api/accounts/:id/activity-history - Activity History
   - GET /api/accounts/:id/deal-history - Deal History
   - GET /api/accounts/:id/task-history - Task History

2. Account Service:
   - createAccount(data) - accountId otomatik generate et
   - updateAccount(id, data) - Activity History'ye log ekle
   - changeStatus(id, status)
   - addContact(accountId, contactData)
   - addNote(accountId, noteData)
   - getAccountWithRelations(id) - Tüm ilişkili verilerle
   - logActivity(accountId, activityType, description, metadata)
```

### Prompt 4.2: Account ID Generator ve Business Logic
```
Account ID Generator ve iş kuralları servisi oluştur:

1. AccountIdGenerator:
   - Format: ACC-YYYYMM-XXXXX (örn: ACC-202401-00001)
   - Aylık sıralı numara
   - Thread-safe increment
   - generateAccountId() metodu

2. Account Business Rules:
   - validateAccountData(data):
     * accountName zorunlu
     * businessName zorunlu
     * category zorunlu
     * type zorunlu
   
   - canCreateTask(accountId):
     * Account ACTIVE olmalı
     * General task için: Açık task olmamalı VEYA önceki task CLOSED olmalı
     * Project task için: Her zaman açılabilir
   
   - validateStatusChange(account, newStatus):
     * Açık task varken PASSIVE yapılamaz (uyarı ver)

3. Activity History Auto-Logging:
   - Account oluşturulduğunda
   - Profil bilgisi güncellendiğinde
   - Task açıldığında/kapatıldığında
   - Lead bağlandığında (Linkup)
   - Deal oluşturulduğunda

4. Account Search Service:
   - Full-text search on accountName, businessName
   - Filter combination logic
   - Sort implementation
```

### Prompt 4.3: Account List Ekranı - Frontend
```
React ile Account List ekranı oluştur:

1. AccountListPage Component:
   - Search bar (üstte, prominent)
   - Filter panel (collapsible sidebar veya dropdown)
   - Account tablosu
   - Sorting dropdown
   - "Create New Account" butonu
   - Pagination

2. AccountFilters Component:
   Filtreler:
   - Salesperson (dropdown, multi-select)
   - Category Type (dropdown)
   - Account Category (dropdown)
   - Account Source (dropdown: Query, Fresh Account, Rakip, Referans, Old Account)
   - Account Status (dropdown: Active, Passive)
   - Account Type (dropdown: Key Account, Long Tail)
   - Task List Tag (dropdown)
   - Şehir (dropdown with search)
   - İlçe (dropdown, depends on şehir)
   
   Sıralama seçenekleri:
   - A'dan Z'ye
   - Z'den A'ya
   - En yeniden en eskiye
   - En eskiden en yeniye

3. AccountTable Component:
   - Kolonlar: Account Name, Business Name, Status, Type, Category, Source, Created Date, Actions
   - Row click -> Account Detail page
   - Status badge (Active: green, Passive: gray)
   - Type badge (Key Account: gold, Long Tail: blue)

4. CreateAccountModal Component:
   - Form alanları: accountName, businessName, category, type, source, status
   - Contact Information section
   - Validation
   - Submit -> API call -> Liste refresh

5. Hooks:
   - useAccounts(filters, sort, pagination)
   - useCreateAccount()
   - useAccountFilters() - Filter state management
```

### Prompt 4.4: Account Detail Ekranı - Frontend
```
React ile Account Detail ekranı oluştur:

1. AccountDetailPage Component:
   Layout:
   - Header: Account Name, Status badge, Edit button
   - Tab navigation: Profile | Activity History | Deal History | Task History

2. AccountProfileTab Component:
   Sections:
   - Basic Info: Account Name, Business Name, Account ID, Status, Source, Category, Type, Creation Date
   - Business Contact Information (editable list)
   - Contact Person Information (editable list)
   - Notes section (add/view notes)
   
   Edit Mode:
   - Inline editing veya modal
   - Save/Cancel buttons
   - Validation feedback

3. AccountActivityHistoryTab Component:
   - Timeline view
   - Activity type icons
   - Date, description, performed by
   - Infinite scroll veya pagination

4. DealHistoryTab Component:
   - Tablo: Fırsat ID, Başlık, Yayın Tarihi, Son Satışçı, Durum
   - Fırsat ID clickable -> Deal detail modal
   - Filter by status

5. TaskHistoryTab Component:
   - Tablo: Task ID, Status, Creation Date, Owner
   - Task ID clickable -> Task detail modal/page
   - "Task Ekle" butonu (üstte)
   - Açık task varsa notification badge
   - Task notification ekleme butonu (açık tasklar için)

6. AddTaskButton Component:
   - Business rule check: canCreateTask
   - Disabled state with tooltip if task already open (General)
   - Click -> Task creation flow

7. TaskNotificationModal Component:
   - Açık taska bildirim ekleme
   - Message input
   - Type selection (Info, Warning, Urgent)
   - Send to task owner
```

### Prompt 4.5: Contact Management Components
```
Account Contact yönetimi componentleri oluştur:

1. ContactList Component:
   - Business Contacts section
   - Person Contacts section
   - Add button for each section
   - Edit/Delete actions

2. ContactForm Component:
   - Type: Business veya Person
   - Fields: Name, Phone, Email, Address
   - isPrimary checkbox
   - Validation (email format, phone format)

3. ContactCard Component:
   - Contact bilgilerini göster
   - Primary badge
   - Quick actions: Edit, Delete, Set as Primary
   - Click to expand full details

4. AddContactModal Component:
   - ContactForm içerir
   - Account ID otomatik set
   - Save -> API call -> Liste refresh

5. EditContactModal Component:
   - Pre-filled ContactForm
   - Update -> API call

6. Phone/Email formatting utilities:
   - formatPhoneNumber(phone)
   - validateEmail(email)
   - formatPhoneForDisplay(phone)
```

---

## ✅ BÖLÜM 5: TASK YÖNETİMİ

### Prompt 5.1: Task List API Endpoints
```
Task List Yönetimi API endpoints oluştur:

1. TaskList Controller:
   - GET /api/task-lists - Task listelerini getir
     Query params:
       - tag (GENERAL, PROJECT)
       - sortBy (created_asc, created_desc)
       - search
       - page, limit
   
   - GET /api/task-lists/:id - Task list detayı (içindeki tasklar dahil)
   - POST /api/task-lists - Yeni task list oluştur
   - PUT /api/task-lists/:id - Task list güncelle (isim, tag)
   - DELETE /api/task-lists/:id - Task list sil
   - GET /api/task-lists/:id/tasks - Task list içindeki tasklar

2. TaskList Service:
   - createTaskList(data)
   - updateTaskList(id, data)
   - deleteTaskList(id) - İçinde task varsa soft delete veya uyarı
   - getTaskListsWithTaskCount()
   - addTaskToList(taskListId, taskId)
   - removeTaskFromList(taskListId, taskId)

3. Business Rules:
   - Task list silindiğinde içindeki tasklar ne olacak? (Orphan prevention)
   - General tag: Haftalık rutin task listeleri
   - Project tag: Özel dönemler veya stratejik hedef odaklı

4. Response Format:
   {
     id, name, tag, description,
     taskCount: number,
     openTaskCount: number,
     createdAt, updatedAt,
     createdBy: { id, name }
   }
```

### Prompt 5.2: Task API Endpoints
```
Task Yönetimi API endpoints oluştur:

1. Task Controller:
   - GET /api/tasks - Task listesi
     Query params:
       - taskListId
       - owner (salesperson ID)
       - priority (LOW, MEDIUM, HIGH, CRITICAL)
       - mainCategory
       - subCategory
       - accountType (KEY_ACCOUNT, LONG_TAIL)
       - source
       - status (HOT, NOT_HOT, DEAL, COLD)
       - generalStatus (OPEN, CLOSED)
       - page, limit
   
   - GET /api/tasks/:id - Task detayı (tüm ilişkili verilerle)
   - POST /api/tasks - Yeni task oluştur
   - PUT /api/tasks/:id - Task güncelle (field-level authorization)
   - POST /api/tasks/:id/assign - Task ata (owner, duration set)
   - PUT /api/tasks/:id/close - Task kapat
   
   - GET /api/tasks/:id/activity-logs - Activity logları
   - POST /api/tasks/:id/activity-logs - Activity log ekle
   
   - GET /api/tasks/:id/offers - Teklifler
   - POST /api/tasks/:id/offers - Teklif ekle
   
   - POST /api/tasks/:id/notifications - Bildirim ekle

2. Task Service:
   - createTask(data):
     * taskId otomatik generate (TASK-YYYYMM-XXXXX)
     * generalStatus = OPEN
     * Account Activity History'ye log
   
   - assignTask(taskId, ownerId, duration):
     * assignedAt = now()
     * dueDate = assignedAt + duration days
     * Notification gönder
   
   - updateTask(taskId, data, userId):
     * Field-level authorization check
     * Activity log
   
   - closeTask(taskId, reason):
     * generalStatus = CLOSED
     * closedAt = now()
     * Account Activity History'ye log
   
   - autoCloseDueTasks(): // Scheduled job
     * dueDate geçmiş OPEN taskları bul
     * Close with reason "Due Date Passed"
```

### Prompt 5.3: Task Oluşturma Business Logic
```
Task oluşturma iş kuralları ve validasyonları:

1. Task Creation Validation Service:
   - validateTaskCreation(accountId, taskListTag):
     * Account ACTIVE olmalı
     * General task için: canCreateGeneralTask(accountId)
     * Project task için: Her zaman true
   
   - canCreateGeneralTask(accountId):
     * Account'un açık GENERAL task'ı var mı kontrol et
     * Varsa false, yoksa true
     * Son task CLOSED mı kontrol et

2. Task ID Generator:
   - Format: TASK-YYYYMM-XXXXX
   - Aylık sıralı numara
   - generateTaskId() metodu

3. Due Date Calculator:
   - calculateDueDate(assignedAt, duration):
     * İş günü hesaplama (opsiyonel)
     * Tatil günleri exclude (opsiyonel)
     * Return: Date

4. Task Creation Flow:
   Step 1: Account seç veya Account ekranından gel
   Step 2: Task List seç (General veya Project)
   Step 3: Zorunlu alanları doldur:
     - Task Category (ISTANBUL_CORE, ANADOLU_CORE, TRAVEL)
     - Task Type (auto-set from TaskList tag)
     - Task Priority
     - Main Category
     - SubCategory
     - Account Type (auto-fill from Account)
     - Task Source (auto-fill from Account)
     - Task Details
   Step 4: Task oluştur
   Step 5: Otomatik set edilen alanlar:
     - Task ID
     - Task Creation Date
     - General Status = OPEN

5. Auto-fill Logic:
   - Account seçilince: accountType, source otomatik doldur
   - TaskList seçilince: type otomatik doldur
```

### Prompt 5.4: Task Atama ve İşleme Business Logic
```
Task atama ve işleme iş kuralları:

1. Task Assignment Service:
   - assignTask(taskId, assignData):
     * ownerId zorunlu
     * duration zorunlu
     * Yetki kontrolü: MANAGER veya TEAM_LEADER
     * Set: assignedAt, dueDate
     * Send notification to owner
   
   - reassignTask(taskId, newOwnerId):
     * Eski owner'a bildirim
     * Yeni owner'a bildirim
     * Activity log

2. Task Processing (Atanmış taskların işlenmesi):
   - updateTaskByOwner(taskId, userId, data):
     * Ownership check
     * Allowed fields: contact, status, followUpDate
     * Activity log oluştur
   
   - addActivityLog(taskId, userId, logData):
     * Reason validation
     * If OFFER_GIVEN veya COUNTER_OFFER: offer zorunlu
     * If CALLBACK_SCHEDULED: callbackDate zorunlu

3. Task Status Flow:
   - Status transitions:
     * Any -> HOT (İlerleme var)
     * Any -> NOT_HOT (İlerleme yok)
     * Any -> DEAL (Anlaşma sağlandı)
     * Any -> COLD (İlgi yok)
   
   - Close conditions:
     * DEAL veya COLD status'te manuel kapatılabilir
     * Due Date'te otomatik kapanır (status ne olursa olsun)

4. Auto-Close Scheduled Job:
   - Cron: Her gün 00:00
   - Query: generalStatus=OPEN AND dueDate < today
   - Action: Close with reason "Due Date Passed"
   - Log to Account Activity History

5. Notification Triggers:
   - Task assigned -> Owner'a bildirim
   - Due date yaklaşıyor (1 gün kala) -> Owner'a bildirim
   - Task'a notification eklendi -> Owner'a bildirim
   - Task auto-closed -> Owner ve Manager'a bildirim
```

### Prompt 5.5: Activity Log ve Offer Management
```
Activity Log ve Offer yönetimi servisleri:

1. ActivityLog Service:
   - createActivityLog(taskId, userId, data):
     Validation:
     - userId task owner mı kontrol et (SALESPERSON için)
     - Reason enum'da mı kontrol et
     - OFFER_GIVEN/COUNTER_OFFER -> offer data zorunlu
     - CALLBACK_SCHEDULED -> callbackDate zorunlu
     
     Process:
     - Log oluştur
     - If offer required, createOffer() çağır
     - If callback, task.followUpDate güncelle

   - getActivityLogs(taskId):
     * Kronolojik sıralama (desc)
     * Include user info
     * Include related offers

2. Offer Service:
   - createOffer(taskId, activityLogId, offerData):
     * advertisingFee zorunlu
     * commission zorunlu
     * type: OUR_OFFER veya COUNTER_OFFER
     * status: PENDING
   
   - updateOfferStatus(offerId, status):
     * PENDING -> ACCEPTED veya REJECTED
     * If ACCEPTED: task status -> DEAL olabilir
   
   - getOffers(taskId):
     * Tüm teklifleri listele
     * Latest first

3. Activity Log Reasons Enum:
   {
     REACHED_AUTHORITY: { label: "Yetkiliye ulaşıldı", requiresOffer: false },
     AUTHORITY_NOT_REACHED: { label: "Yetkiliye ulaşılamadı", requiresOffer: false },
     BUSINESS_NOT_REACHED: { label: "İşletmeye ulaşılamadı", requiresOffer: false },
     OFFER_GIVEN: { label: "Teklif verildi", requiresOffer: true },
     COUNTER_OFFER_RECEIVED: { label: "İşletme karşı teklif verdi", requiresOffer: true },
     OFFER_ACCEPTED: { label: "Teklif kabul edildi", requiresOffer: false },
     OFFER_REJECTED: { label: "Teklif kabul edilmedi", requiresOffer: false },
     BUSINESS_NOT_INTERESTED: { label: "İşletme çalışmak istemiyor", requiresOffer: false },
     WE_NOT_INTERESTED: { label: "Grupanya çalışmak istemiyor", requiresOffer: false },
     CALLBACK_SCHEDULED: { label: "Tekrar aranacak", requiresOffer: false, requiresDate: true }
   }
```

### Prompt 5.6: Task Lists Ekranı - Frontend
```
React ile Task Lists ekranı oluştur:

1. TaskListsPage Component:
   Layout:
   - Header: "Task Lists" title, "Yeni Task Listesi" butonu
   - Filter bar: Tag filter (General/Project), Sort dropdown
   - Task lists grid/table

2. TaskListCard Component:
   - List name
   - Tag badge (General: blue, Project: purple)
   - Task count (total / open)
   - Created date
   - Actions: Edit name, Delete, View details
   - Click -> TaskListDetailPage

3. CreateTaskListModal:
   - Name input
   - Tag selection (General/Project)
   - Description (optional)
   - Create button

4. EditTaskListModal:
   - Pre-filled name
   - Tag change (with warning if tasks exist)
   - Save/Cancel

5. DeleteTaskListConfirm:
   - Warning message
   - Show task count
   - Confirm/Cancel

6. TaskListDetailPage Component:
   - Header: List name, tag, edit button
   - "Task Ekle" butonu
   - Task table/list view
   - Filters for tasks within list

7. State & Hooks:
   - useTaskLists(filters)
   - useTaskList(id)
   - useCreateTaskList()
   - useUpdateTaskList()
   - useDeleteTaskList()
```

### Prompt 5.7: Task Oluşturma Ekranı - Frontend
```
React ile Task Oluşturma ekranı/modal oluştur:

1. CreateTaskPage/Modal Component:
   Multi-step form veya single form:
   
   Step/Section 1 - Account Selection:
   - Account search/select (if not pre-selected)
   - Show account summary when selected
   
   Step/Section 2 - Task List Selection:
   - TaskList dropdown
   - Show tag (General/Project)
   - Warning if General and open task exists
   
   Step/Section 3 - Task Details:
   Form fields:
   - Task Category* (dropdown: İstanbul Core, Anadolu Core, Travel)
   - Task Type (auto-filled, disabled)
   - Task Priority* (dropdown: Low, Medium, High, Critical)
   - Main Category* (dropdown)
   - SubCategory* (dropdown, depends on Main Category)
   - Account Type (auto-filled from account, disabled)
   - Task Source (auto-filled from account, disabled)
   - Task Details* (textarea)
   - Contact selection (from account contacts)

2. Form Validation:
   - All required fields check
   - Business rule validation (canCreateTask)
   - Real-time validation feedback

3. Submit Flow:
   - Show loading state
   - Create task API call
   - Success: Redirect to task detail or list
   - Error: Show error message

4. Auto-fill Logic:
   - Account selected -> accountType, source filled
   - TaskList selected -> type filled
   - MainCategory selected -> SubCategory options updated

5. Category/SubCategory Data:
   - Fetch from API or use static data
   - Cascading dropdown logic
```

### Prompt 5.8: Task Atama Ekranı - Frontend
```
React ile Task Atama ekranı/component oluştur:

1. TaskAssignmentPanel Component:
   Unassigned tasks table içinde veya ayrı modal:
   
   - Task summary display
   - Owner selection (dropdown with salesperson list)
   - Duration input (gün sayısı)
   - Due Date preview (calculated)
   - Assign button

2. AssignTaskModal Component:
   - Task info header
   - Owner dropdown:
     * Filter by team (for Team Leader)
     * All salespersons (for Manager)
     * Search/filter capability
   - Duration input (number, min: 1)
   - Calculated Due Date display
   - Notes field (optional)
   - Assign/Cancel buttons

3. BulkAssignmentPanel Component (optional):
   - Checkbox selection on task list
   - Bulk assign to same owner
   - Same duration for all
   - Assign selected button

4. UnassignedTasksList Component:
   - Filter: ownerId = null
   - Show task list name, account, priority
   - Quick assign button per row

5. Assignment Validation:
   - Owner required
   - Duration > 0
   - Permission check (Manager/Team Leader only)

6. Post-Assignment:
   - Refresh task list
   - Show success message
   - Owner receives notification
```

### Prompt 5.9: Task İşleme Ekranı - Frontend (Salesperson View)
```
React ile Salesperson Task İşleme ekranı oluştur:

1. MyTasksPage Component:
   Layout:
   - Header: "Tasklerim"
   - Filter bar
   - Task list/table
   - Task detail panel (side panel or expandable)

2. MyTaskFilters Component:
   - Priority filter (multi-select)
   - Main Category filter
   - SubCategory filter
   - Account Type filter
   - Task Source filter
   - Status filter (HOT, NOT_HOT, DEAL, COLD)
   - Date range filter

3. MyTaskTable Component:
   - Columns: Task ID, Account, Priority, Status, Due Date, Follow Up
   - Priority color coding
   - Status badges
   - Due date warning (red if close/passed)
   - Row click -> Open detail panel

4. TaskProcessingPanel Component (Side panel):
   Sections:
   
   a) Task Info (read-only):
      - Task ID, Account, Category, Priority
      - Details, Due Date
   
   b) Contact Section:
      - Current contact display
      - Change contact button (from account contacts)
   
   c) Activity Log Section:
      - Existing logs list (timeline)
      - Add new log button
   
   d) Offers Section:
      - Existing offers list
      - Add offer (when adding specific log types)
   
   e) Status & Follow Up:
      - Status dropdown (HOT, NOT_HOT, DEAL, COLD)
      - Follow Up Date picker
      - Save button

5. AddActivityLogModal Component:
   - Reason dropdown (10 options)
   - Free text textarea
   - Conditional fields:
     * If OFFER_GIVEN: Show offer form (advertisingFee, commission, joker)
     * If COUNTER_OFFER: Show offer form
     * If CALLBACK_SCHEDULED: Show date picker
   - Add button

6. State Management:
   - useMyTasks(filters)
   - useTaskDetail(id)
   - useAddActivityLog()
   - useUpdateTaskStatus()
```

### Prompt 5.10: Task Detail Modal/Page - Full View
```
React ile Task Detail tam görünüm ekranı oluştur:

1. TaskDetailPage Component:
   Layout:
   - Header: Task ID, Status badges, Action buttons
   - Two-column or tabbed layout

2. TaskInfoSection:
   Read-only fields (most users):
   - Task ID, Task Category, Task Type
   - Priority (badge)
   - Account Name (clickable -> Account detail)
   - Main Category, SubCategory
   - Owner (with avatar/name)
   - Account Type, Task Source
   - Creation Date, Assignment Date
   - Duration, Due Date
   - General Status (OPEN/CLOSED)

   Editable by Manager:
   - All fields editable

   Editable by Team Leader:
   - Owner, Priority, Duration

3. TaskDetailsSection:
   - Task Details text (large textarea for edit)
   - Read-only for Salesperson

4. ContactSection:
   - Primary contact display
   - Contact details (phone, email)
   - Quick call/email buttons
   - Change contact (Salesperson can)

5. ActivityLogSection:
   - Timeline view of all logs
   - Each log: Date, User, Reason, Notes, Related Offer
   - Add log button (for owner or Manager)
   - Owner restriction: Can only add/edit own logs

6. OffersSection:
   - Table: Date, Type, Advertising Fee, Commission, Joker, Status
   - Offer detail expandable
   - Status update (Accept/Reject) for Manager

7. NotificationsSection:
   - Task notifications list
   - Add notification button (Manager/Team Leader)
   - Notification form: Message, Type (Info/Warning/Urgent)

8. TaskActionsBar:
   - Close Task button (if DEAL or COLD)
   - Reassign button (Manager/Team Leader)
   - Add Notification button

9. CloseTaskModal:
   - Confirm closure
   - Select final status
   - Add closing notes
   - Confirm/Cancel
```

---

## 📈 BÖLÜM 6: RAPORLAMA

### Prompt 6.1: Report API Endpoints
```
Raporlama API endpoints oluştur:

1. Report Controller:
   - GET /api/reports/summary - Dashboard özet raporu
     Query params: period (daily, weekly, monthly, yearly)
   
   - GET /api/reports/leads - Lead raporu
     Query params: dateFrom, dateTo, source, status, groupBy
   
   - GET /api/reports/accounts - Account raporu
     Query params: dateFrom, dateTo, category, type, status, groupBy
   
   - GET /api/reports/tasks - Task raporu
     Query params: dateFrom, dateTo, owner, status, priority, category, groupBy
   
   - GET /api/reports/deals - Fırsat raporu
     Query params: dateFrom, dateTo, salesperson, status, groupBy
   
   - GET /api/reports/salesperson/:id - Satışçı performans raporu
     Query params: dateFrom, dateTo
   
   - GET /api/reports/export - Excel export
     Query params: reportType, filters...
     Response: Excel file stream

2. Report Service:
   - getDashboardSummary(period):
     * Lead count (new, converted, linked)
     * Account count (new, active, passive)
     * Task count (open, closed, by status)
     * Deal count (active, completed, value)
     * Performance metrics
   
   - getLeadReport(filters)
   - getAccountReport(filters)
   - getTaskReport(filters)
   - getDealReport(filters)
   - getSalespersonReport(userId, dateRange)
   
   - exportToExcel(reportType, filters, data)

3. Aggregation Queries:
   - Group by date (day, week, month)
   - Group by category
   - Group by salesperson
   - Conversion rates
   - Average durations
```

### Prompt 6.2: Excel Export Service
```
Excel export servisi oluştur (exceljs kullanarak):

1. ExcelExportService:
   - exportLeads(filters):
     Columns: ID, Company, Contact, Email, Phone, Source, Status, Created Date, Converted Date
   
   - exportAccounts(filters):
     Columns: Account ID, Name, Business Name, Status, Type, Category, Source, Created Date
   
   - exportTasks(filters):
     Columns: Task ID, Account, Owner, Category, Priority, Status, Created, Assigned, Due Date, Closed Date
   
   - exportDeals(filters):
     Columns: Deal ID, Account, Title, Start Date, End Date, Salesperson, Status, Value
   
   - exportSalespersonPerformance(filters):
     Columns: Salesperson, Tasks Assigned, Tasks Completed, Deals Closed, Conversion Rate

2. Excel Formatting:
   - Header row styling (bold, background color)
   - Auto column width
   - Date formatting
   - Number formatting for currency
   - Status color coding

3. Large Data Handling:
   - Streaming for large datasets
   - Pagination/chunking
   - Progress indicator

4. Export Utility Functions:
   - formatDateForExcel(date)
   - formatCurrencyForExcel(amount)
   - createWorksheet(data, columns)
   - addFiltersSheet(filters) - Applied filters info
```

### Prompt 6.3: Dashboard ve Report Ekranları - Frontend
```
React ile Dashboard ve Raporlama ekranları oluştur:

1. DashboardPage Component:
   Layout:
   - Period selector (Günlük, Haftalık, Aylık, Yıllık)
   - Summary cards row
   - Charts section
   - Recent activity section

2. SummaryCards Component:
   Cards:
   - Toplam Lead (+ new this period)
   - Aktif Account
   - Açık Task
   - Aktif Deal (+ total value)
   - Conversion Rate

3. DashboardCharts Component:
   Charts (recharts veya chart.js):
   - Lead trend (line chart)
   - Task status distribution (pie chart)
   - Task completion by category (bar chart)
   - Salesperson performance comparison (bar chart)

4. ReportsPage Component:
   Layout:
   - Report type tabs (Lead, Account, Task, Deal, Salesperson)
   - Filter panel
   - Data table
   - Export button
   - Pagination

5. ReportFilters Component:
   Common filters:
   - Date range picker
   - Group by selector
   
   Report-specific filters based on type

6. ReportTable Component:
   - Dynamic columns based on report type
   - Sortable columns
   - Expandable rows for details
   - Summary row at bottom

7. ExportButton Component:
   - Excel'e Aktar button
   - Loading state during export
   - Download file when ready

8. SalespersonReportPage Component:
   - Salesperson selector
   - Performance metrics cards
   - Activity timeline
   - Task/Deal breakdown charts

9. Hooks:
   - useDashboardData(period)
   - useReport(type, filters)
   - useExportReport()
```

### Prompt 6.4: Otomatik Rapor Email Sistemi
```
Periyodik otomatik rapor email sistemi oluştur:

1. ScheduledReportService:
   - generateDailyReport():
     * Günlük özet: New leads, tasks completed, deals closed
     * Cron: Her gün 09:00
   
   - generateWeeklyReport():
     * Haftalık özet: Lead conversion, task completion rate, top performers
     * Cron: Her Pazartesi 09:00
   
   - generateMonthlyReport():
     * Aylık detaylı rapor
     * Cron: Her ayın 1'i 09:00

2. ReportEmailService:
   - sendReportEmail(userId, reportType, reportData):
     * HTML email template
     * Summary in email body
     * Excel attachment

3. Report Templates:
   - DailyReportTemplate
   - WeeklyReportTemplate
   - MonthlyReportTemplate
   
   Include:
   - Summary metrics
   - Trend indicators (up/down)
   - Top items lists
   - Charts as images (opsiyonel)

4. Report Subscription:
   - ReportSubscription model:
     * userId
     * reportType
     * frequency (DAILY, WEEKLY, MONTHLY)
     * isActive
   
   - subscribeToReport(userId, reportType, frequency)
   - unsubscribeFromReport(userId, reportType)
   - getSubscribers(reportType, frequency)

5. Email Queue:
   - Bull queue for email jobs
   - Retry logic
   - Error handling
   - Delivery status tracking
```

---

## 🔔 BÖLÜM 7: BİLDİRİM SİSTEMİ

### Prompt 7.1: Real-time Notification System
```
Real-time bildirim sistemi oluştur (Socket.IO kullanarak):

1. NotificationService:
   - createNotification(data):
     * Save to database
     * Emit to user via socket
   
   - markAsRead(notificationId, userId)
   - markAllAsRead(userId)
   - getUnreadCount(userId)
   - getNotifications(userId, pagination)

2. Socket.IO Setup:
   - Connection authentication (JWT)
   - User rooms (user_{userId})
   - Events:
     * notification:new
     * notification:read
     * notification:count

3. Notification Types & Triggers:
   - TASK_ASSIGNED: Task atandığında owner'a
   - TASK_DUE_SOON: Due date 1 gün kala
   - TASK_OVERDUE: Due date geçtiğinde
   - TASK_NOTIFICATION: Task'a bildirim eklendiğinde
   - LEAD_RECEIVED: Yeni lead geldiğinde (Manager)
   - DEAL_CREATED: Yeni deal oluşturulduğunda

4. NotificationController:
   - GET /api/notifications - Kullanıcının bildirimleri
   - GET /api/notifications/unread-count
   - PUT /api/notifications/:id/read
   - PUT /api/notifications/read-all
   - DELETE /api/notifications/:id

5. Socket Event Handlers:
   - onConnection: Join user room
   - onDisconnect: Leave room
   - emitToUser(userId, event, data)
   - emitToRole(role, event, data)
```

### Prompt 7.2: Notification UI Components - Frontend
```
React ile Notification UI componentleri oluştur:

1. NotificationBell Component:
   - Bell icon in header
   - Unread count badge
   - Click -> Open dropdown/panel

2. NotificationDropdown Component:
   - List of recent notifications
   - Unread highlight
   - Click notification -> Navigate to related item
   - Mark as read on click
   - "Tümünü Okundu İşaretle" button
   - "Tümünü Gör" link

3. NotificationItem Component:
   - Icon based on type
   - Title, message
   - Time ago
   - Unread indicator
   - Click handler

4. NotificationsPage Component:
   - Full notifications list
   - Filter by type
   - Filter by read/unread
   - Pagination
   - Bulk actions

5. Real-time Integration:
   - useSocket() hook for Socket.IO connection
   - useNotifications() hook:
     * Subscribe to notification events
     * Update unread count
     * Show toast on new notification
   
   - NotificationToast component:
     * Pop-up for new notifications
     * Auto-dismiss
     * Click to navigate

6. State Management:
   - notifications: Notification[]
   - unreadCount: number
   - socket: Socket instance
```

---

## 🧪 BÖLÜM 8: TEST VE DEPLOYMENT

### Prompt 8.1: Backend Unit Tests
```
Jest ile backend unit testleri oluştur:

1. Auth Tests (auth.test.ts):
   - Should register new user
   - Should login with valid credentials
   - Should reject invalid credentials
   - Should refresh token
   - Should reject expired token

2. User Tests (user.test.ts):
   - Should create user (Admin only)
   - Should update user
   - Should change role (Admin only)
   - Should get user list with filters

3. Lead Tests (lead.test.ts):
   - Should create lead
   - Should convert lead to account
   - Should linkup lead to existing account
   - Should prevent double conversion

4. Account Tests (account.test.ts):
   - Should create account with unique ID
   - Should update account
   - Should add contact
   - Should log activity on changes

5. Task Tests (task.test.ts):
   - Should create task with generated ID
   - Should prevent General task on open task
   - Should allow Project task on open task
   - Should assign task and set due date
   - Should auto-close on due date

6. Activity Log Tests (activityLog.test.ts):
   - Should create log with valid reason
   - Should require offer for OFFER_GIVEN
   - Should require date for CALLBACK_SCHEDULED

7. Authorization Tests (authorization.test.ts):
   - Should allow Manager to create task
   - Should prevent Salesperson from creating task
   - Should allow Salesperson to update own task status
   - Should prevent Salesperson from updating others' tasks

Test Utilities:
- createTestUser(role)
- createTestAccount()
- createTestTask()
- mockAuthMiddleware(user)
```

### Prompt 8.2: Frontend Tests
```
React Testing Library ile frontend testleri oluştur:

1. Component Tests:
   - LeadList renders correctly
   - AccountList filters work
   - TaskForm validation
   - ActivityLog form conditional fields

2. Integration Tests:
   - Login flow
   - Create account flow
   - Create and assign task flow
   - Add activity log with offer

3. Hook Tests:
   - useAuth hook
   - useLeads hook with filters
   - useNotifications hook

4. E2E Tests (Cypress veya Playwright):
   - Full user login flow
   - Lead to Account conversion
   - Task creation and assignment
   - Task processing by salesperson
   - Report generation and export

Test files:
- LeadList.test.tsx
- AccountForm.test.tsx
- TaskProcessing.test.tsx
- Dashboard.test.tsx
```

### Prompt 8.3: Docker ve Deployment
```
Docker ve deployment konfigürasyonu oluştur:

1. Dockerfile (Backend):
   - Node.js base image
   - Copy package files
   - Install dependencies
   - Build TypeScript
   - Expose port
   - Start command

2. Dockerfile (Frontend):
   - Node.js build stage
   - Nginx serve stage
   - Copy build files
   - Nginx config

3. docker-compose.yml:
   Services:
   - postgres (database)
   - redis (cache, sessions)
   - backend (API)
   - frontend (React app)
   - nginx (reverse proxy)
   
   Networks, volumes, environment variables

4. nginx.conf:
   - Reverse proxy to backend
   - Serve frontend static files
   - SSL configuration
   - Gzip compression

5. Environment Files:
   - .env.development
   - .env.production
   - .env.example

6. CI/CD Pipeline (GitHub Actions):
   - Run tests on PR
   - Build Docker images
   - Push to registry
   - Deploy to server

7. Database Migrations:
   - Migration scripts
   - Seed data for development
   - Production migration strategy
```

---

## 📝 EK PROMPT'LAR

### Prompt E.1: Non-Task Yönetimi
```
Non-Task (Task dışı aktivite) yönetimi ekle:

1. NonTask Model:
   - id (UUID)
   - accountId (foreign key)
   - type (enum: MEETING, CALL, EMAIL, NOTE, OTHER)
   - description (text)
   - date (datetime)
   - createdById (foreign key to User)
   - createdAt

2. NonTask API:
   - POST /api/accounts/:id/non-tasks - Non-task oluştur
   - GET /api/accounts/:id/non-tasks - Non-task listele
   - PUT /api/non-tasks/:id - Güncelle
   - DELETE /api/non-tasks/:id - Sil

3. NonTaskForm Component:
   - Type selection
   - Description
   - Date picker
   - Submit

4. Authorization:
   - Salesperson ve üstü oluşturabilir
   - Sadece oluşturan güncelleyebilir/silebilir
```

### Prompt E.2: Kategori Yönetimi (Admin)
```
Dinamik kategori yönetimi ekle:

1. Category Model:
   - id (UUID)
   - name (string)
   - parentId (nullable, self-reference)
   - type (enum: MAIN, SUB)
   - isActive (boolean)
   - order (integer)

2. Category API:
   - GET /api/categories - Hiyerarşik liste
   - POST /api/categories - Yeni kategori (Admin)
   - PUT /api/categories/:id - Güncelle (Admin)
   - DELETE /api/categories/:id - Sil/Pasifleştir (Admin)

3. CategoryManagementPage (Admin):
   - Tree view of categories
   - Add main category
   - Add sub category
   - Edit/Delete
   - Reorder (drag & drop)

4. CategorySelector Component:
   - Cascading dropdown
   - Main -> Sub selection
   - Used in Task form
```

### Prompt E.3: Audit Log Sistemi
```
Kapsamlı audit log sistemi ekle:

1. AuditLog Model:
   - id (UUID)
   - entityType (enum: USER, LEAD, ACCOUNT, TASK, DEAL)
   - entityId (string)
   - action (enum: CREATE, UPDATE, DELETE, VIEW)
   - userId (foreign key)
   - previousData (JSON)
   - newData (JSON)
   - ipAddress (string)
   - userAgent (string)
   - createdAt

2. AuditLogService:
   - log(entityType, entityId, action, userId, prev, new)
   - getEntityHistory(entityType, entityId)
   - getUserActivity(userId, dateRange)

3. AuditLog Middleware:
   - Auto-log on entity changes
   - Capture request context (IP, user agent)

4. AuditLogViewer Component (Admin):
   - Filter by entity type
   - Filter by user
   - Filter by date range
   - Show changes diff
```

---

## 🚀 UYGULAMA SIRASI

Önerilen geliştirme sırası:

1. **Hafta 1-2: Altyapı**
   - Prompt 1.1 - 1.8 (Proje kurulumu ve veritabanı)
   - Prompt 2.1 - 2.3 (Authentication ve Authorization)

2. **Hafta 3: Lead Yönetimi**
   - Prompt 3.1 - 3.2 (Lead API ve UI)

3. **Hafta 4-5: Account Yönetimi**
   - Prompt 4.1 - 4.5 (Account API ve UI)

4. **Hafta 6-8: Task Yönetimi**
   - Prompt 5.1 - 5.10 (Task API ve UI)

5. **Hafta 9: Raporlama**
   - Prompt 6.1 - 6.4 (Report API ve UI)

6. **Hafta 10: Bildirimler**
   - Prompt 7.1 - 7.2 (Notification sistemi)

7. **Hafta 11-12: Test ve Deployment**
   - Prompt 8.1 - 8.3 (Tests ve Docker)
   - Prompt E.1 - E.3 (Ek özellikler)

---

## 📌 ÖNEMLİ NOTLAR

1. **Her prompt'u sırayla ver** - Önceki adımlar tamamlanmadan sonrakine geçme
2. **Hata kontrolü** - Her adımda üretilen kodu test et
3. **İterasyon** - Gerekirse prompt'u düzenleyip tekrar ver
4. **Bağlam** - Önceki kodları referans olarak ver
5. **Modülerlik** - Her modül bağımsız çalışabilir olmalı
