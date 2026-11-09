
FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app/src

WORKDIR /app

# Install dependencies using the existing lock file.
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy backend, AI source code, and trained models.
COPY . .

WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "uv run --no-sync python manage.py migrate && uv run --no-sync python manage.py collectstatic --noinput && uv run --no-sync python manage.py runserver 0.0.0.0:8000 --noreload"]
