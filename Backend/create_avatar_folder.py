# Backend/create_avatar_folder.py
import os

def create_avatar_folder():
    """Создает папку для загрузки аватаров"""
    avatar_folder = 'uploads/avatars'
    
    try:
        os.makedirs(avatar_folder, exist_ok=True)
        print(f"✅ Папка '{avatar_folder}' создана или уже существует")
        
        # Проверяем права доступа
        test_file = os.path.join(avatar_folder, 'test.txt')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        print("✅ Права доступа к папке в порядке")
        
    except Exception as e:
        print(f"❌ Ошибка при создании папки: {e}")

if __name__ == "__main__":
    create_avatar_folder()