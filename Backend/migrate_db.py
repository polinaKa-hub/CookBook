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
    """Подключение к PostgreSQL на Render"""
    try:
        print("Пробую подключиться к PostgreSQL на Render...")
        
        # Получаем URL из переменной окружения Render
        db_url = os.environ.get('DATABASE_URL')
        
        if not db_url:
            print("Переменная DATABASE_URL не установлена")
            print("Текущие переменные окружения:", dict(os.environ))
            sys.exit(1)
        
        # Исправляем URL если нужно (Render иногда добавляет postgres://)
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        
        print(f"Подключаюсь по URL: {db_url[:50]}...")  # Логируем без пароля
        
        conn = psycopg2.connect(db_url)
        print("✓ Успешно подключились к PostgreSQL на Render")
        return conn
        
    except Exception as e:
        print(f"✗ Ошибка подключения: {e}")
        print("\nПроверьте:")
        print("1. На Render Dashboard → Database → Connection String")
        print("2. Правильность DATABASE_URL в Environment Variables")
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