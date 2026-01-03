# db_url ='postgresql://cookbook_60x8_user:ANa74rHsmxSSHkzCIbdtNH7IXG3RjSgg@dpg-d58pu7hr0fns73fcseg0-a.frankfurt-postgres.render.com/cookbook_60x8'
import sqlite3
import psycopg2
import os
import sys
import json

# ---------- SQLite ----------
def get_sqlite_connection():
    sqlite_path = os.path.join('instance', 'cookbook.db')
    print(f"SQLite DB: {sqlite_path}")

    if not os.path.exists(sqlite_path):
        print("❌ SQLite файл не найден")
        sys.exit(1)

    return sqlite3.connect(sqlite_path)


# ---------- PostgreSQL ----------
def get_postgres_connection():
    # db_url = os.getenv("DATABASE_URL")
    # if not db_url:
    #     print("❌ DATABASE_URL не установлен")
    #     sys.exit(1)

    # if db_url.startswith("postgres://"):
    #     db_url = db_url.replace("postgres://", "postgresql://", 1)
    db_url ='postgresql://cookbook_60x8_user:ANa74rHsmxSSHkzCIbdtNH7IXG3RjSgg@dpg-d58pu7hr0fns73fcseg0-a.frankfurt-postgres.render.com/cookbook_60x8'

    print("Подключение к PostgreSQL (Render)...")
    return psycopg2.connect(db_url)


# ---------- Создание таблиц ----------
def create_postgres_tables(cur):
    print("Создаю таблицы...")

    cur.execute("""
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

    cur.execute("""
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

    cur.execute("""
    CREATE TABLE IF NOT EXISTS recipe_step_images (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        step_index INTEGER,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        recipe_id INTEGER REFERENCES recipes(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, recipe_id)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id),
        user_id INTEGER REFERENCES users(id),
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(recipe_id, user_id)
    );
    """)

    print("✅ Таблицы созданы")


# ---------- Миграция таблицы ----------
def migrate_table(sqlite_cur, pg_cur, table):
    print(f"\nМиграция: {table}")

    sqlite_cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table,)
    )
    if not sqlite_cur.fetchone():
        print("  ⚠️ Таблица не найдена — пропуск")
        return 0

    sqlite_cur.execute(f"SELECT * FROM {table}")
    rows = sqlite_cur.fetchall()
    if not rows:
        print("  ⚠️ Таблица пустая")
        return 0

    sqlite_cur.execute(f"PRAGMA table_info({table})")
    columns = [c[1] for c in sqlite_cur.fetchall()]

    count = 0
    for row in rows:
        values = []
        for v in row:
            if isinstance(v, (list, dict)):
                values.append(json.dumps(v, ensure_ascii=False))
            else:
                values.append(v)

        placeholders = ", ".join(["%s"] * len(values))
        cols = ", ".join(columns)

        query = f"""
        INSERT INTO {table} ({cols})
        VALUES ({placeholders})
        ON CONFLICT DO NOTHING
        """

        try:
            pg_cur.execute(query, values)
            count += 1
        except Exception as e:
            print(f"  ❌ Ошибка строки: {e}")

    print(f"  ✅ Перенесено: {count}")
    return count


# ---------- Обновление SERIAL ----------
def fix_sequences(cur):
    print("\nОбновляю SERIAL sequences...")

    tables = [
        'users',
        'recipes',
        'recipe_step_images',
        'favorites',
        'comments',
        'ratings'
    ]

    for t in tables:
        cur.execute(f"""
        SELECT setval(
            pg_get_serial_sequence('{t}', 'id'),
            COALESCE(MAX(id), 1),
            true
        ) FROM {t};
        """)

    print("✅ Sequence обновлены")


# ---------- MAIN ----------
def main():
    print("=" * 60)
    print("МИГРАЦИЯ SQLite → PostgreSQL (Render)")
    print("=" * 60)

    sqlite_conn = get_sqlite_connection()
    pg_conn = get_postgres_connection()

    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()

    create_postgres_tables(pg_cur)
    pg_conn.commit()

    tables = [
        'users',
        'recipes',
        'recipe_step_images',
        'favorites',
        'comments',
        'ratings'
    ]

    total = 0
    for t in tables:
        total += migrate_table(sqlite_cur, pg_cur, t)
        pg_conn.commit()

    fix_sequences(pg_cur)
    pg_conn.commit()

    sqlite_cur.close()
    sqlite_conn.close()
    pg_cur.close()
    pg_conn.close()

    print("\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА")
    print(f"Всего строк: {total}")


if __name__ == "__main__":
    main()
