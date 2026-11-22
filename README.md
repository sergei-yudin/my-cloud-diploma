# My Cloud

Дипломный проект по профессии «Fullstack-разработчик на Python». My Cloud — SPA-приложение для персонального хранения файлов с административным интерфейсом и безопасными публичными ссылками.

## Возможности

- регистрация с проверкой логина, email и сложности пароля;
- аутентификация через защищённую серверную сессию и выход из системы;
- загрузка файлов с комментарием, просмотр списка, скачивание, переименование, изменение комментария и удаление;
- создание и отключение обезличенной публичной ссылки на файл;
- фиксация размера, времени загрузки и последнего скачивания;
- разграничение доступа: пользователь видит только своё хранилище;
- панель администратора: список пользователей, объём и количество файлов, выдача прав администратора, удаление пользователей, управление любым хранилищем;
- JSON REST API с корректными HTTP-кодами и серверным логированием;
- адаптивный React-интерфейс.

## Стек

- Python 3.12+, Django 5, Django REST Framework;
- PostgreSQL 17;
- React 19, Redux Toolkit, React Router, Vite;
- Gunicorn, WhiteNoise, Docker Compose.

## Структура

```text
cloud/                 Django-приложение: модели, API, права, тесты
  management/commands/ создание администратора из переменных окружения
  migrations/          миграции базы данных
mycloud/               конфигурация Django, маршруты, WSGI
frontend/              React SPA
  src/pages/           главная, вход/регистрация, файлы, админ-панель
Dockerfile             production multi-stage сборка
docker-compose.yml     веб-приложение + PostgreSQL + постоянные тома
entrypoint.sh           миграции, создание администратора, запуск Gunicorn
```

## Быстрый запуск через Docker Compose

Требуются [Docker](https://docs.docker.com/get-docker/) и Docker Compose.

```bash
git clone https://github.com/sergei-yudin/my-cloud-diploma.git
cd my-cloud-diploma
cp .env.example .env
```

Обязательно замените `SECRET_KEY`, `POSTGRES_PASSWORD` и `ADMIN_PASSWORD` в `.env`, затем:

```bash
docker compose up --build -d
```

Приложение: <http://localhost:8000>. Остановка: `docker compose down`. Данные PostgreSQL и загруженные файлы сохраняются в именованных томах.

## Локальный запуск без Docker

### Бэкенд

Требуются Python 3.10+ и PostgreSQL. Создайте БД и пользователя согласно `.env`, либо не задавайте `POSTGRES_HOST` для локальной тестовой SQLite.

```bash
python3 -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
set -a; source .env; set +a            # Windows PowerShell: переменные задаются через $env:NAME
python manage.py migrate
python manage.py ensure_admin
python manage.py runserver
```

### Фронтенд для разработки

Во втором терминале:

```bash
cd frontend
npm install
npm run dev
```

Vite откроется на <http://localhost:5173> и передаст `/api` на Django (`127.0.0.1:8000`). Для production-сборки выполните `npm run build`; Django раздаёт собранный интерфейс и API с одного сервера.

## Тесты и проверки

```bash
source .venv/bin/activate
python manage.py test
cd frontend
npm run lint
npm run build
```

Тесты проверяют валидацию регистрации, полный цикл работы с файлом и публичной ссылкой, запрет доступа к чужому хранилищу и права администратора.

## API

| Метод | URL | Назначение |
|---|---|---|
| `GET` | `/api/csrf/` | CSRF-токен |
| `POST` | `/api/auth/register/` | регистрация |
| `POST` | `/api/auth/login/` | вход |
| `POST` | `/api/auth/logout/` | выход |
| `GET` | `/api/auth/me/` | текущий пользователь |
| `GET/POST` | `/api/files/` | список / загрузка |
| `PATCH/DELETE` | `/api/files/<id>/` | редактирование / удаление |
| `GET` | `/api/files/<id>/download/` | скачивание владельцем или администратором |
| `POST/DELETE` | `/api/files/<id>/share/` | включить / отключить публичную ссылку |
| `GET` | `/api/public/<uuid>/` | публичное скачивание |
| `GET` | `/api/users/` | список пользователей (admin) |
| `PATCH/DELETE` | `/api/users/<id>/` | права / удаление (admin) |

Все ошибки API возвращаются в JSON. Файлы на диске получают случайные UUID-имена и размещаются по каталогам владельцев; публичный URL не содержит логина, пути или оригинального имени.

## Развёртывание на Reg.ru / VPS

1. Установить Docker Engine и Compose по официальной документации.
2. Настроить DNS-запись домена на IP сервера.
3. Клонировать репозиторий и создать `.env` из примера.
4. Указать домен в `ALLOWED_HOSTS` и HTTPS-адрес в `CSRF_TRUSTED_ORIGINS`.
5. Запустить `docker compose up --build -d`.
6. Настроить Nginx как reverse proxy на `127.0.0.1:8000` и TLS-сертификат Let's Encrypt.

Пример location в Nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 100m;
}
```

После изменения кода: `git pull && docker compose up --build -d`. Логи: `docker compose logs -f web`. Резервная копия БД: `docker compose exec db pg_dump -U mycloud mycloud > backup.sql`.

## Безопасность

- реальные секреты хранятся только в `.env`, файл исключён из Git;
- пароли хешируются штатными средствами Django и никогда не возвращаются API;
- изменяющие запросы защищены CSRF;
- права проверяются на каждом файловом и административном API-вызове;
- имена загружаемых файлов нормализуются, физические имена генерируются случайно;
- перед production-запуском нужно установить `DEBUG=0`, уникальный `SECRET_KEY` и сложные пароли.

## Данные администратора

При первом запуске команда `ensure_admin` создаёт администратора из `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. После первого входа пароль рекомендуется сменить через Django Admin (`/django-admin/`).

