---
title: Default module
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
code_clipboard: true
highlight_theme: darkula
headingLevel: 2
generator: "@tarslib/widdershins v4.0.30"

---

# Default module

Rusuh Booking Tiket API

Base URLs:

* <a href="https://dev.your-api-server.com">Develop Env: https://dev.your-api-server.com</a>

# Authentication

- HTTP Authentication, scheme: bearer<br/>Access token JWT sesi akun (22740 detik), diterbitkan GET /auth/verify atau POST /auth/refresh. Satu-satunya kredensial yang menempati slot Authorization. TIDAK dikirim ke endpoint booking/payment sama sekali: sejak v2.4 bookings.account_id diambil dari keterlibatan pada INSERT saat GRANT, bukan dari kredensial klien saat checkout.

* API Key (QueueTokenCookie)
    - Parameter Name: **queue_token**, in: cookie. Cookie HttpOnly queue_token — posisi dalam antrian. Dipakai web, termasuk SSE stream karena EventSource tidak dapat menyetel header request. Mobile memakai X-Queue-Token. Max-Age adalah batas atas: keadaan terminal menghapus kredensialnya lebih cepat, dan CONFIRMED menggantinya dengan nisan settled:{uuid} yang tidak memulihkan apa pun.

* API Key (GrantToken)
    - Parameter Name: **X-Grant-Token**, in: header. Grant slot opaque (gt_...), dari GET /events/{event_id}/queue/me setelah event grant. Membuktikan pemegangnya punya slot, bukan siapa dirinya — tamu mendapatkannya juga. Wajib pada seluruh endpoint booking dan payment. Tersimpan di Redis, jadi satu DEL mencabutnya.

* API Key (QueueTokenHeader)
    - Parameter Name: **X-Queue-Token**, in: header. Token ruang tunggu yang sama, untuk klien mobile tanpa cookie store. Bukan Authorization: slot itu milik sesi akun.

* API Key (ETicketToken)
    - Parameter Name: **t**, in: query. HMAC bertanda tangan atas satu ticket_id + kedaluwarsa, dikirim pada tautan di email e-tiket. Tanpa identitas akun, lingkup satu tiket, berlaku sampai tanggal event + 1 hari. Ada karena FR-26 mengirim tiket ke masing-masing pemegang NIK, dan pemegang NIK umumnya tidak punya akun — rute yang hanya menerima sesi akun membuat tombol di email mereka menjawab 401.

# Authentication

<a id="opIdrequestMagicLink"></a>

## POST Request Magic Link (Login)

POST /auth/magic-link

Mengirim login link ke email.

> Body Parameters

```json
{"email":"you@example.com"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|
|» email|body|string(email)| yes |none|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Login link sent to your email"}}
```

> 429 Response

```json
{"meta":{"code":429,"message":"Please wait before requesting another link"},"data":{"retry_after":60}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Login link sent to email|Inline|
|429|[Too Many Requests](https://tools.ietf.org/html/rfc6585#section-4)|Rate limited|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|

HTTP Status Code **429**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» retry_after|integer|false|none||none|

<a id="opIdresendMagicLink"></a>

## POST Resend Magic Link

POST /auth/magic-link/resend

Kirim ulang login link.

> Body Parameters

```json
{"email":"you@example.com"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|
|» email|body|string(email)| yes |none|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"New login link sent"}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|New login link sent|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|

<a id="opIdverifyMagicLink"></a>

## GET Verify Magic Link Token

GET /auth/verify

Verifikasi token dari link email.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|magic_token|cookie|string| yes |Token dari email link|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Login successful"},"data":{"access_token":"eyJhbG...","refresh_token":"eyJhbG...","expires_in":22740,"user":{"id":"usr_123","email":"you@example.com","nik":"3171xxxxxxxxxx22"},"redirect_context":{"type":"booking","event_id":"evt_konser_a","booking_id":"RB-00912","message":"Booking context restored"}}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Login successful|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Invalid or expired magic token|None|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» access_token|string|false|none||none|
|»» refresh_token|string|false|none||none|
|»» expires_in|integer|false|none||none|
|»» user|object|false|none||none|
|»»» id|string|false|none||none|
|»»» email|string|false|none||none|
|»»» nik|string|false|none||none|
|»» redirect_context|object|false|none||none|
|»»» type|string|false|none||none|
|»»» event_id|string|false|none||none|
|»»» booking_id|string|false|none||none|
|»»» message|string|false|none||none|

### Response Header

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|200|Set-Cookie|string||access_token cookie|

<a id="opIdrefreshSession"></a>

## POST Refresh Session

POST /auth/refresh

Menukar refresh token dengan pasangan token baru.

Access token berlaku 22740 detik (= GRANT_TOKEN_TTL_SECONDS, diturunkan dari perjalanan customer per ADR-005 §7), lebih lama daripada perjalanan maksimum 930 detik — sehingga endpoint ini TIDAK dipanggil di tengah journey. Ia ada untuk sesi berumur hari (refresh token 30 hari), bukan untuk menambal token yang terlalu pendek. Refresh yang gagal di halaman pembayaran akan memutus customer, dan NFR-02 melarangnya.

ROTASI: setiap panggilan mengembalikan refresh token baru dan menghanguskan yang dikirim. Klien wajib mengganti salinan simpanannya; bila tidak, panggilan berikutnya terbaca sebagai pemutaran ulang.

PEMUTARAN ULANG mencabut seluruh keluarga token: token sekali-pakai yang muncul dua kali berarti kredensial bocor, dan yang memegang mata rantai terbaru bisa jadi penyerang (OAuth 2.0 BCP §4.13).

Token dikirim di body, bukan header Authorization — pada endpoint ini ia adalah objek permintaan, dan menjauhkannya dari header itu mencegahnya tercatat oleh proxy yang me-log header.

Requirement: FR-31, BR-09, NFR-02, NFR-07

> Body Parameters

```json
{"refresh_token":"8Kq2mN9vL4wX1yB6cF3dH5jG0aZpR7tS"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|
|» refresh_token|body|string| yes |Refresh token opaque dari GET /auth/verify atau dari panggilan refresh sebelumnya|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Session refreshed"},"data":{"access_token":"eyJhbG...","refresh_token":"wB3nT8kM2pQ7vF1xJ9cL5gH4dZ6yA0sR","expires_in":22740}}
```

> 401 Response

```json
{"meta":{"code":401,"message":"Session ended; please sign in again"},"data":{}}
```

> 400 Response

```json
{
  "meta": {
    "code": 400,
    "message": "refresh_token is required"
  },
  "data": {}
}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Session refreshed|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|VALIDATION_ERROR — field refresh_token kosong atau absen|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|TOKEN_INVALID (token sudah pernah dipakai — seluruh keluarga dicabut — atau akun sudah tidak ada) atau TOKEN_EXPIRED (kedaluwarsa, dicabut, tidak dikenal). Pesannya sama agar penyerang tidak diberi tahu bahwa ia memicu deteksi pencurian.|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» access_token|string|false|none||JWT HS256, berlaku expires_in detik|
|»» refresh_token|string|false|none||Pengganti yang baru — token yang dikirim sudah hangus|
|»» expires_in|integer|false|none||Masa berlaku access token dalam detik|

HTTP Status Code **400**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

HTTP Status Code **401**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

<a id="opIdregisterAccount"></a>

## POST Register Account

POST /auth/register

Buat akun baru dengan email dan NIK.

> Body Parameters

```json
{"email":"alex@example.com","nik":"3171xxxxxxxxxx22","name":"ALEX","consent":{"accepted":true,"policy_version":"2026-10-01"}}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|
|» email|body|string(email)| yes |none|
|» nik|body|string| yes |none|
|» name|body|string| no |none|
|» consent|body|object| yes |none|
|»» accepted|body|boolean| yes |none|
|»» policy_version|body|string| yes |none|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Verification link sent to your email"},"data":{"user_id":"usr_456"}}
```

> 400 Response

```json
{"meta":{"code":400,"message":"NIK must be exactly 16 digits"},"data":{}}
```

> 409 Response

```json
{"meta":{"code":409,"message":"NIK already registered to another account"},"data":{}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Verification link sent|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|NIK already registered|Inline|
|422|[Unprocessable Entity](https://tools.ietf.org/html/rfc2518#section-10.3)|Consent required|None|
|429|[Too Many Requests](https://tools.ietf.org/html/rfc6585#section-4)|Rate limited|None|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» user_id|string|false|none||none|

HTTP Status Code **400**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

HTTP Status Code **409**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

# Accounts

<a id="opIdlistSavedNiks"></a>

## GET List Saved NIKs

GET /accounts/me/saved-niks

NIK tersimpan.

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":{"max_entries":5,"saved_niks":[{"id":"snk_1","nik_masked":"3171********22","label":"Budi","verified_at":"2026-10-20T08:11:00Z","status":"VERIFIED"}]}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|List of saved NIKs|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» max_entries|integer|false|none||none|
|»» saved_niks|[object]|false|none||none|
|»»» id|string|false|none||none|
|»»» nik_masked|string|false|none||none|
|»»» label|string|false|none||none|
|»»» verified_at|string|false|none||none|
|»»» status|string|false|none||none|

<a id="opIdaddSavedNik"></a>

## POST Add Saved NIK

POST /accounts/me/saved-niks

Tambah NIK tersimpan.

> Body Parameters

```json
{"nik":"3171xxxxxxxxxx33","label":"Budi"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|body|body|object| yes |none|
|» nik|body|string| yes |none|
|» label|body|string| yes |none|

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|NIK saved|None|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Conflict|None|

<a id="opIddeleteSavedNik"></a>

## DELETE Delete Saved NIK

DELETE /accounts/me/saved-niks/{id}

Hapus NIK tersimpan.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|id|path|string| yes |none|

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|NIK deleted|None|

# Events

<a id="opIdlistEvents"></a>

## GET List Events

GET /events

Daftar event.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|filter|query|string| no |filter|
|limit|query|integer| no |none|
|offset|query|integer| no |none|

#### Enum

|Name|Value|
|---|---|
|filter|all|
|filter|available|
|filter|upcoming|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success","pagination":{"totalData":2,"totalPage":1,"limit":10,"offset":0}},"data":[{"id":"evt_konser_a","name":"Konser A","category":"LIVE MUSIC","location":{"venue":"GBK","city":"Jakarta"},"date":"2026-12-25","image_url":"https://cdn.rusuh.id/events/konser-a.jpg","status":"SELLING_OUT_FAST","queue_state":"FULL","queue_depth":300000,"queue_capacity":300000,"sale_starts_at":"2026-11-10T02:00:00Z","display":{"enabled":false,"action":"NONE","label_key":"queue_full","badge_key":null},"min_price":500000,"max_price":1500000}]}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|List of events|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|»» pagination|object|false|none||none|
|»»» totalData|integer|false|none||none|
|»»» totalPage|integer|false|none||none|
|»»» limit|integer|false|none||none|
|»»» offset|integer|false|none||none|
|» data|[object]|false|none||none|
|»» id|string|false|none||none|
|»» name|string|false|none||none|
|»» category|string|false|none||none|
|»» location|object|false|none||none|
|»»» venue|string|false|none||none|
|»»» city|string|false|none||none|
|»» date|string|false|none||none|
|»» image_url|string|false|none||none|
|»» status|string|false|none||none|
|»» queue_state|string|false|none||none|
|»» queue_depth|integer|false|none||none|
|»» queue_capacity|integer|false|none||none|
|»» sale_starts_at|string|false|none||none|
|»» display|object|false|none||none|
|»»» enabled|boolean|false|none||none|
|»»» action|string|false|none||none|
|»»» label_key|string|false|none||none|
|»»» badge_key|string¦null|false|none||none|
|»» min_price|integer|false|none||none|
|»» max_price|integer|false|none||none|

<a id="opIdgetEvent"></a>

## GET Get Event Detail

GET /events/{event_id}

Detail event.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|event_id|path|string| yes |none|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":{"id":"evt_konser_a","name":"Konser A","category":"LIVE MUSIC","location":{"venue":"GBK","city":"Jakarta"},"date":"2026-12-25","time":"19:00","image_url":"https://cdn.rusuh.id/events/konser-a.jpg","description":"Energi panggung.","status":"AVAILABLE","queue_state":"OPEN","queue_depth":1248,"queue_capacity":300000,"sale_starts_at":"2026-11-10T02:00:00Z","display":{"enabled":true,"action":"JOIN_QUEUE","label_key":"join_queue","badge_key":null},"ticket_categories":[{"id":"cat_vip","name":"VIP","description":"Lebih dekat.","price":1500000,"available":12,"status":"AVAILABLE"},{"id":"cat_festival","name":"Festival","description":"Area festival.","price":850000,"available":240,"status":"AVAILABLE"},{"id":"cat_tribune","name":"Tribune","description":"Area tribun.","price":500000,"available":0,"status":"SOLD_OUT"}]}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Event detail|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Event not found|None|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» id|string|false|none||none|
|»» name|string|false|none||none|
|»» category|string|false|none||none|
|»» location|object|false|none||none|
|»»» venue|string|false|none||none|
|»»» city|string|false|none||none|
|»» date|string|false|none||none|
|»» time|string|false|none||none|
|»» image_url|string|false|none||none|
|»» description|string|false|none||none|
|»» status|string|false|none||none|
|»» queue_state|string|false|none||none|
|»» queue_depth|integer|false|none||none|
|»» queue_capacity|integer|false|none||none|
|»» sale_starts_at|string|false|none||none|
|»» display|object|false|none||none|
|»»» enabled|boolean|false|none||none|
|»»» action|string|false|none||none|
|»»» label_key|string|false|none||none|
|»»» badge_key|string¦null|false|none||none|
|»» ticket_categories|[object]|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|
|»»» description|string|false|none||none|
|»»» price|integer|false|none||none|
|»»» available|integer|false|none||none|
|»»» status|string|false|none||none|

# Queue

<a id="opIdjoinQueue"></a>

## POST Join Queue

POST /events/{event_id}/queue/join

Join queue.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|event_id|path|string| yes |none|
|X-Device-Id|header|string| no |Acak 128 bit dari klien, disimpan server sebagai HMAC pada keterlibatan dan dicocokkan pada setiap panggilan ber-grant. WAJIB bila tidak login — grant tanpa pengikatan tidak dapat diikat belakangan, jadi tamu yang tidak mengirimnya ditolak DI SINI dengan 400 DEVICE_ID_REQUIRED, bukan nanti.|
|Authorization|header|string| no |Bearer {access_token} bila login. Satu-satunya tempat di jalur antrian yang menerimanya: BR-07 lewat acct:{ev}:{account_id}, dan account_id pada keterlibatan — yang menjadi bookings.account_id pada INSERT saat GRANT.|

> Response Examples

> Joined queue

```json
{"meta":{"code":200,"message":"Successfully joined queue"},"data":{"ticket_no":32748,"now_serving":31500,"position":1248,"estimated_wait_minutes":4,"sse_url":"/queue/stream","event":{"id":"evt_konser_a","name":"Konser A"}}}
```

> 503 Response

```json
{"meta":{"code":503,"message":"Antrian sedang penuh"},"data":{"queue_state":"FULL","queue_capacity":300000}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Joined queue|Inline|
|503|[Service Unavailable](https://tools.ietf.org/html/rfc7231#section-6.6.4)|Queue full|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» ticket_no|integer|false|none||none|
|»» now_serving|integer|false|none||none|
|»» position|integer|false|none||none|
|»» estimated_wait_minutes|integer|false|none||none|
|»» sse_url|string|false|none||none|
|»» event|object|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|

HTTP Status Code **503**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» queue_state|string|false|none||none|
|»» queue_capacity|integer|false|none||none|

### Response Header

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|200|Set-Cookie|string||queue_token cookie|

<a id="opIdqueueStream"></a>

## GET Queue Status Stream (SSE)

GET /events/{event_id}/queue/stream

SSE stream.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|event_id|path|string| yes |none|
|X-Queue-Token|header|string| no |Token ruang tunggu — untuk mobile. Web pakai cookie queue_token, karena EventSource tidak dapat menyetel header request.|

> Response Examples

> SSE stream

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|SSE stream|string|
|410|[Gone](https://tools.ietf.org/html/rfc7231#section-6.5.9)|Sold out|None|

<a id="opIdgetQueueMe"></a>

## GET Get Queue State (Re-entrancy)

GET /events/{event_id}/queue/me

Re-entrancy.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|event_id|path|string| yes |none|
|X-Queue-Token|header|string| no |Token ruang tunggu — untuk mobile. Web memakai cookie queue_token.|
|Authorization|header|string| no |Bearer {access_token} — pemulihan lintas perangkat untuk customer login (cookie hilang, incognito, app di-install ulang). Tamu tidak punya ini.|

> Response Examples

> Queue state

```json
{"meta":{"code":200,"message":"Success"},"data":{"state":"QUEUED","ticket_no":31842,"now_serving":31600}}
```

```json
{"meta":{"code":200,"message":"Success"},"data":{"state":"GRANTED","grant_token":"gt_abc123","booking_expires_at":"2026-10-23T13:15:00Z","server_time":"2026-10-23T13:10:00Z"}}
```

```json
{"meta":{"code":200,"message":"Success"},"data":{"state":"EXPIRED"}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Queue state|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized|None|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» state|string|false|none||none|
|»» ticket_no|integer|false|none||none|
|»» now_serving|integer|false|none||none|

<a id="opIdgetNowServing"></a>

## GET Get Now Serving (Polling Fallback)

GET /events/{event_id}/queue/serving

Polling fallback.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|event_id|path|string| yes |none|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":{"now_serving":31600,"rate_per_min":318,"paused":false,"server_time":"2026-10-24T13:10:00.412Z","poll_after_ms":5000}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Now serving|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» now_serving|integer|false|none||none|
|»» rate_per_min|integer|false|none||none|
|»» paused|boolean|false|none||none|
|»» server_time|string|false|none||none|
|»» poll_after_ms|integer|false|none||none|

# Booking

<a id="opIdgetTicketSelection"></a>

## GET Get Ticket Selection Page

GET /events/{event_id}/tickets

Ticket selection.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|event_id|path|string| yes |none|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":{"event":{"id":"evt_konser_a","name":"Konser A","date":"2026-12-25","venue":"GBK, Jakarta","image_url":"https://cdn.rusuh.id/events/konser-a.jpg"},"session":{"expires_at":"2026-10-23T13:15:00Z","ttl_seconds":287,"server_time":"2026-10-23T13:10:13Z"},"categories":[{"id":"cat_vip","name":"VIP","description":"Lebih dekat.","price":1500000,"available":12,"max_per_order":3},{"id":"cat_festival","name":"Festival","description":"Area festival.","price":850000,"available":240,"max_per_order":3},{"id":"cat_tribune","name":"Tribune","description":"Area tribun.","price":500000,"available":0,"max_per_order":0}],"rules":{"max_tickets_per_order":3,"one_nik_per_ticket":true}}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Ticket categories|Inline|
|401|[Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1)|Unauthorized|None|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» event|object|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|
|»»» date|string|false|none||none|
|»»» venue|string|false|none||none|
|»»» image_url|string|false|none||none|
|»» session|object|false|none||none|
|»»» expires_at|string|false|none||none|
|»»» ttl_seconds|integer|false|none||none|
|»»» server_time|string|false|none||none|
|»» categories|[object]|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|
|»»» description|string|false|none||none|
|»»» price|integer|false|none||none|
|»»» available|integer|false|none||none|
|»»» max_per_order|integer|false|none||none|
|»» rules|object|false|none||none|
|»»» max_tickets_per_order|integer|false|none||none|
|»»» one_nik_per_ticket|boolean|false|none||none|

<a id="opIdcreateBooking"></a>

## POST Create Booking

POST /bookings

Create booking.

> Body Parameters

```json
{"event_id":"evt_konser_a","tickets":[{"category_id":"cat_vip","nik":"3171xxxxxxxxxx22","holder_email":"buyer@example.com"}],"contact_email":"buyer@example.com","terms_version":"2026-10-01"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|
|body|body|object| yes |none|
|» event_id|body|string| yes |none|
|» tickets|body|[object]| yes |none|
|»» category_id|body|string| yes |none|
|»» nik|body|string| yes |none|
|»» holder_email|body|string(email)| yes |none|
|» contact_email|body|string(email)| yes |none|
|» terms_version|body|string| yes |none|

> Response Examples

> 201 Response

```json
{"meta":{"code":201,"message":"Booking created successfully"},"data":{"booking_id":"RB-00912","status":"PENDING_PAYMENT","event":{"id":"evt_konser_a","name":"Konser A","date":"2026-12-25","venue":"GBK, Jakarta"},"tickets":[{"category":"VIP","price":1500000,"nik_masked":"3171********xx22","holder_name":"JOHN DOE"},{"category":"Festival","price":850000,"nik_masked":"3171********xx33","holder_name":"JANE DOE"}],"summary":{"subtotal":2350000,"service_fee":0,"total":2350000},"payment_ttl":{"expires_at":"2026-10-23T13:25:00Z","ttl_seconds":600,"server_time":"2026-10-23T13:15:00Z"},"redirect_url":"/bookings/RB-00912/payment"}}
```

> Validation error

```json
{"meta":{"code":400,"message":"Maximum 3 tickets per order"},"data":{}}
```

> Conflict

```json
{"meta":{"code":409,"message":"NIK sudah digunakan untuk event ini"},"data":{}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Booking created|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Validation error|Inline|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Conflict|Inline|

### Responses Data Schema

HTTP Status Code **201**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» booking_id|string|false|none||none|
|»» status|string|false|none||none|
|»» event|object|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|
|»»» date|string|false|none||none|
|»»» venue|string|false|none||none|
|»» tickets|[object]|false|none||none|
|»»» category|string|false|none||none|
|»»» price|integer|false|none||none|
|»»» nik_masked|string|false|none||none|
|»»» holder_name|string|false|none||none|
|»» summary|object|false|none||none|
|»»» subtotal|integer|false|none||none|
|»»» service_fee|integer|false|none||none|
|»»» total|integer|false|none||none|
|»» payment_ttl|object|false|none||none|
|»»» expires_at|string|false|none||none|
|»»» ttl_seconds|integer|false|none||none|
|»»» server_time|string|false|none||none|
|»» redirect_url|string|false|none||none|

HTTP Status Code **400**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

HTTP Status Code **409**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

<a id="opIdgetBooking"></a>

## GET Get Booking Detail

GET /bookings/{booking_id}

Booking detail.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|booking_id|path|string| yes |none|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|

> Response Examples

> Booking detail

```json
{"meta":{"code":200,"message":"Success"},"data":{"booking_id":"RB-00912","status":"PENDING_PAYMENT","event":{"id":"evt_konser_a","name":"Konser A","date":"2026-12-25","venue":"GBK, Jakarta","image_url":"https://cdn.rusuh.id/events/konser-a.jpg"},"tickets":[{"category":"VIP","price":1500000,"nik_masked":"3171********xx22"}],"summary":{"quantity":1,"price_per_ticket":1500000,"total":1500000},"payment_ttl":{"expires_at":"2026-10-23T13:25:00Z","ttl_seconds":342,"server_time":"2026-10-23T13:19:18Z"}}}
```

```json
{"meta":{"code":200,"message":"Success"},"data":{"booking_id":"RB-00912","status":"PAID","event":{"id":"evt_konser_a","name":"Konser A","date":"2026-12-25","venue":"GBK, Jakarta","image_url":"https://cdn.rusuh.id/events/konser-a.jpg"},"tickets":[{"ticket_id":"TKT-001","category":"VIP","price":1500000,"nik_masked":"3171********xx22","eticket_url":"/tickets/TKT-001/eticket"}],"summary":{"quantity":1,"total":1500000},"paid_at":"2026-10-23T13:20:00Z","payment_method":"Virtual Account"}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Booking detail|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|None|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» booking_id|string|false|none||none|
|»» status|string|false|none||none|
|»» event|object|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|
|»»» date|string|false|none||none|
|»»» venue|string|false|none||none|
|»»» image_url|string|false|none||none|
|»» tickets|[object]|false|none||none|
|»»» category|string|false|none||none|
|»»» price|integer|false|none||none|
|»»» nik_masked|string|false|none||none|
|»» summary|object|false|none||none|
|»»» quantity|integer|false|none||none|
|»»» price_per_ticket|integer|false|none||none|
|»»» total|integer|false|none||none|
|»» payment_ttl|object|false|none||none|
|»»» expires_at|string|false|none||none|
|»»» ttl_seconds|integer|false|none||none|
|»»» server_time|string|false|none||none|

<a id="opIdgetBookingTickets"></a>

## GET Get Booking Tickets

GET /bookings/{booking_id}/tickets

Booking tickets.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|booking_id|path|string| yes |none|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":[{"ticket_id":"TKT-001","category":"VIP","price":1500000,"nik_masked":"3171********xx22","eticket_url":"/tickets/TKT-001/eticket"},{"ticket_id":"TKT-002","category":"Festival","price":850000,"nik_masked":"3171********xx33","eticket_url":"/tickets/TKT-002/eticket"}]}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Tickets in booking|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|[object]|false|none||none|
|»» ticket_id|string|false|none||none|
|»» category|string|false|none||none|
|»» price|integer|false|none||none|
|»» nik_masked|string|false|none||none|
|»» eticket_url|string|false|none||none|

# NIK

<a id="opIdvalidateNik"></a>

## POST Validate NIK

POST /nik/validate

Validate NIK.

> Body Parameters

```json
{"nik":"3171xxxxxxxxxx22"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|
|body|body|object| yes |none|
|» nik|body|string| yes |none|

> Response Examples

> Validation result

```json
{"meta":{"code":200,"message":"NIK is valid"},"data":{"nik":"3171xxxxxxxxxx22","valid":true,"name":"JOHN DOE","status":"ACTIVE","source":"verified"}}
```

```json
{"meta":{"code":200,"message":"NIK not found"},"data":{"nik":"0000000000000000","valid":false,"reason":"NIK_NOT_FOUND"}}
```

> 400 Response

```json
{"meta":{"code":400,"message":"NIK must be exactly 16 digits"},"data":{}}
```

> 429 Response

```json
{"meta":{"code":429,"message":"Please wait before validating another NIK"},"data":{"retry_after":5}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Validation result|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid NIK format|Inline|
|429|[Too Many Requests](https://tools.ietf.org/html/rfc6585#section-4)|Rate limited|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» nik|string|false|none||none|
|»» valid|boolean|false|none||none|
|»» name|string|false|none||none|
|»» status|string|false|none||none|
|»» source|string|false|none||none|

HTTP Status Code **400**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

HTTP Status Code **429**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» retry_after|integer|false|none||none|

# Payment

<a id="opIdgetPaymentMethods"></a>

## GET Get Payment Methods

GET /payments/{booking_id}/methods

Payment methods.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|booking_id|path|string| yes |none|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":{"methods":[{"id":"bank_transfer","name":"Transfer Bank / Virtual Account","description":"Verifikasi otomatis.","icon_url":"https://cdn.rusuh.id/icons/bank.svg","enabled":true,"banks":[{"code":"bca","name":"BCA","icon_url":"https://cdn.rusuh.id/icons/bca.svg"},{"code":"bni","name":"BNI","icon_url":"https://cdn.rusuh.id/icons/bni.svg"},{"code":"bri","name":"BRI","icon_url":"https://cdn.rusuh.id/icons/bri.svg"},{"code":"cimb","name":"CIMB Niaga","icon_url":"https://cdn.rusuh.id/icons/cimb.svg"}]},{"id":"gopay","name":"E-Wallet (GoPay / QRIS)","description":"Scan QR.","icon_url":"https://cdn.rusuh.id/icons/ewallet.svg","enabled":true}]}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Payment methods|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» methods|[object]|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|
|»»» description|string|false|none||none|
|»»» icon_url|string|false|none||none|
|»»» enabled|boolean|false|none||none|
|»»» banks|[object]|false|none||none|
|»»»» code|string|false|none||none|
|»»»» name|string|false|none||none|
|»»»» icon_url|string|false|none||none|

<a id="opIdinitiatePayment"></a>

## POST Initiate Payment

POST /payments/{booking_id}

Initiate payment.

> Body Parameters

```json
{"method":"bank_transfer","bank":"bca"}
```

```json
{"method":"gopay"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|booking_id|path|string| yes |none|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|
|body|body|object| yes |none|
|» method|body|string| yes |none|
|» bank|body|string| no |none|

#### Enum

|Name|Value|
|---|---|
|» method|bank_transfer|
|» method|gopay|
|» bank|bca|
|» bank|bni|
|» bank|bri|
|» bank|cimb|

> Response Examples

> Payment initiated

```json
{"meta":{"code":200,"message":"Payment initiated"},"data":{"payment_id":"RB-00912:1","method":"bank_transfer","status":"PENDING","instructions":{"bank":"bca","va_number":"8801234567890"},"ttl":{"expires_at":"2026-10-25T10:25:00Z","ttl_seconds":540,"server_time":"2026-10-25T10:16:00Z"}}}
```

```json
{"meta":{"code":200,"message":"Payment initiated"},"data":{"payment_id":"RB-00912:1","method":"gopay","status":"PENDING","instructions":{"qr_url":"https://api.midtrans.com/v2/gopay/.../qr-code","deeplink_url":"https://gojek.link/..."},"ttl":{"expires_at":"2026-10-25T10:25:00Z","ttl_seconds":540,"server_time":"2026-10-25T10:16:00Z"}}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Payment initiated|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» payment_id|string|false|none||none|
|»» method|string|false|none||none|
|»» status|string|false|none||none|
|»» instructions|object|false|none||none|
|»»» bank|string|false|none||none|
|»»» va_number|string|false|none||none|
|»» ttl|object|false|none||none|
|»»» expires_at|string|false|none||none|
|»»» ttl_seconds|integer|false|none||none|
|»»» server_time|string|false|none||none|

<a id="opIdretryPayment"></a>

## POST Cancel & Switch Payment Method

POST /payments/{booking_id}/retry

Cancel and switch payment.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|booking_id|path|string| yes |none|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Previous payment cancelled"},"data":{"booking_id":"RB-00912","status":"HELD","attempt":2,"cancelled_order_id":"RB-00912:1","payment_expires_at":"2026-10-25T10:25:00Z","server_time":"2026-10-25T10:23:10Z"}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Payment cancelled|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» booking_id|string|false|none||none|
|»» status|string|false|none||none|
|»» attempt|integer|false|none||none|
|»» cancelled_order_id|string|false|none||none|
|»» payment_expires_at|string|false|none||none|
|»» server_time|string|false|none||none|

<a id="opIdgetPaymentStatus"></a>

## GET Get Payment Status

GET /payments/{booking_id}/status

Payment status.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|booking_id|path|string| yes |none|
|X-Grant-Token|header|string| yes |Grant slot dari GET /queue/me. Wajib — ini yang menjaga endpoint ini.|
|X-Device-Id|header|string| no |Pengikatan device untuk grant anonim — WAJIB bila pemanggil tidak login. Acak 128 bit dari klien; server menyimpan HMAC-nya. Tidak cocok → 401 DEVICE_MISMATCH.|

> Response Examples

> Payment status

```json
{"meta":{"code":200,"message":"Payment pending"},"data":{"status":"PENDING","server_time":"2026-10-23T13:22:00Z","ttl_seconds":180}}
```

```json
{"meta":{"code":200,"message":"Payment successful"},"data":{"status":"PAID","paid_at":"2026-10-23T13:23:00Z","redirect_url":"/bookings/RB-00912/success"}}
```

```json
{"meta":{"code":200,"message":"Payment failed"},"data":{"status":"FAILED","reason":"Kartu ditolak penerbit","can_retry":true,"attempt":2,"payment_expires_at":"2026-10-25T10:25:00Z","server_time":"2026-10-25T10:19:40Z"}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Payment status|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» status|string|false|none||none|
|»» server_time|string|false|none||none|
|»» ttl_seconds|integer|false|none||none|

<a id="opIdpaymentWebhook"></a>

## POST Payment Gateway Webhook

POST /payments/webhook

Payment webhook.

> Body Parameters

```json
{"event_id":"evt_9f2a1c7b","transaction_id":"pay_123","external_id":"RB-00912","status":"PAID","paid_amount":1500000,"paid_at":"2026-10-24T13:23:00Z","payment_method":"va"}
```

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|X-Callback-Signature|header|string| yes |HMAC SHA512|
|body|body|object| yes |none|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Callback processed"},"data":{}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Callback processed|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|

# User

<a id="opIdgetMyTickets"></a>

## GET Get My Tickets

GET /users/me/tickets

My tickets.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|status|query|string| no |Filter|
|limit|query|integer| no |none|
|offset|query|integer| no |none|

#### Enum

|Name|Value|
|---|---|
|status|upcoming|
|status|past|
|status|all|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success","pagination":{"totalData":1,"totalPage":1,"limit":10,"offset":0}},"data":[{"ticket_id":"TKT-001","booking_id":"RB-00912","event":{"id":"evt_konser_a","name":"Konser A","date":"2026-12-25","venue":"GBK","image_url":"https://cdn.rusuh.id/events/konser-a.jpg"},"category":"VIP","price":1500000,"status":"VALID","eticket_url":"/tickets/TKT-001/eticket"}]}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|List of tickets|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|»» pagination|object|false|none||none|
|»»» totalData|integer|false|none||none|
|»»» totalPage|integer|false|none||none|
|»»» limit|integer|false|none||none|
|»»» offset|integer|false|none||none|
|» data|[object]|false|none||none|
|»» ticket_id|string|false|none||none|
|»» booking_id|string|false|none||none|
|»» event|object|false|none||none|
|»»» id|string|false|none||none|
|»»» name|string|false|none||none|
|»»» date|string|false|none||none|
|»»» venue|string|false|none||none|
|»»» image_url|string|false|none||none|
|»» category|string|false|none||none|
|»» price|integer|false|none||none|
|»» status|string|false|none||none|
|»» eticket_url|string|false|none||none|

<a id="opIdgetEticket"></a>

## GET Get E-Ticket

GET /tickets/{ticket_id}/eticket

E-ticket with QR.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|ticket_id|path|string| yes |none|
|t|query|string| no |Token e-tiket dari tautan email. Alternatif Authorization untuk pemegang NIK dan pembeli tamu, yang umumnya tidak punya akun (FR-26).|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":{"ticket_id":"TKT-001","event":{"name":"Konser A","date":"2026-12-25","time":"19:00","venue":"GBK, Jakarta"},"category":"VIP","holder":{"nik_masked":"3171********xx22"},"qr_code":"data:image/png;base64,iVBORw0KGgo...","qr_value":"TKT-001|evt_konser_a|3171xxxxxxxxxx22","instructions":"Tunjukkan QR code dan identitas pemegang saat masuk venue."}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|E-ticket|Inline|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|None|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» ticket_id|string|false|none||none|
|»» event|object|false|none||none|
|»»» name|string|false|none||none|
|»»» date|string|false|none||none|
|»»» time|string|false|none||none|
|»»» venue|string|false|none||none|
|»» category|string|false|none||none|
|»» holder|object|false|none||none|
|»»» nik_masked|string|false|none||none|
|»» qr_code|string|false|none||none|
|»» qr_value|string|false|none||none|
|»» instructions|string|false|none||none|

# Admin

<a id="opIdgetDisputedPayments"></a>

## GET Disputed Payment Reconciliation

GET /admin/reconciliation/disputed

Disputed payments.

### Params

|Name|Location|Type|Required|Description|
|---|---|---|---|---|
|event_id|query|string| yes |none|

> Response Examples

> 200 Response

```json
{"meta":{"code":200,"message":"Success"},"data":{"disputed":[{"booking_id":"RB-00912","order_id":"RB-00912:2","gateway_event_id":"evt_9f2a1c7b","gross_amount":1500000,"payment_type":"bank_transfer","paid_at":"2026-10-26T10:25:48Z","cancelled_at":"2026-10-26T10:25:30Z","contact_email":"buyer@example.com","refund_status":"PENDING_MANUAL"}]}}
```

### Responses

|HTTP Status Code |Meaning|Description|Data schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Disputed payments|Inline|

### Responses Data Schema

HTTP Status Code **200**

|Name|Type|Required|Restrictions|Title|description|
|---|---|---|---|---|---|
|» meta|object|false|none||none|
|»» code|integer|false|none||none|
|»» message|string|false|none||none|
|» data|object|false|none||none|
|»» disputed|[object]|false|none||none|
|»»» booking_id|string|false|none||none|
|»»» order_id|string|false|none||none|
|»»» gateway_event_id|string|false|none||none|
|»»» gross_amount|integer|false|none||none|
|»»» payment_type|string|false|none||none|
|»»» paid_at|string|false|none||none|
|»»» cancelled_at|string|false|none||none|
|»»» contact_email|string|false|none||none|
|»»» refund_status|string|false|none||none|

# Data Schema

