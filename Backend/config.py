import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # PostgreSQL конфигурация
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or \
        "postgresql://cookbook_60x8_user:ANa74rHsmxSSHkzCIbdtNH7IXG3RjSgg@dpg-d58pu7hr0fns73fcseg0-a/cookbook_60x8"
        #  postgresql://cookbook_60x8_user:ANa74rHsmxSSHkzCIbdtNH7IXG3RjSgg@dpg-d58pu7hr0fns73fcseg0-a/cookbook_60x8
        #  postgresql://cookbook_60x8_user:ANa74rHsmxSSHkzCIbdtNH7IXG3RjSgg@dpg-d58pu7hr0fns73fcseg0-a.frankfurt-postgres.render.com/cookbook_60x8
        # postgresql://postgres:255451135Ka@localhost:5432/cookbook
    
    # Исправляем postgres:// на postgresql:// (нужно для некоторых версий SQLAlchemy)
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # ImgBB конфигурация
    IMGBB_API_KEY = os.getenv('IMGBB_API_KEY') or '0a3069d71b6782d74ef6e2d6be371d9b'
    USE_IMGBB = bool(IMGBB_API_KEY)  # Будет True если ключ не пустой
    # Если есть API ключ - используем ImgBB, иначе локальное хранилище
    USE_IMGBB = bool(IMGBB_API_KEY)  # Автоматически True если ключ есть
    
    # Секретные ключи
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
    
    # Environment
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    
    # Настройки загрузки файлов
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # CORS настройки
    if ENVIRONMENT == 'production':
        CORS_ORIGINS = ['https://cookbook-backend-kupo.onrender.com']
    else:
        CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5000']