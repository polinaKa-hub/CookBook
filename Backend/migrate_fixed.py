# Backend/migrate_fixed.py
import sqlite3
import psycopg2
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
    """Подключение к PostgreSQL на Render - ПРЯМОЙ URL"""
    try:
        print("Подключаюсь к PostgreSQL на Render...")
        
        # ВАШ ПРЯМОЙ URL ИЗ RENDER
        db_url = "postgresql://cookbook_60x8_user:ANa74rHsmxSSHkzCIbdtNH7IXG3RjSgg@dpg-d58pu7hr0fns73fcseg0-a.frankfurt-postgres.render.com/cookbook_60x8"
        
        print(f"URL: postgresql://cookbook_60x8_user:****@dpg-d58pu7hr0fns73fcseg0-a.frankfurt-postgres.render.com/cookbook_60x8")
        
        conn = psycopg2.connect(db_url)
        print("✓ Успешное подключение к PostgreSQL на Render")
        return conn
        
    except Exception as e:
        print(f"✗ Ошибка подключения: {e}")
        print("\nВозможные причины:")
        print("1. Проверьте интернет-соединение")
        print("2. Убедитесь, что БД на Render активна")
        print("3. URL может быть неверным")
        sys.exit(1)

def create_postgres_tables(pg_cursor):
    """Создание таблиц в PostgreSQL"""
    
    print("\n" + "="*60)
    print("СОЗДАНИЕ ТАБЛИЦ В POSTGRESQL")
    print("="*60)
    
    try:
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
        
        # Таблица favorites
        pg_cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            recipe_id INTEGER REFERENCES recipes(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, recipe_id)
        );
        """)
        print("✓ Таблица favorites создана")
        
        # Таблица comments
        pg_cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            recipe_id INTEGER REFERENCES recipes(id),
            user_id INTEGER REFERENCES users(id),
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        print("✓ Таблица comments создана")
        
        # Таблица ratings
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
        print("✓ Таблица ratings создана")
        
        # Таблица recipe_step_image
        pg_cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipe_step_image (
            id SERIAL PRIMARY KEY,
            recipe_id INTEGER REFERENCES recipes(id),
            step_index INTEGER,
            image_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        print("✓ Таблица recipe_step_image создана")
        
        print("\n✅ Все таблицы созданы успешно!")
        
    except Exception as e:
        print(f"✗ Ошибка при создании таблиц: {e}")
        raise

def check_tables_exist(pg_cursor):
    """Проверка существования таблиц"""
    print("\n" + "="*60)
    print("ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ")
    print("="*60)
    
    pg_cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    
    tables = [row[0] for row in pg_cursor.fetchall()]
    
    if tables:
        print("Найдены таблицы:")
        for table in tables:
            print(f"  • {table}")
        print(f"Всего: {len(tables)} таблиц")
        return True
    else:
        print("Таблицы не найдены")
        return False

def migrate_table(sqlite_cursor, pg_cursor, table_name):
    """Миграция одной таблицы"""
    print(f"\nМигрирую таблицу: {table_name}")
    
    # Проверяем, существует ли таблица в SQLite
    sqlite_cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
    if not sqlite_cursor.fetchone():
        print(f"  ✗ Таблица {table_name} не найдена в SQLite")
        return 0
    
    # Получаем данные
    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        print(f"  ℹ Таблица {table_name} пустая")
        return 0
    
    # Получаем информацию о колонках
    sqlite_cursor.execute(f"PRAGMA table_info({table_name})")
    columns_info = sqlite_cursor.fetchall()
    columns = [col[1] for col in columns_info]
    
    print(f"  Найдено записей: {len(rows)}")
    print(f"  Колонки: {', '.join(columns)}")
    
    # Подготавливаем данные
    migrated_count = 0
    errors = 0
    
    for i, row in enumerate(rows, 1):
        try:
            # Конвертируем None в NULL для PostgreSQL
            converted_row = []
            for value in row:
                if value is None:
                    converted_row.append(None)
                elif isinstance(value, bytes):
                    # Пропускаем бинарные данные
                    print(f"  ⚠ Пропускаю бинарные данные в строке {i}")
                    break
                else:
                    converted_row.append(value)
            else:
                # Вставляем данные
                placeholders = ', '.join(['%s'] * len(converted_row))
                query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
                pg_cursor.execute(query, converted_row)
                migrated_count += 1
                
                if i % 10 == 0:  # Прогресс каждые 10 записей
                    print(f"  Прогресс: {i}/{len(rows)}")
                
        except Exception as e:
            errors += 1
            if errors <= 3:  # Показываем только первые 3 ошибки
                print(f"  ✗ Ошибка в строке {i}: {e}")
            continue
    
    print(f"  ✅ Успешно мигрировано: {migrated_count}/{len(rows)} записей")
    if errors > 0:
        print(f"  ⚠ Ошибок: {errors}")
    
    return migrated_count

def main():
    print("="*60)
    print("МИГРАЦИЯ ИЗ SQLite В POSTGRESQL (RENDER) - ФИКСИРОВАННАЯ")
    print("="*60)
    
    sqlite_conn = None
    pg_conn = None
    
    try:
        # 1. Подключаемся к SQLite
        print("\n1. Подключение к SQLite...")
        sqlite_conn = get_sqlite_connection()
        sqlite_cursor = sqlite_conn.cursor()
        print("   ✅ Подключение к SQLite успешно")
        
        # Проверяем таблицы в SQLite
        sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        sqlite_tables = [row[0] for row in sqlite_cursor.fetchall()]
        print(f"   Найдено таблиц в SQLite: {len(sqlite_tables)}")
        if sqlite_tables:
            print(f"   Таблицы: {', '.join(sqlite_tables)}")
        
        # 2. Подключаемся к PostgreSQL на Render
        print("\n2. Подключение к PostgreSQL на Render...")
        pg_conn = get_postgres_connection()
        pg_cursor = pg_conn.cursor()
        print("   ✅ Подключение к PostgreSQL успешно")
        
        # 3. Проверяем существующие таблицы
        tables_exist = check_tables_exist(pg_cursor)
        
        if tables_exist:
            response = input("\nТаблицы уже существуют. Пересоздать? (y/N): ").strip().lower()
            if response == 'y':
                print("Удаляю существующие таблицы...")
                # Осторожно: удаляет ВСЕ таблицы!
                pg_cursor.execute("""
                    DO $$ DECLARE
                        r RECORD;
                    BEGIN
                        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                        END LOOP;
                    END $$;
                """)
                pg_conn.commit()
                print("✅ Существующие таблицы удалены")
                create_postgres_tables(pg_cursor)
                pg_conn.commit()
            else:
                print("Продолжаю с существующими таблицами...")
        else:
            # 4. Создаем таблицы
            print("\n3. Создание таблиц...")
            create_postgres_tables(pg_cursor)
            pg_conn.commit()
        
        # 5. Миграция данных
        print("\n" + "="*60)
        print("НАЧИНАЮ МИГРАЦИЮ ДАННЫХ")
        print("="*60)
        
        tables_to_migrate = ['users', 'recipes', 'favorites', 'comments', 'ratings', 'recipe_step_image']
        total_migrated = 0
        
        for table in tables_to_migrate:
            if table in sqlite_tables:
                count = migrate_table(sqlite_cursor, pg_cursor, table)
                total_migrated += count
                pg_conn.commit()
            else:
                print(f"\nℹ Таблица '{table}' не найдена в SQLite, пропускаю")
        
        # 6. Результаты
        print("\n" + "="*60)
        print("РЕЗУЛЬТАТЫ МИГРАЦИИ")
        print("="*60)
        print(f"✅ Всего мигрировано записей: {total_migrated}")
        print("✅ Миграция завершена!")
        print("="*60)
        
        # 7. Финальная проверка
        print("\n4. Финальная проверка...")
        check_tables_exist(pg_cursor)
        
    except Exception as e:
        print(f"\n✗ КРИТИЧЕСКАЯ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        print("\n5. Закрытие соединений...")
        if sqlite_conn:
            sqlite_cursor.close()
            sqlite_conn.close()
            print("   ✅ Соединение с SQLite закрыто")
        if pg_conn:
            pg_cursor.close()
            pg_conn.close()
            print("   ✅ Соединение с PostgreSQL закрыто")
        
        print("\n" + "="*60)
        print("ВСЕ ОПЕРАЦИИ ЗАВЕРШЕНЫ")
        print("="*60)

if __name__ == '__main__':
    main()