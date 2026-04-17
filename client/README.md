# Canary Frontend

Мобильный PWA-клиент для обходчиков. Клиент работает offline-first, хранит план/черновики/фото в IndexedDB и синхронизирует результаты через REST API автоматически.

## Быстрый запуск через Docker

Сборка образа из директории `client`:

```bash
docker build -t canary-client .
```

Запуск против backend на этой же машине:

```bash
docker run --rm -p 8080:8080 \
  -e API_BASE_URL=http://localhost:8000 \
  canary-client
```

Открыть приложение:

```text
http://localhost:8080
```

Если backend запущен в другом контейнере или на другом хосте, укажите URL, который доступен именно из браузера пользователя:

```bash
docker run --rm -p 8080:8080 \
  -e API_BASE_URL=http://192.168.1.20:8000 \
  canary-client
```

## Важные замечания для backend-разработчиков

- `API_BASE_URL` задаётся на старте контейнера, пересобирать образ для смены backend URL не нужно.
- Если `API_BASE_URL` пустой, запросы идут на тот же origin, где открыт frontend. Это удобно, если backend/reverse proxy отдаёт API и статику с одного домена.
- Для тестирования камеры и QR на телефоне нужен secure context: `https` или `localhost`. При открытии с телефона по `http://<LAN-IP>:8080` браузер может запретить камеру.
- Backend должен разрешить CORS для origin фронта, например `http://localhost:8080`, если API находится на другом origin.
- PWA кэширует статику. После пересборки образа при странном поведении обновите страницу с bypass cache или очистите site data.

## REST API, который ожидает клиент

Полный checklist для backend-интеграции и JSON-контракты находятся в [BACKEND_CHECKLIST.md](BACKEND_CHECKLIST.md).

Клиент сначала пробует новые endpoints:

```text
GET  /inspection-plans/today/
POST /inspection-results
POST /upload-photo
```

Для совместимости с текущим backend есть fallback на legacy endpoints:

```text
GET  /api/v1/inspection-plans/
GET  /api/v1/equipment/:id
POST /api/v1/inspections/
```

## Локальный запуск без Docker

```bash
npm install --legacy-peer-deps
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Проверки:

```bash
npm run lint
npm run build
```
