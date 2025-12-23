import os

# Проверьте эти возможные пути
possible_paths = [
    'cookbook.db',
    'instance/cookbook.db',
    'Backend/instance/cookbook.db',
    'instance\cookbook.db',
    'Backend\instance\cookbook.db',
    os.path.join(os.getcwd(), 'instance', 'cookbook.db'),
    os.path.join(os.getcwd(), 'cookbook.db')
]

print("Поиск базы данных...")
current_dir = os.getcwd()
print(f"Текущая папка: {current_dir}")

for path in possible_paths:
    if os.path.exists(path):
        print(f"✅ Найдено: {path}")
    else:
        print(f"❌ Не найдено: {path}")