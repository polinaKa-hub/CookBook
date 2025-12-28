from flask import jsonify, request
from services.recipe_service import RecipeService
from services.comment_service import CommentService
from services.rating_service import RatingService
from services.auth_service import AuthService
from models.db import db

class RecipeController:
    def __init__(self, recipe_service, comment_service, rating_service,auth_service=None):
        self.recipe_service = recipe_service
        self.comment_service = comment_service
        self.rating_service = rating_service
        self.auth_service = auth_service  # Добавляем auth_service
    
    def get_all_recipes(self):
        recipes = self.recipe_service.get_all_recipes()
        return jsonify([recipe.to_dict() for recipe in recipes])
    
    def get_recipe(self, recipe_id):
        recipe = self.recipe_service.get_recipe_by_id(recipe_id)
        if recipe:
            return jsonify(recipe.to_dict())
        return jsonify({'error': 'Recipe not found'}), 404
            
    def create_recipe(self):
        try:
            # Проверяем авторизацию
            session_id = request.cookies.get('session_id')
            if not session_id:
                return jsonify({'error': 'Not authenticated'}), 401
            
            # Получаем пользователя через auth_service
            if not self.auth_service:
                # Если auth_service не передан, создаем экземпляр
                from services.auth_service import AuthService
                self.auth_service = AuthService()
            
            user = self.auth_service.get_current_user(session_id)
            if not user:
                return jsonify({'error': 'Invalid session'}), 401
            
            # Проверяем Content-Type
            content_type = request.headers.get('Content-Type', '')
            
            recipe_data = {}
            
            if content_type == 'application/json':
                # Если это JSON запрос
                recipe_data = request.get_json()
            else:
                # Если это form-data
                if request.files:
                    image_file = request.files.get('image')
                    if image_file and image_file.filename != '':
                        image_url = self.recipe_service.save_image(image_file)
                        if image_url:
                            recipe_data['image_url'] = image_url
                    recipe_data.update(request.form.to_dict())
                else:
                    recipe_data.update(request.form.to_dict())
            
            # Добавляем информацию об авторе из сессии
            recipe_data['author'] = user.username
            recipe_data['author_id'] = user.id
            
            # Проверяем обязательные поля
            if not recipe_data.get('title'):
                return jsonify({'error': 'Title is required'}), 400
            
            # Преобразуем ingredients и instructions если нужно
            import json
            try:
                if isinstance(recipe_data.get('ingredients'), (list, dict)):
                    recipe_data['ingredients'] = json.dumps(recipe_data['ingredients'])
                if isinstance(recipe_data.get('instructions'), (list, dict)):
                    recipe_data['instructions'] = json.dumps(recipe_data['instructions'])
            except:
                pass
            
            # Создаем рецепт с пользователем
            new_recipe = self.recipe_service.add_recipe(recipe_data, user)
            if new_recipe:
                return jsonify(new_recipe.to_dict()), 201
            return jsonify({'error': 'Failed to create recipe'}), 500
                
        except Exception as e:
            print(f"Error in create_recipe: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Internal server error'}), 500

    def update_recipe(self, recipe_id):
        """Обновить рецепт (частичное обновление)"""
        try:
            recipe_data = request.get_json()
            
            # Получаем существующий рецепт
            recipe = self.recipe_service.get_recipe_by_id(recipe_id)
            if not recipe:
                return jsonify({'error': 'Recipe not found'}), 404
            
            # Обновляем только переданные поля
            if 'title' in recipe_data:
                recipe.title = recipe_data['title']
            if 'ingredients' in recipe_data:
                recipe.ingredients = recipe_data['ingredients']
            if 'instructions' in recipe_data:
                recipe.instructions = recipe_data['instructions']
            if 'cooking_time' in recipe_data:
                recipe.cooking_time = recipe_data['cooking_time']
            if 'category' in recipe_data:
                recipe.category = recipe_data['category']
            if 'difficulty' in recipe_data:
                recipe.difficulty = recipe_data['difficulty']
            if 'image_url' in recipe_data:
                recipe.image_url = recipe_data['image_url']
            
            db.session.commit()
            return jsonify(recipe.to_dict())
        except Exception as e:
            db.session.rollback()
            print(f"Error updating recipe: {e}")
            return jsonify({'error': 'Failed to update recipe'}), 500

    def update_recipe_with_steps(self, recipe_id, user_id=None):
        """Обновить рецепт с изображениями шагов"""
        try:
            recipe = self.recipe_service.get_recipe_by_id(recipe_id)
            if not recipe:
                return jsonify({'error': 'Recipe not found'}), 404
            
            from models.user import User
            user_obj = User.query.get(user_id)
            if not user_obj:
                return jsonify({'error': 'User not found'}), 404
                
            if user_obj.id != recipe.author_id and user_obj.username != "admin":
                return jsonify({'error': 'Unauthorized'}), 403
            
            # Для PATCH: обновляем только переданные поля
            recipe_data = {}
            
            # Проверяем multipart/form-data
            if request.form:
                if 'title' in request.form:
                    recipe_data['title'] = request.form.get('title')
                if 'cooking_time' in request.form:
                    recipe_data['cooking_time'] = request.form.get('cooking_time')
                if 'category' in request.form:
                    recipe_data['category'] = request.form.get('category')
                if 'difficulty' in request.form:
                    recipe_data['difficulty'] = request.form.get('difficulty')
                if 'ingredients' in request.form:
                    recipe_data['ingredients'] = request.form.get('ingredients')
                if 'servings' in request.form:  # ДОБАВЛЯЕМ ЭТО
                    recipe_data['servings'] = request.form.get('servings')
                if 'instructions' in request.form:
                    recipe_data['instructions'] = request.form.get('instructions')
                if 'remove_main_image' in request.form:
                    recipe_data['remove_main_image'] = request.form.get('remove_main_image')
            # Проверяем JSON
            elif request.is_json:
                json_data = request.get_json()
                recipe_data.update(json_data)
            
            # Получаем основное изображение (если есть)
            main_image = request.files.get('main_image')
            if main_image:
                print(f"DEBUG: Main image received: {main_image.filename}")
                recipe_data['main_image'] = main_image

            # Если ничего не передано для обновления
            if not recipe_data:
                return jsonify({'error': 'No data provided for update'}), 400
            
            # Получаем изображения шагов (если есть)
            step_images = []
            i = 0
            while f'step_images_{i}' in request.files:
                file = request.files.get(f'step_images_{i}')
                step_images.append(file)
                i += 1
            
            # Обновляем рецепт
            updated_recipe = self.recipe_service.update_recipe_with_steps(
                recipe_id, recipe_data, step_images, user_obj
            )
            
            if updated_recipe:
                return jsonify(updated_recipe.to_dict()), 200
                # self.recipe_service._load_step_images(updated_recipe)
                # recipe_dict = updated_recipe.to_dict()
                # if hasattr(updated_recipe, 'step_images_list'):
                #     recipe_dict['step_images'] = updated_recipe.step_images_list
                # return jsonify(recipe_dict), 200
            
            return jsonify({'error': 'Failed to update recipe'}), 500
                
        except Exception as e:
            print(f"Error in update_recipe_with_steps: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Internal server error'}), 500
    
    def delete_recipe(self, recipe_id):
        session_id = request.cookies.get('session_id')
        if not session_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        from services.auth_service import AuthService
        auth_service = AuthService()
        user = auth_service.get_current_user(session_id)
        if not user:
            return jsonify({'error': 'Invalid session'}), 401
        
        # Передаем пользователя в сервис
        if self.recipe_service.delete_recipe(recipe_id, user):
            return jsonify({'message': 'Recipe deleted successfully'})
        return jsonify({'error': 'Recipe not found or access denied'}), 404
    
    def search_recipes(self):
        query = request.args.get('q', '')
        if not query:
            return jsonify({'error': 'Query parameter "q" is required'}), 400
        
        recipes = self.recipe_service.search_recipes(query)
        return jsonify([recipe.to_dict() for recipe in recipes])
    
    def get_filtered_recipes(self):
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        max_cooking_time = request.args.get('max_cooking_time')
        ingredients = request.args.get('ingredients', '')
        exclude_ingredients = request.args.get('exclude_ingredients', '')
        
        # Преобразуем строки в списки
        include_list = [ing.strip() for ing in ingredients.split(',')] if ingredients else None
        exclude_list = [ing.strip() for ing in exclude_ingredients.split(',')] if exclude_ingredients else None
        
        # Используем расширенный метод фильтрации
        filtered_recipes = self.recipe_service.get_recipes_by_filters(
            category=category,
            difficulty=difficulty,
            max_cooking_time=max_cooking_time,
            include_ingredients=include_list,
            exclude_ingredients=exclude_list
        )
        
        return jsonify([recipe.to_dict() for recipe in filtered_recipes])
    
    def get_comments(self, recipe_id):
        try:
            print(f"DEBUG: Getting comments for recipe {recipe_id}")
            comments = self.comment_service.get_comments_for_recipe(recipe_id)
            print(f"DEBUG: Found {len(comments)} comments")
            return jsonify([comment.to_dict() for comment in comments])
        except Exception as e:
            print(f"Error in get_comments: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Failed to get comments'}), 500
        
    def add_comment(self, recipe_id):
        try:
            data = request.get_json()
            if not data.get('text'):
                return jsonify({'error': 'Comment text is required'}), 400
            
            # Проверяем авторизацию
            session_id = request.cookies.get('session_id')
            if not session_id:
                return jsonify({'error': 'Not authenticated'}), 401
            
            # Получаем пользователя через auth_service
            if not self.auth_service:
                # Если auth_service не передан, создаем экземпляр
                from services.auth_service import AuthService
                self.auth_service = AuthService()
            
            user = self.auth_service.get_current_user(session_id)
            if not user:
                return jsonify({'error': 'Invalid session'}), 401
            
            # Используем реальный user_id из сессии
            comment = self.comment_service.add_comment(recipe_id, user.id, data['text'])
            if comment:
                return jsonify(comment.to_dict()), 201
            return jsonify({'error': 'Failed to add comment'}), 500
        except Exception as e:
            print(f"Error in add_comment: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Internal server error'}), 500
    
    def add_rating(self, recipe_id):
        data = request.get_json()
        session_id = request.cookies.get('session_id')
        
        # В реальном приложении здесь была бы аутентификация
        user_id = 1  # временно используем первого пользователя
        
        rating_value = data.get('rating')
        if not rating_value or not (1 <= rating_value <= 5):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        if self.rating_service.add_rating(recipe_id, user_id, rating_value):
            return jsonify({'message': 'Rating added successfully'})
        return jsonify({'error': 'Failed to add rating'}), 500
    
    def get_user_recipes(self, user_id):
        """Получить рецепты пользователя"""
        recipes = self.recipe_service.get_user_recipes(user_id)
        return jsonify([recipe.to_dict() for recipe in recipes])
    
    def create_recipe_with_steps(self, user_id=None):
        """Создать рецепт с изображениями шагов"""
        try:
            print(f"DEBUG: Starting create_recipe_with_steps, user_id={user_id}")
            
            # Проверяем multipart/form-data
            print(f"DEBUG: Request form data: {request.form}")
            print(f"DEBUG: Request files: {request.files}")
            
            if not request.form and not request.files:
                print("DEBUG: No form data or files")
                return jsonify({'error': 'No data provided'}), 400
            
            # Получаем данные формы
            title = request.form.get('title', '')
            cooking_time = request.form.get('cooking_time', 0)
            category = request.form.get('category', '')
            difficulty = request.form.get('difficulty', 'Легкий')
            ingredients = request.form.get('ingredients', '[]')
            instructions = request.form.get('instructions', '[]')
            
            print(f"DEBUG: Form data - title={title}, ingredients={ingredients[:50]}...")
            
            # Валидация
            if not title:
                return jsonify({'error': 'Title is required'}), 400
            
            main_image = request.files.get('main_image')
            print(f"DEBUG: Main image received: {main_image}")
            if main_image:
                print(f"DEBUG: Main image filename: {main_image.filename}")
            
            # Получаем изображения шагов
            step_images = []
            i = 0
            while f'step_images_{i}' in request.files:
                file = request.files.get(f'step_images_{i}')
                if file and file.filename:  # Проверяем, что файл не пустой
                    step_images.append(file)
                    print(f"DEBUG: Step image {i}: {file.filename}")
                i += 1
            
            print(f"DEBUG: Total step images: {len(step_images)}")
            
            # Подготавливаем данные для сервиса
            recipe_data = {
                'title': title,
                'ingredients': ingredients,
                'instructions': instructions,
                'cooking_time': int(cooking_time) if cooking_time else 0,
                'category': category,
                'difficulty': difficulty
            }
            
            # Добавляем основное изображение если есть
            if main_image and main_image.filename:
                recipe_data['main_image'] = main_image
                print(f"DEBUG: Main image added to recipe_data")
            
            # Получаем объект пользователя
            from models.user import User
            user_obj = User.query.get(user_id)
            
            if not user_obj:
                return jsonify({'error': 'User not found'}), 404
            
            print(f"DEBUG: Calling recipe_service.create_recipe_with_steps")
            # Создаем рецепт
            new_recipe = self.recipe_service.create_recipe_with_steps(
                recipe_data, step_images, user_obj
            )
            
            if new_recipe:
                print(f"DEBUG: Recipe created successfully with ID: {new_recipe.id}")
                # Возвращаем рецепт с изображениями шагов
                recipe_dict = new_recipe.to_dict()
                return jsonify(recipe_dict), 201
            else:
                print(f"DEBUG: Recipe creation failed")
                return jsonify({'error': 'Failed to create recipe'}), 500
                
        except Exception as e:
            print(f"Error in create_recipe_with_steps: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Internal server error'}), 500