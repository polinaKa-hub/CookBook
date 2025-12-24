import sqlite3
import json
import os

def export_database():
    """Экспорт данных из локальной SQLite базы в JSON"""
    
    # Путь к вашей локальной БД (уточните путь)
    db_paths = [
        'instance/app.db',
        'app.db', 
        'Backend/instance/app.db',
        'cookbook.db',
        'Backend/cookbook.db'
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            print(f"Найдена БД: {path}")
            break
    
    if not db_path:
        print("❌ Файл БД не найден! Ищем все .db файлы...")
        import glob
        all_db = glob.glob("**/*.db", recursive=True)
        print(f"Найдены файлы: {all_db}")
        if all_db:
            db_path = all_db[0]
            print(f"Используем: {db_path}")
        else:
            print("❌ Не найдено ни одного .db файла")
            return
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Получаем список всех таблиц
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row['name'] for row in cursor.fetchall()]
        
        print(f"Найдены таблицы: {tables}")
        
        # Экспортируем каждую таблицу
        all_data = {}
        for table in tables:
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            
            # Преобразуем в словари
            table_data = []
            for row in rows:
                table_data.append(dict(row))
            
            all_data[table] = table_data
            print(f"  📊 Таблица '{table}': {len(table_data)} записей")
        
        conn.close()
        
        # Сохраняем в JSON
        backup_file = 'database_backup.json'
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Данные сохранены в {backup_file}")
        print(f"📁 Размер файла: {os.path.getsize(backup_file)} байт")
        
        return backup_file
        
    except Exception as e:
        print(f"❌ Ошибка экспорта: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    export_database()