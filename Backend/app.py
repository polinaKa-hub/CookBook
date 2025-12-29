from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_cors import cross_origin
from config import Config
from flask import send_from_directory
import os

app = Flask(__name__)
app.config.from_object(Config)

# Инициализация расширений
from models.db import db
db.init_app(app)
CORS(app, origins='*', supports_credentials=True)

# CORS(app, 
#      origins=Config.CORS_ORIGINS, 
#      supports_credentials=True,
#      methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
#      allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
#      expose_headers=["Content-Type", "Authorization"])

# Импорт моделей
from models.user import User, Favorite
from models.recipe import Recipe, Rating, Comment

# Импорт сервисов
from services.auth_service import AuthService
from services.recipe_service import RecipeService
from services.comment_service import CommentService
from services.rating_service import RatingService
from services.favorite_service import FavoriteService
from services.avatar_service import AvatarService

# Импорт контроллеров
from controllers.auth_controller import AuthController
from controllers.recipe_controller import RecipeController

# Инициализация сервисов
auth_service = AuthService()
comment_service = CommentService()
rating_service = RatingService()
favorite_service = FavoriteService()
avatar_service = AvatarService(use_imgbb=Config.USE_IMGBB)
recipe_service = RecipeService(use_imgbb=Config.USE_IMGBB)

# Инициализация контроллеров
auth_controller = AuthController(auth_service, favorite_service)
# После инициализации сервисов
recipe_controller = RecipeController(recipe_service, comment_service, rating_service, auth_service)   # Добавляем auth_service

# Создаем папку для загрузок если её нет
if not os.path.exists('uploads'):
    os.makedirs('uploads')
if not os.path.exists('uploads/recipes'):
    os.makedirs('uploads/recipes')

@app.route('/')
def home():
    return """
    <html>
    <head><title>CookBook</title></head>
    <body>
        <h1>CookBook Server</h1>
        <p>Server is running with database!</p>
        <p><a href="/api/test">Test API</a></p>
        <p><a href="/api/recipes">All Recipes</a></p>
        <p><a href="/api/init-db">Initialize DB</a></p>
    </body>
    </html>
    """

@app.route('/api/test-db')
def test_db_connection():
    """Тест подключения к БД через SQLAlchemy"""
    try:
        from sqlalchemy import text
        
        # Попробуем выполнить простой запрос
        result = db.session.execute(text("SELECT current_database(), current_user"))
        db_info = result.fetchone()
        
        # Проверим таблицы
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        return jsonify({
            "status": "success",
            "database": db_info[0] if db_info else "unknown",
            "user": db_info[1] if db_info else "unknown",
            "tables": tables,
            "tables_count": len(tables)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }), 500

import psycopg2

@app.route('/api/test-endpoints')
def test_endpoints():
    """Проверка всех endpoint'ов"""
    endpoints = [
        "/api/recipes",
        "/api/auth/register",
        "/api/auth/login",
        "/health",
        "/api/test-db"
    ]
    
    results = {}
    import requests
    
    for endpoint in endpoints:
        try:
            # Внутри приложения используем test_client
            with app.test_client() as client:
                response = client.get(endpoint)
                results[endpoint] = {
                    "status": response.status_code,
                    "exists": response.status_code != 404
                }
        except Exception as e:
            results[endpoint] = {"error": str(e)}
    
    return jsonify(results)

@app.route('/api/test-psycopg2')
def test_psycopg2():
    """Тест подключения через psycopg2"""
    try:
        from config import Config
        
        db_url = Config.SQLALCHEMY_DATABASE_URI
        print(f"Connecting to: {db_url[:50]}...")
        
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Тестовый запрос
        cursor.execute("SELECT version(), current_database(), current_user")
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "postgres_version": result[0],
            "database": result[1],
            "user": result[2]
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "config_database_url": Config.SQLALCHEMY_DATABASE_URI[:50] + "..." if Config.SQLALCHEMY_DATABASE_URI else "None"
        }), 500

@app.route('/health')
def health_check():
    try:
        # Для SQLAlchemy 2.0+ нужно использовать text()
        from sqlalchemy import text
        
        # Проверка подключения к БД
        db.session.execute(text("SELECT 1"))
        
        # Проверка существования таблиц
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "tables_count": len(tables),
            "tables": tables,
            "environment": Config.ENVIRONMENT
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy", 
            "database": "disconnected", 
            "error": str(e),
            "environment": Config.ENVIRONMENT
        }), 500

@app.route('/api/test')
def test_api():
    return jsonify({"message": "Hello from Flask!", "status": "success"})

@app.route('/api/init-db')
def init_database():
    """Инициализация базы данных с тестовыми данными"""
    try:
        # Создаем таблицы
        db.create_all()
        
        # Добавляем тестового пользователя если его нет
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", email="admin@example.com")
            admin.set_password("admin123")
            db.session.add(admin)
            
            test_user = User(username="test_user", email="test@example.com")
            test_user.set_password("test123")
            db.session.add(test_user)
            
            # Добавляем тестовые рецепты
            recipes = [
                Recipe(
                    title="Спагетти Карбонара",
                    ingredients="Спагетти - 400г, Яйца - 3 шт, Пармезан - 100г, Гуанчиале - 150г, Чёрный перец",
                    instructions="1. Варим спагетти...\n2. Обжариваем гуанчиале...\n3. Смешиваем с яичной смесью",
                    cooking_time=20,
                    category="Паста",
                    difficulty="Средний",
                    author="Алина Репа",
                    author_id=1
                ),
                Recipe(
                    title="Салат Цезарь",
                    ingredients="Листья салата - 1 пучок, Куриное филе - 300г, Сухарики - 100г, Пармезан - 50г, Соус Цезарь",
                    instructions="1. Готовим курицу...\n2. Нарезаем салат...\n3. Собираем салат",
                    cooking_time=15,
                    category="Салаты",
                    difficulty="Легкий",
                    author="Мария",
                    author_id=1
                )
            ]
            
            for recipe in recipes:
                db.session.add(recipe)
            
            db.session.commit()
        
        return jsonify({"message": "Database initialized successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Маршруты рецептов
@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    return recipe_controller.get_all_recipes()

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    return recipe_controller.get_recipe(recipe_id)

@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    return recipe_controller.create_recipe()

@app.route('/api/recipes/search', methods=['GET'])
def search_recipes():
    return recipe_controller.search_recipes()

@app.route('/api/recipes/filter', methods=['GET'])
def filter_recipes():
    return recipe_controller.get_filtered_recipes()

# Маршрут для доступа к загруженным файлам
@app.route('/uploads/recipes/<path:filename>')
def serve_recipe_image(filename):
    return send_from_directory('uploads/recipes', filename)

# Альтернативно, можно создать статическую папку:
@app.route('/static/recipes/<path:filename>')
def static_recipe_image(filename):
    return send_from_directory('uploads/recipes', filename)

# Маршруты комментариев и оценок
@app.route('/api/recipes/<int:recipe_id>/comments', methods=['GET'])
def get_comments(recipe_id):
    return recipe_controller.get_comments(recipe_id)

@app.route('/api/recipes/<int:recipe_id>/comments', methods=['POST'])
def add_comment(recipe_id):
    print(f"DEBUG [add_comment]: Recipe ID: {recipe_id}")
    print(f"DEBUG [add_comment]: Cookies: {request.cookies}")
    print(f"DEBUG [add_comment]: JSON data: {request.get_json()}")
    return recipe_controller.add_comment(recipe_id)

@app.route('/api/recipes/<int:recipe_id>/rating', methods=['POST'])
def add_rating(recipe_id):
    return recipe_controller.add_rating(recipe_id)

# Маршруты аутентификации
@app.route('/api/auth/register', methods=['POST'])
def register():
    return auth_controller.register()

@app.route('/api/auth/login', methods=['POST'])
def login():
    return auth_controller.login()

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return auth_controller.logout()

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    return auth_controller.get_current_user()

@app.route('/api/auth/favorites', methods=['POST'])
def add_favorite():
    return auth_controller.add_favorite()

@app.route('/api/auth/favorites', methods=['GET'])
def get_favorites():
    return auth_controller.get_favorites()

@app.route('/api/auth/favorites/remove', methods=['POST'])
def remove_favorite():
    return auth_controller.remove_favorite()

# Маршруты для рецептов пользователя и избранного
@app.route('/api/recipes/my', methods=['GET'])
def get_my_recipes():
    return auth_controller.get_current_user_recipes()

@app.route('/api/auth/favorites/toggle', methods=['POST'])
def toggle_favorite():
    return auth_controller.toggle_favorite()

@app.route('/api/recipes/with-steps', methods=['POST'])
def create_recipe_with_steps():
    try:
        session_id = request.cookies.get('session_id')
        if not session_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        # Получаем пользователя из сессии
        user = auth_service.get_current_user(session_id)
        if not user:
            return jsonify({'error': 'Invalid session'}), 401
        
        # Передаем управление в контроллер
        return recipe_controller.create_recipe_with_steps(user.id)
    except Exception as e:
        print(f"Error in create_recipe_with_steps route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500
    

@app.route('/api/recipes/<int:recipe_id>/update-with-steps', methods=['PATCH'])
def update_recipe_with_steps(recipe_id):
    try:
        session_id = request.cookies.get('session_id')
        print(f"DEBUG: Session ID: {session_id}")
        
        if not session_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        user = auth_service.get_current_user(session_id)
        print(f"DEBUG: User found: {user}")
        
        if not user:
            print(f"DEBUG: All sessions: {auth_service.sessions}")
            return jsonify({'error': 'Invalid session'}), 401
        
        # Отладочный вывод формы
        print(f"DEBUG: Form data keys: {list(request.form.keys())}")
        print(f"DEBUG: Files keys: {list(request.files.keys())}")

        return recipe_controller.update_recipe_with_steps(recipe_id, user.id)
    except Exception as e:
        print(f"Error in update_recipe_with_steps route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

# Обновление через PATCH
@app.route('/api/recipes/<int:recipe_id>', methods=['PATCH'])
def update_recipe(recipe_id):
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = auth_service.get_current_user(session_id)
    if not user:
        return jsonify({'error': 'Invalid session'}), 401
    
    return recipe_controller.update_recipe(recipe_id)
# Добавим отладочный маршрут
@app.route('/api/debug/sessions', methods=['GET'])
def debug_sessions():
    """Отладочный маршрут для проверки сессий"""
    return jsonify({
        'total_sessions': len(auth_service.sessions),
        'sessions': list(auth_service.sessions.keys())
    })


@app.route('/api/recipes/user/<int:user_id>', methods=['GET'])
def get_user_recipes(user_id):
    recipes = Recipe.query.filter_by(author_id=user_id).all()
    return jsonify([recipe.to_dict() for recipe in recipes])

@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def delete_recipe(recipe_id):
    session_id = request.cookies.get('session_id')
    print(f"DELETE DEBUG: Received session_id = {session_id}")  # Для отладки
    
    if not session_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    # ИСПОЛЬЗУЙТЕ ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР auth_service
    user = auth_service.get_current_user(session_id)
    print(f"DELETE DEBUG: User found = {user}")  # Для отладки
    
    if not user:
        print(f"DELETE DEBUG: Invalid session. Available sessions: {list(auth_service.sessions.keys())}")
        return jsonify({'error': 'Invalid session'}), 401
    
    return recipe_controller.delete_recipe(recipe_id)

# Добавьте после существующих маршрутов
@app.route('/api/users/<int:user_id>', methods=['GET', 'PATCH'])
def user_profile(user_id):
    print(f"=== USER PROFILE ROUTE CALLED ===")
    print(f"Method: {request.method}")
    print(f"User ID: {user_id}")
    if request.method == 'GET':
        # Получение данных пользователя
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Получаем статистику
        recipes_count = Recipe.query.filter_by(author_id=user_id).count()
        favorites_count = Favorite.query.filter_by(user_id=user_id).count()
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'bio': user.bio if hasattr(user, 'bio') else '',
            'avatar_url': user.avatar_url if hasattr(user, 'avatar_url') else None,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'recipes_count': recipes_count,
            'favorites_count': favorites_count
        })
    
    elif request.method == 'PATCH':
        print("PATCH request for user profile")
        print(f"=== DEBUG PATCH PROFILE START ===")
        print(f"Content-Type: {request.headers.get('Content-Type')}")
        print(f"Has form data: {bool(request.form)}")
        print(f"Form data keys: {list(request.form.keys())}")
        print(f"Has files: {bool(request.files)}")
        print(f"Files keys: {list(request.files.keys())}")
        print(f"=== DEBUG PATCH PROFILE START ===")
        print(f"Headers: {dict(request.headers)}")
        print(f"Form data: {request.form}")
        print(f"Files: {list(request.files.keys())}")
        
        # Проверка авторизации
        session_id = request.cookies.get('session_id')
        if not session_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        user = auth_service.get_current_user(session_id)
        if not user or user.id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        try:
            # Частичное обновление - только переданные поля
            
            # Текстовые поля из form-data
            if request.form:
                if 'email' in request.form:
                    user.email = request.form['email']
                
                if 'bio' in request.form:
                    user.bio = request.form['bio']
                
                # Обработка пароля
                current_password = request.form.get('current_password')
                new_password = request.form.get('new_password')
                
                if current_password and new_password:
                    if not user.check_password(current_password):
                        return jsonify({'error': 'Текущий пароль неверен'}), 400
                    
                    if len(new_password) < 8:
                        return jsonify({'error': 'Новый пароль должен содержать минимум 8 символов'}), 400
                    
                    user.set_password(new_password)
            
            # JSON данные (если отправляется как JSON)
            elif request.is_json:
                json_data = request.get_json()
                if 'email' in json_data:
                    user.email = json_data['email']
                if 'bio' in json_data:
                    user.bio = json_data['bio']
                # ... обработка пароля из JSON ...
            
            # Обработка аватара через сервис
            if 'avatar' in request.files:
                avatar_file = request.files['avatar']
                print(f"DEBUG: Processing avatar file: {avatar_file.filename}")
                
                if avatar_file and avatar_file.filename:
                    # Удаляем старый аватар через сервис
                    if user.avatar_url:
                        avatar_service.delete_old_avatar(user.avatar_url)
                    
                    # Сохраняем новый аватар через сервис
                    new_avatar_url = avatar_service.save_avatar(avatar_file, user.id)
                    
                    if new_avatar_url:
                        user.avatar_url = new_avatar_url
                        print(f"DEBUG: Avatar updated to: {user.avatar_url}")
                    else:
                        return jsonify({'error': 'Не удалось сохранить аватар. Проверьте формат файла.'}), 400
            
            db.session.commit()
            
            print(f"=== DEBUG PATCH PROFILE END ===")
            return jsonify({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'bio': user.bio,
                'avatar_url': user.avatar_url,
                'message': 'Профиль успешно обновлен'
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating user profile: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Internal server error'}), 500

# Эндпоинт для избранных рецептов
@app.route('/api/auth/favorite-recipes', methods=['GET'])
def get_favorite_recipes():
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = auth_service.get_current_user(session_id)
    if not user:
        return jsonify({'error': 'Invalid session'}), 401
    
    # Получаем ID избранных рецептов
    favorites = Favorite.query.filter_by(user_id=user.id).all()
    favorite_ids = [f.recipe_id for f in favorites]
    
    # Получаем рецепты
    recipes = Recipe.query.filter(Recipe.id.in_(favorite_ids)).all()
    
    return jsonify([recipe.to_dict() for recipe in recipes])

# Маршрут для загрузки аватаров
@app.route('/uploads/avatars/<path:filename>')
def serve_avatar(filename):
    return send_from_directory('uploads/avatars', filename)


# if __name__ == '__main__':
#     with app.app_context():
#         db.create_all()
#     app.run(debug=True, port=5000)

if __name__ == '__main__':
    # Печатаем конфигурацию при запуске
    if hasattr(Config, 'print_config'):
        Config.print_config()
    else:
        print(f"Environment: {Config.ENVIRONMENT}")
        print(f"Database URL configured: {bool(Config.SQLALCHEMY_DATABASE_URI)}")
        print(f"CORS Origins: {Config.CORS_ORIGINS}")
    
    with app.app_context():
        # Проверяем существование таблиц
        try:
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"Found {len(tables)} tables: {tables}")
            
            # Если таблиц нет, создаем их
            if not tables:
                print("Creating tables...")
                db.create_all()
        except Exception as e:
            print(f"Error checking tables: {e}")
    
    # В production используем другой порт
    if Config.ENVIRONMENT == 'production':
        app.run(host='0.0.0.0', port=10000, debug=False)
    else:
        app.run(debug=True, port=5000)