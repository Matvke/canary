# Backend Checklist для Canary PWA

Этот документ описывает, что нужно от backend, чтобы клиент работал без demo fallback и без legacy-адаптеров.

## Текущее состояние клиента

Клиент не только на моках.

Порядок загрузки плана:

1. `GET /inspection-plans/today`
2. Если не получилось или формат не подходит: legacy fallback `GET /api/v1/inspection-plans/` + `GET /api/v1/equipment/:id`
3. Если backend недоступен и пользователь offline: локальный demo-plan из IndexedDB

Порядок отправки результата:

1. Фото уходят через `POST /upload-photo`
2. Результат уходит через `POST /inspection-results`
3. Если `POST /inspection-results` не сработал: legacy fallback `POST /api/v1/inspections/`

Для production-интеграции backend должен реализовать новые endpoints ниже.

## Обязательные backend-задачи

- [ ] Реализовать `GET /inspection-plans/today`
- [ ] Реализовать `POST /upload-photo`
- [ ] Реализовать `POST /inspection-results`
- [ ] Поддержать idempotency по `local_id` для результатов осмотра
- [ ] Поддержать idempotency по `photo_id` или связке `draft_id + photo_id` для фото
- [ ] Разрешить CORS для origin клиента, например `http://localhost:8080`
- [ ] Вернуть QR-код оборудования в плане как `expectedQrCode`
- [ ] Вернуть приоритет оборудования как `high | medium | low`
- [ ] Вернуть динамический checklist template или согласовать фиксированные `checklistTemplateId`
- [ ] Принимать результаты, созданные offline и отправленные позже
- [ ] Не требовать синхронного ожидания результата на UI: клиент сохраняет локально и уходит дальше
- [ ] Возвращать стабильные JSON-ошибки для 4xx/5xx

## Runtime config клиента

Docker-контейнер клиента читает API URL из переменной окружения:

```bash
API_BASE_URL=http://localhost:8000
```

Если `API_BASE_URL` пустой, клиент делает запросы на тот же origin.

## 1. Получение плана на сегодня

```http
GET /inspection-plans/today
```

### Ответ 200

```json
{
  "id": "plan-2026-04-17-shift-a",
  "date": "2026-04-17",
  "items": [
    {
      "id": 101,
      "equipmentId": 101,
      "name": "Насос ПН-101",
      "location": "Корпус А, секция 1",
      "expectedQrCode": "CANARY-EQ-101",
      "priority": "high",
      "status": "operational",
      "checklistTemplateId": "pump-station",
      "checklist": {
        "id": "pump-station",
        "name": "Насосная станция",
        "version": 1,
        "items": [
          {
            "id": "temperature",
            "label": "Температура корпуса",
            "type": "number",
            "required": true,
            "range": {
              "min": 15,
              "max": 90,
              "unit": "°C"
            }
          },
          {
            "id": "lubrication",
            "label": "Смазка",
            "type": "select",
            "required": true,
            "options": [
              {
                "value": "ok",
                "label": "Норма"
              },
              {
                "value": "low",
                "label": "Низкий уровень"
              }
            ]
          },
          {
            "id": "leak",
            "label": "Есть подтёк",
            "type": "boolean",
            "required": true
          },
          {
            "id": "comment",
            "label": "Комментарий",
            "type": "text",
            "required": false
          }
        ]
      }
    }
  ]
}
```

### Минимально допустимый формат сейчас

Клиент уже умеет читать упрощённый ответ, если `items` есть на верхнем уровне:

```json
{
  "id": "plan-2026-04-17",
  "date": "2026-04-17",
  "items": [
    {
      "id": 101,
      "name": "Насос ПН-101",
      "location": "Корпус А",
      "expectedQrCode": "CANARY-EQ-101",
      "priority": "high",
      "checklistTemplateId": "pump-station"
    }
  ]
}
```

Но для полноценной динамики backend должен отдавать `checklist`.

## 2. Checklist contract

Типы полей:

```text
number | select | boolean | text
```

Общие поля item:

```json
{
  "id": "temperature",
  "label": "Температура корпуса",
  "type": "number",
  "required": true,
  "hint": "Вне диапазона осмотр нельзя завершить.",
  "placeholder": "Введите значение"
}
```

Для `number`:

```json
{
  "range": {
    "min": 15,
    "max": 90,
    "unit": "°C"
  }
}
```

Для `select`:

```json
{
  "options": [
    {
      "value": "ok",
      "label": "Норма"
    },
    {
      "value": "replace",
      "label": "Нужна замена"
    }
  ]
}
```

Backend должен хранить версию checklist template. В результат осмотра клиент отправит значения по `item.id`.

## 3. Upload photo

```http
POST /upload-photo
Content-Type: multipart/form-data
```

### FormData

```text
file=<binary>
draft_id=plan-2026-04-17:eq-101
equipment_id=101
captured_at=2026-04-17T05:30:00.000Z
photo_id=<recommended, if backend agrees>
```

Сейчас клиент отправляет `file`, `draft_id`, `equipment_id`, `captured_at`. Рекомендуется добавить и поддержать `photo_id` для строгой идемпотентности.

### Ответ 200/201

```json
{
  "id": "photo-778",
  "url": "https://api.example.com/uploads/photo-778.jpg"
}
```

Клиент также понимает поле `photo_url`, но предпочтительно использовать `url`.

## 4. Submit inspection result

```http
POST /inspection-results
Content-Type: application/json
```

### Запрос

```json
{
  "local_id": "plan-2026-04-17:eq-101",
  "equipment_id": 101,
  "employee_id": 1,
  "inspector_name": "Обходчик смены",
  "status": "defect",
  "qr_code": "CANARY-EQ-101",
  "scanned_at": "2026-04-17T05:24:00.000Z",
  "timestamp": "2026-04-17T05:30:00.000Z",
  "checklist": {
    "temperature": "96",
    "pressure": "8.5",
    "vibration": "3.2",
    "lubrication": "low",
    "leak": true,
    "comment": "Течь с левого фланца"
  },
  "photo_ids": [
    "client-photo-id-1"
  ],
  "photo_urls": [
    "https://api.example.com/uploads/photo-778.jpg"
  ]
}
```

### Ответ 200/201

```json
{
  "id": "inspection-9001",
  "status": "accepted",
  "synced_at": "2026-04-17T05:30:08.000Z"
}
```

## 5. Idempotency

Это критично для offline-first.

Backend должен:

- [ ] При повторном `POST /inspection-results` с тем же `local_id` не создавать дубль
- [ ] Возвращать уже созданный результат или `200 OK` с тем же `id`
- [ ] При повторной загрузке того же фото не создавать дубль, если передан `photo_id` или совпадает `draft_id + filename`
- [ ] Быть готовым к повторным запросам после обрыва сети

## 6. Ошибки

Рекомендуемый формат ошибок:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "QR code does not match equipment",
  "fields": {
    "qr_code": "Expected CANARY-EQ-101"
  },
  "retryable": false
}
```

Для временных ошибок:

```json
{
  "code": "TEMPORARY_UNAVAILABLE",
  "message": "Storage is temporarily unavailable",
  "retryable": true
}
```

Клиент сейчас повторяет failed actions автоматически при восстановлении сети.

## 7. CORS и заголовки

Минимум для разработки:

```text
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Если будет авторизация:

```text
Access-Control-Allow-Credentials: true
```

В этом случае нельзя использовать `Access-Control-Allow-Origin: *`.

## 8. Auth, если нужен

Сейчас клиент не реализует полноценную авторизацию. Нужно согласовать:

- [ ] Как получить текущего пользователя/смену
- [ ] Где хранить token в PWA
- [ ] Как обновлять token offline/после простоя
- [ ] Что делать с queued actions, если token истёк

До внедрения auth клиент отправляет `employee_id: 1` и `inspector_name: "Обходчик смены"`.

## 9. Acceptance criteria для интеграции

- [ ] При открытии клиента с `API_BASE_URL` план приходит с backend, demo-plan не используется
- [ ] В списке видны реальные name/location/priority/QR
- [ ] Неверный QR блокирует осмотр
- [ ] Верный QR разблокирует чеклист
- [ ] Фото загружается и возвращает URL
- [ ] Результат `ok` отправляется без фото
- [ ] Результат `defect` отправляется только после хотя бы одного фото
- [ ] Повторная отправка того же `local_id` не создаёт дубль
- [ ] При выключенной сети осмотр сохраняется локально
- [ ] После восстановления сети очередь синхронизируется без ручного действия
- [ ] Backend корректно принимает данные, созданные несколько часов назад offline

## 10. Что нужно решить отдельно

- [ ] Финальный источник checklist templates: backend отдаёт в плане или клиент держит локальный каталог
- [ ] Формат QR: строка, URL, signed payload или asset tag
- [ ] Нужны ли GPS/геометки для anti-fake signals
- [ ] Ограничения размера/формата фото
- [ ] Авторизация и роли
- [ ] Retention policy для фото и результатов
