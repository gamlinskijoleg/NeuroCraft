# Використовуємо офіційний легкий образ Python
FROM python:3.10-slim

# Встановлюємо робочу директорію для системних файлів
WORKDIR /code

# Копіюємо файл залежностей
COPY ./requirements-render.txt /code/requirements-render.txt

# Перемикаємось на root для системних налаштувань
USER root

# Встановлюємо графічні бібліотеки для OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Створюємо користувача для Hugging Face (поки ми ще root)
RUN useradd -m -u 1000 user

# Оновлюємо pip та встановлюємо залежності глобально (як root)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /code/requirements-render.txt

# Тепер, коли все встановлено, перемикаємось на створеного користувача
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Налаштовуємо робочу директорію користувача
WORKDIR $HOME/app

# Копіюємо всі файли проєкту в контейнер і віддаємо права користувачу user
COPY --chown=user . $HOME/app

# Відкриваємо порт, який вимагає Hugging Face
EXPOSE 7860

# Запускаємо FastAPI через Uvicorn на порту 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]