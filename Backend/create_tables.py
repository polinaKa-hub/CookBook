# Backend/create_tables.py
import os
import psycopg2

def create_tables():
    """Только создание таблиц без миграции данных"""
    try:
        print("Подключение к PostgreSQL на Render...")
        
        # URL из Render
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            db_url = "postgresql://cookbook_60x8_user:ANa74rHsmxSSHkzCIbdtNH7IXG3RjSgg@dpg-d58pu7hr0fns73fcseg0-a.frankfurt-postgres.render.com/cookbook_60x8"  # Вставьте свой URL
        
        # Исправляем если нужно
        if db_url.startswith('postgres://'):
            db_url = db_url.replace('postgres://', 'postgresql://', 1)
        
        print("Подключаюсь...")
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print("Создаю таблицы...")
        
        # Таблица users
        cursor.execute("""
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
        print("✓ users")
        
        # Таблица recipes
        cursor.execute("""
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
        print("✓ recipes")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            recipe_id INTEGER REFERENCES recipes(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, recipe_id)
        );
        """)
        print("✓ favorites")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            recipe_id INTEGER REFERENCES recipes(id),
            user_id INTEGER REFERENCES users(id),
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        print("✓ comments")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ratings (
            id SERIAL PRIMARY KEY,
            recipe_id INTEGER REFERENCES recipes(id),
            user_id INTEGER REFERENCES users(id),
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(recipe_id, user_id)
        );
        """)
        print("✓ ratings")
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipe_step_image (
            id SERIAL PRIMARY KEY,
            recipe_id INTEGER REFERENCES recipes(id),
            step_index INTEGER,
            image_url VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        print("✓ recipe_step_image")
        
        conn.commit()
        print("\n✅ Все таблицы успешно созданы!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        raise

if __name__ == '__main__':
    create_tables()