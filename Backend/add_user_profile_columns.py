import sqlite3
import os

def add_user_profile_columns():
    """Добавляет колонки bio и avatar_url к таблице users"""
    # Используйте путь, который указан у вас в конфигурации Flask
    # Обычно это 'instance/cookbook.db' или просто 'cookbook.db'
    db_path = 'instance/cookbook.db'

    
    try:
        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Подключились к базе данных...")
        
        # 1. Проверяем структуру таблицы users
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print("\nТекущие колонки в таблице users:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # 2. Добавляем колонку bio если её нет
        if 'bio' in column_names:
            print("\n✅ Колонка bio уже существует в таблице users")
        else:
            print("\nДобавляем колонку bio...")
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''")
                print("✅ Колонка bio добавлена успешно!")
            except sqlite3.Error as e:
                print(f"❌ Ошибка при добавлении bio: {e}")
        
        # 3. Добавляем колонку avatar_url если её нет
        if 'avatar_url' in column_names:
            print("✅ Колонка avatar_url уже существует в таблице users")
        else:
            print("Добавляем колонку avatar_url...")
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)")
                print("✅ Колонка avatar_url добавлена успешно!")
            except sqlite3.Error as e:
                print(f"❌ Ошибка при добавлении avatar_url: {e}")
        
        # 4. Проверяем пользователей в базе
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        print(f"\nВсего пользователей в базе: {total_users}")
        
        if total_users > 0:
            # Показываем текущих пользователей
            cursor.execute("SELECT id, username, email FROM users LIMIT 10")
            users = cursor.fetchall()
            print("\nПервые 10 пользователей:")
            for user in users:
                print(f"  ID {user[0]}: '{user[1]}' - {user[2]}")
            
            # Обновляем существующие записи - устанавливаем bio по умолчанию
            cursor.execute("UPDATE users SET bio = '' WHERE bio IS NULL")
            updated = cursor.rowcount
            if updated > 0:
                print(f"\nОбновлено {updated} пользователей (установлен bio по умолчанию)")
        
        # 5. Проверяем структуру после обновления
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("\nФинальная структура таблицы users:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # Сохраняем изменения
        conn.commit()
        conn.close()
        
        print("\n" + "="*50)
        print("✅ База данных успешно обновлена!")
        print("Теперь можно перезапустить Flask приложение и войти в систему.")
        print("="*50)
        
    except sqlite3.Error as e:
        print(f"\n❌ Ошибка SQLite: {e}")
        print("Проверьте, что база данных не заблокирована другими процессами.")
        print("Закройте все программы, использующие базу данных (Flask, SQLite Browser и т.д.)")
    except Exception as e:
        print(f"\n❌ Неожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()

def check_database():
    """Проверяет структуру базы данных после обновления"""
    print("\n" + "="*50)
    print("ПРОВЕРКА СТРУКТУРЫ БАЗЫ ДАННЫХ")
    print("="*50)
    
    db_path = r'C:\Users\polin\OneDrive\Desktop\CookBook\Backend\instance\cookbook.db'
    
    if not os.path.exists(db_path):
        print("Файл базы данных не найден для проверки.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверяем все таблицы
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print("\nТаблицы в базе данных:")
        for table in tables:
            print(f"\nТаблица: {table[0]}")
            cursor.execute(f"PRAGMA table_info({table[0]})")
            columns = cursor.fetchall()
            for col in columns:
                nullable = "NULL" if col[3] == 0 else "NOT NULL"
                default = f" DEFAULT {col[4]}" if col[4] else ""
                print(f"  - {col[1]}: {col[2]} {nullable}{default}")
        
        conn.close()
        
    except Exception as e:
        print(f"Ошибка при проверке: {e}")

if __name__ == "__main__":
    print("="*50)
    print("ОБНОВЛЕНИЕ БАЗЫ ДАННЫХ - ДОБАВЛЕНИЕ ПОЛЕЙ ПРОФИЛЯ")
    print("="*50)
    
    # Запускаем обновление
    add_user_profile_columns()
    
    # Проверяем результат
    check_database()
    
    input("\nНажмите Enter для выхода...")