# canary

## Docker Compose

Запуск frontend и backend одной командой из корня репозитория:

```bash
docker compose up --build
```

После запуска:

```text
Frontend: http://localhost:8080
Backend:  http://localhost:8000
OpenAPI:  http://localhost:8000/docs
```

Compose поднимает:

- `canary-backend` на FastAPI/Uvicorn, порт `8000`
- `canary-frontend` на nginx, порт `8080`
- volume `backend-data` для SQLite базы
- volume `backend-uploads` для загруженных фото

При первом запуске backend копирует seed-базу `backend/app/factory_reports.db` в volume `backend-data`. Дальше данные сохраняются в volume и не перезатираются при перезапуске.

Frontend в compose получает:

```text
API_BASE_URL=http://localhost:8000/api/v1
```

Это важно: URL должен быть доступен из браузера пользователя, поэтому здесь используется `localhost`, а не имя docker-сервиса `backend`.

Если проверяете приложение с телефона в той же Wi-Fi сети, используйте IP ноутбука:

```bash
API_BASE_URL=http://<LAN_IP>:8000/api/v1 \
CORS_ORIGINS='["http://localhost:8080","http://127.0.0.1:8080","http://<LAN_IP>:8080"]' \
docker compose up --build
```

После этого на телефоне открывайте:

```text
http://<LAN_IP>:8080
```

Для камеры на телефоне нужен HTTPS или localhost. Для полноценной проверки QR с телефона используйте HTTPS-туннель до frontend.

## HTTPS-туннель для проверки с телефона

Камера в мобильных браузерах работает только в secure context: `https` или `localhost`. Так как на телефоне `localhost` указывает на сам телефон, для проверки QR с приложения, запущенного на ноутбуке, нужен HTTPS-туннель.

Важно: если frontend открыт по `https`, API тоже должен быть доступен по `https`. Иначе браузер заблокирует запросы к `http://...` как mixed content. Для локальной проверки проще поднять два туннеля: один до frontend, второй до backend.

### Пример через `cloudflared`:

```bash
brew install cloudflared
docker compose up --build -d
```

В первом терминале запустите туннель до frontend:

```bash
cloudflared tunnel --url http://localhost:8080
```

Во втором терминале запустите туннель до backend:

```bash
cloudflared tunnel --url http://localhost:8000
```

Скопируйте оба выданных HTTPS URL и пересоздайте контейнеры с корректными переменными:

```bash
API_BASE_URL=https://<BACKEND_TUNNEL_HOST>/api/v1 \
CORS_ORIGINS='["https://<FRONTEND_TUNNEL_HOST>"]' \
docker compose up --build -d --force-recreate
```

После этого на телефоне открывайте:

```text
https://<FRONTEND_TUNNEL_HOST>
```

### Альтернатива через `ngrok`:

```bash
ngrok http 8080
ngrok http 8000
```

Правило то же: в `API_BASE_URL` нужно указывать HTTPS URL backend-туннеля с суффиксом `/api/v1`, а в `CORS_ORIGINS` — HTTPS URL frontend-туннеля.

## Остановка:

```bash
docker compose down
```

## Остановка с удалением базы и загруженных фото:

```bash
docker compose down -v
```

## Backend Docker

Сборка только backend:

```bash
docker build -t canary-backend ./backend
```

Запуск только backend:

```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=sqlite+aiosqlite:////data/factory_reports.db \
  -v canary-backend-data:/data \
  -v canary-backend-uploads:/app/uploads \
  canary-backend
```

## Frontend Docker

Инструкция по сборке и запуску PWA-клиента для backend-разработчиков находится в [client/README.md](client/README.md).
