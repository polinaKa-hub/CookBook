import sqlite3
import psycopg2
from psycopg2 import sql
import os
import sys

def get_sqlite_connection():
    """Подключение к SQLite"""
    sqlite_path = os.path.join('instance', 'cookbook.db')
    print(f"Подключаюсь к SQLite: {sqlite_path}")
    
    if not os.path.exists(sqlite_path):
        print(f"Файл {sqlite_path} не найден!")
        print("Текущая директория:", os.getcwd())
        sys.exit(1)
    
    return sqlite3.connect(sqlite_path)

def get_postgres_connection():
    """Подключение к PostgreSQL с явными параметрами"""
    # Пробуем разные варианты подключения
    
    # Вариант 1: Прямые параметры (самый надежный)
    try:
        print("Пробую подключиться к PostgreSQL с параметрами...")
        conn = psycopg2.connect(
            host="localhost",
            database="cookbook",
            user="cookbook_user",
            password="your_password",  # ЗАМЕНИТЕ НА СВОЙ ПАРОЛЬ!
            port="5432"
        )
        print("Успешно подключились с параметрами")
        return conn
    except Exception as e:
        print(f"Ошибка при подключении с параметрами: {e}")
    
    # Вариант 2: Через переменную окружения (проверяем кодировку)
    try:
        if 'DATABASE_URL' in os.environ:
            db_url = os.environ['DATABASE_URL']
            print(f"Пробую DATABASE_URL: {db_url[:50]}...")  # Выводим только начало
            
            # Убедимся, что это строка в правильной кодировке
            if isinstance(db_url, bytes):
                db_url = db_url.decode('utf-8')
            
            # Исправляем common issues
            if db_url.startswith('"'):
                db_url = db_url.strip('"')
            if db_url.startswith("'"):
                db_url = db_url.strip("'")
            db_url = db_url.strip()
            
            conn = psycopg2.connect(db_url)
            print("Успешно подключились через DATABASE_URL")
            return conn
    except Exception as e:
        print(f"Ошибка при подключении через DATABASE_URL: {e}")
    
    # Вариант 3: Пробуем как пользователь postgres
    try:
        print("Пробую подключиться как пользователь postgres...")
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres",
            password="",  # Пароль, который вы установили при инсталляции
            port="5432"
        )
        
        # Создаем базу данных если нужно
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Проверяем существование базы данных
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'cookbook'")
        if not cursor.fetchone():
            print("База данных 'cookbook' не существует, создаю...")
            cursor.execute("CREATE DATABASE cookbook")
        
        # Проверяем существование пользователя
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = 'cookbook_user'")
        if not cursor.fetchone():
            print("Пользователь 'cookbook_user' не существует, создаю...")
            cursor.execute("CREATE USER cookbook_user WITH PASSWORD 'your_password'")
            cursor.execute("GRANT ALL PRIVILEGES ON DATABASE cookbook TO cookbook_user")
        
        conn.close()
        
        # Подключаемся к новой базе
        conn = psycopg2.connect(
            host="localhost",
            database="cookbook",
            user="cookbook_user",
            password="your_password",
            port="5432"
        )
        print("Успешно подключились как postgres")
        return conn
        
    except Exception as e:
        print(f"Ошибка при подключении как postgres: {e}")
    
    print("\n" + "="*60)
    print("Не удалось подключиться к PostgreSQL!")
    print("Проверьте:")
    print("1. Запущена ли служба PostgreSQL")
    print("2. Пароль пользователя cookbook_user")
    print("3. Существует ли база данных 'cookbook'")
    print("="*60)
    sys.exit(1)

def create_postgres_tables(pg_cursor):
    """Создание таблиц в PostgreSQL"""
    
    print("\nСоздаю таблицы в PostgreSQL...")
    
    # Таблица users
    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(80) UNIQUE NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        password_hash VARCHAR(200) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bio TEXT,
        avatar_url VARCHAR(500)
    );
    """)
    print("✓ Таблица users создана")
    
    # Таблица recipes
    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        cooking_time INTEGER,
        category VARCHAR(100),
        difficulty VARCHAR(50),
        image_url VARCHAR(500),
        author VARCHAR(100),
        author_id INTEGER REFERENCES users(id),
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        servings INTEGER
    );
    """)
    print("✓ Таблица recipes создана")
    
    # Остальные таблицы...
    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        recipe_id INTEGER REFERENCES recipes(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, recipe_id)
    );
    """)
    
    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id),
        user_id INTEGER REFERENCES users(id),
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(recipe_id, user_id)
    );
    """)
    
    pg_cursor.execute("""
    CREATE TABLE IF NOT EXISTS recipe_step_image (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id),
        step_index INTEGER,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    print("✓ Все таблицы созданы")

def migrate_table(sqlite_cursor, pg_cursor, table_name):
    """Миграция одной таблицы"""
    print(f"\nМигрирую таблицу: {table_name}")
    
    # Проверяем, существует ли таблица в SQLite
    sqlite_cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
    if not sqlite_cursor.fetchone():
        print(f"  Таблица {table_name} не найдена в SQLite, пропускаю")
        return 0
    
    # Получаем данные
    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        print(f"  Таблица {table_name} пустая, пропускаю")
        return 0
    
    # Получаем информацию о колонках
    sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
    columns_info = sqlite_cursor.fetchall()
    columns = [col[1] for col in columns_info]
    
    print(f"  Найдено {len(rows)} записей")
    print(f"  Колонки: {columns}")
    
    # Подготавливаем данные
    migrated_count = 0
    for row in rows:
        try:
            # Конвертируем None в NULL для PostgreSQL
            converted_row = []
            for value in row:
                if value is None:
                    converted_row.append(None)
                elif isinstance(value, bytes):
                    # Пропускаем бинарные данные (если есть)
                    print(f"  Внимание: пропускаю бинарные данные в таблице {table_name}")
                    break
                else:
                    converted_row.append(value)
            else:
                # Вставляем данные
                placeholders = ', '.join(['%s'] * len(converted_row))
                query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
                pg_cursor.execute(query, converted_row)
                migrated_count += 1
                
        except Exception as e:
            print(f"  Ошибка при вставке строки: {e}")
            # Пропускаем проблемную строку
            continue
    
    print(f"  Успешно мигрировано: {migrated_count}/{len(rows)} записей")
    return migrated_count

def main():
    print("="*60)
    print("МИГРАЦИЯ ИЗ SQLite В PostgreSQL")
    print("="*60)
    
    sqlite_conn = None
    pg_conn = None
    
    try:
        # Подключаемся к SQLite
        sqlite_conn = get_sqlite_connection()
        sqlite_cursor = sqlite_conn.cursor()
        print("✓ Подключение к SQLite успешно")
        
        # Подключаемся к PostgreSQL
        pg_conn = get_postgres_connection()
        pg_cursor = pg_conn.cursor()
        print("✓ Подключение к PostgreSQL успешно")
        
        # Создаем таблицы
        create_postgres_tables(pg_cursor)
        pg_conn.commit()
        
        # Список таблиц для миграции
        tables = ['users', 'recipes', 'favorites', 'comments', 'ratings', 'recipe_step_image']
        
        print("\n" + "="*60)
        print("НАЧИНАЮ МИГРАЦИЮ ДАННЫХ")
        print("="*60)
        
        total_migrated = 0
        for table in tables:
            count = migrate_table(sqlite_cursor, pg_cursor, table)
            total_migrated += count
            pg_conn.commit()
        
        print("\n" + "="*60)
        print("РЕЗУЛЬТАТЫ МИГРАЦИИ:")
        print("="*60)
        print(f"Всего мигрировано записей: {total_migrated}")
        print("Миграция завершена успешно!")
        print("="*60)
        
    except Exception as e:
        print(f"\n✗ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        if sqlite_conn:
            sqlite_cursor.close()
            sqlite_conn.close()
        if pg_conn:
            pg_cursor.close()
            pg_conn.close()
        print("\nСоединения закрыты")

if __name__ == '__main__':
    main()