from models.db import db
from models.recipe import Recipe
from sqlalchemy import or_
import os
import json
from werkzeug.utils import secure_filename

class RecipeService:
    def __init__(self):
        self.ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
        self.UPLOAD_FOLDER = 'uploads/recipes'
    
    def allowed_file(self, filename):
        if not filename or '.' not in filename:
            return False
        
        # Проверяем расширение
        return filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS
    
    def save_image(self, file):
        """Сохранить изображение и вернуть URL"""
        if file and file.filename and self.allowed_file(file.filename):
            # Получаем оригинальное имя и расширение
            original_filename = file.filename
            
            # Проверяем расширение
            if '.' in original_filename:
                file_ext = original_filename.rsplit('.', 1)[1].lower()
            else:
                file_ext = ''
            
            if file_ext not in self.ALLOWED_EXTENSIONS:
                print(f"DEBUG: File extension '{file_ext}' not allowed")
                return None
            
            # Создаем уникальное имя файла С СОХРАНЕНИЕМ РАСШИРЕНИЯ
            from datetime import datetime
            import uuid
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            
            # Генерируем безопасное имя файла с расширением
            unique_filename = f"{timestamp}_{unique_id}.{file_ext}"
            
            # Убедитесь, что папка существует
            upload_path = self.UPLOAD_FOLDER  # Уже 'uploads/recipes'
            os.makedirs(upload_path, exist_ok=True)
            
            file_path = os.path.join(upload_path, unique_filename)
            
            try:
                print(f"DEBUG: Saving image to {file_path}")
                file.save(file_path)
                
                # Проверяем, что файл сохранен
                if os.path.exists(file_path):
                    file_size = os.path.getsize(file_path)
                    print(f"DEBUG: Image saved successfully, size: {file_size} bytes, path: {file_path}")
                else:
                    print(f"DEBUG: ERROR - File not saved!")
                
                # Возвращаем относительный URL
                return f"/uploads/recipes/{unique_filename}"
            except Exception as e:
                print(f"Error saving image: {e}")
                import traceback
                traceback.print_exc()
                return None
        else:
            print(f"DEBUG: File not allowed or no file. File: {file}, Filename: {file.filename if file else 'No file'}")
        return None
    
    def save_step_images(self, recipe_id, step_images):
        """Сохранить изображения шагов для рецепта"""
        from models.recipe import RecipeStepImage
        
        saved_images = []
        for step_index, image_file in enumerate(step_images):
            if image_file and image_file.filename:
                image_url = self.save_image(image_file)
                if image_url:
                    step_image = RecipeStepImage(
                        recipe_id=recipe_id,
                        step_index=step_index,
                        image_url=image_url
                    )
                    db.session.add(step_image)
                    saved_images.append(step_image)
        
        db.session.commit()
        return saved_images

    def get_all_recipes(self):
        return Recipe.query.order_by(Recipe.created_at.desc()).all()
    
    def get_recipe_by_id(self, recipe_id):
        recipe = Recipe.query.get(recipe_id)
        if recipe:
            recipe.views += 1
            db.session.commit()
        return recipe
    
    def add_recipe(self, recipe_data, user=None):
        try:
            new_recipe = Recipe(
                title=recipe_data.get('title', ''),
                ingredients=recipe_data.get('ingredients', ''),
                instructions=recipe_data.get('instructions', ''),
                cooking_time=recipe_data.get('cooking_time', 0),
                category=recipe_data.get('category', ''),
                difficulty=recipe_data.get('difficulty', 'Легкий'),
                image_url=recipe_data.get('image_url', ''),
                servings=recipe_data.get('servings', 6), 

                author=user.username if user else recipe_data.get('author', 'Гость'),
                author_id=user.id if user else recipe_data.get('author_id')
            )
            
            db.session.add(new_recipe)
            db.session.commit()
            return new_recipe
        except Exception as e:
            db.session.rollback()
            print(f"Error adding recipe: {e}")
            return None
    
    def update_recipe(self, recipe_id, recipe_data, user=None):
        try:
            recipe = Recipe.query.get(recipe_id)
            if not recipe:
                return None
            
            # Проверяем права доступа
            if user and (user.id == recipe.author_id or user.username == "admin"):
                recipe.title = recipe_data.get('title', recipe.title)
                recipe.ingredients = recipe_data.get('ingredients', recipe.ingredients)
                recipe.instructions = recipe_data.get('instructions', recipe.instructions)
                recipe.cooking_time = recipe_data.get('cooking_time', recipe.cooking_time)
                recipe.category = recipe_data.get('category', recipe.category)
                recipe.difficulty = recipe_data.get('difficulty', recipe.difficulty)
                recipe.image_url = recipe_data.get('image_url', recipe.image_url)
                
                db.session.commit()
                return recipe
            return None
        except Exception as e:
            db.session.rollback()
            print(f"Error updating recipe: {e}")
            return None
    
    def delete_recipe(self, recipe_id, user=None):
        try:
            recipe = Recipe.query.get(recipe_id)
            if not recipe:
                print(f"Recipe {recipe_id} not found")
                return False
            
            print(f"Recipe author_id: {recipe.author_id}, User id: {user.id if user else 'No user'}")
            
            # Проверяем права доступа
            if user and (user.id == recipe.author_id or user.username == "admin"):
                db.session.delete(recipe)
                db.session.commit()
                print(f"Recipe {recipe_id} deleted successfully")
                return True
            
            print(f"Access denied: user {user.id if user else 'None'} cannot delete recipe {recipe_id}")
            return False
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting recipe: {e}")
            return False
    
    def search_recipes(self, query):
        if not query:
            return self.get_all_recipes()
        
        query_lower = query.lower()
        
        # Получаем все рецепты и фильтруем на Python
        all_recipes = Recipe.query.all()
        
        results = []
        for recipe in all_recipes:
            # Ищем в названии (основной поиск)
            if recipe.title and query_lower in recipe.title.lower():
                results.append(recipe)
        
        # Сортируем по дате
        results.sort(key=lambda x: x.created_at, reverse=True)
        
        return results
    
    def get_recipes_by_filters(self, category=None, difficulty=None, max_cooking_time=None):
        query = Recipe.query
        
        if category:
            query = query.filter(Recipe.category == category)
        
        if difficulty:
            query = query.filter(Recipe.difficulty == difficulty)
        
        if max_cooking_time:
            query = query.filter(Recipe.cooking_time <= int(max_cooking_time))
        
        return query.order_by(Recipe.created_at.desc()).all()

    def get_recipes_by_ingredients(self, include_ingredients=None, exclude_ingredients=None):
        query = Recipe.query
        
        if include_ingredients:
            include_terms = [term.lower() for term in include_ingredients]
            for term in include_terms:
                query = query.filter(Recipe.ingredients.ilike(f'%{term}%'))
        
        if exclude_ingredients:
            exclude_terms = [term.lower() for term in exclude_ingredients]
            for term in exclude_terms:
                query = query.filter(~Recipe.ingredients.ilike(f'%{term}%'))
        
        return query.order_by(Recipe.created_at.desc()).all()
       
    def increment_likes(self, recipe_id):
        try:
            recipe = Recipe.query.get(recipe_id)
            if recipe:
                recipe.likes += 1
                db.session.commit()
                return recipe
            return None
        except Exception as e:
            db.session.rollback()
            print(f"Error incrementing likes: {e}")
            return None
    
    def get_popular_recipes(self, limit=5):
        return Recipe.query.order_by(Recipe.views.desc()).limit(limit).all()
    
    def get_most_liked_recipes(self, limit=5):
        return Recipe.query.order_by(Recipe.likes.desc()).limit(limit).all()
    
    def get_recipes_by_author(self, author_id):
        return Recipe.query.filter_by(author_id=author_id).order_by(Recipe.created_at.desc()).all()
    
    def get_categories(self):
        categories = db.session.query(Recipe.category).distinct().all()
        return [cat[0] for cat in categories if cat[0]]
    
    def get_user_recipes(self, user_id):
        """Получить рецепты пользователя"""
        return Recipe.query.filter_by(author_id=user_id).order_by(Recipe.created_at.desc()).all()
    
    def create_recipe_with_steps(self, recipe_data, step_images=None, user=None):
        """Создать рецепт с изображениями шагов"""
        try:
            # Преобразуем ingredients и instructions если они JSON строки
            ingredients = recipe_data.get('ingredients', '')
            instructions = recipe_data.get('instructions', '')
            
            # Если это JSON строка, оставляем как есть, иначе преобразуем
            import json
            try:
                # Сохраняем основное изображение если есть
                main_image_url = None
                if 'main_image' in recipe_data and recipe_data['main_image']:
                    main_image_url = self.save_image(recipe_data['main_image'])
                # Проверяем, является ли это валидным JSON
                if ingredients.startswith('['):
                    json.loads(ingredients)
                if instructions.startswith('['):
                    json.loads(instructions)
            except:
                # Если не JSON, оставляем как строку
                pass
            
            new_recipe = Recipe(
                title=recipe_data.get('title', ''),
                ingredients=ingredients,
                instructions=instructions,
                cooking_time=recipe_data.get('cooking_time', 0),
                category=recipe_data.get('category', ''),
                difficulty=recipe_data.get('difficulty', 'Легкий'),
                image_url=main_image_url,  # Сохраняем основное изображение
                author=user.username if user else recipe_data.get('author', 'Гость'),
                author_id=user.id if user else None
            )
            
            db.session.add(new_recipe)
            db.session.flush()  # Получаем ID
            print(f"DEBUG: Recipe created with ID: {new_recipe.id}")
            print(f"DEBUG: Step images count: {len(step_images) if step_images else 0}")
            # Сохраняем изображения шагов если есть
            if step_images:
                # self.save_step_images(new_recipe.id, step_images)
                for step_index, image_file in enumerate(step_images):
                    if image_file and image_file.filename:
                        print(f"DEBUG: Saving step {step_index} image: {image_file.filename}")
                        image_url = self.save_image(image_file)
                        if image_url:
                            print(f"DEBUG: Step image saved to: {image_url}")
                            from models.recipe import RecipeStepImage
                            step_image = RecipeStepImage(
                                recipe_id=new_recipe.id,
                                step_index=step_index,
                                image_url=image_url
                            )
                            db.session.add(step_image)
            
            db.session.commit()
            
            # Загружаем связанные изображения шагов
            self._load_step_images(new_recipe)
            return new_recipe
        except Exception as e:
            db.session.rollback()
            print(f"Error adding recipe with steps: {e}")
            return None
    
    def _load_step_images(self, recipe):
        """Загрузить и кэшировать изображения шагов для рецепта"""
        from models.recipe import RecipeStepImage
        step_images = RecipeStepImage.query.filter_by(
            recipe_id=recipe.id
        ).order_by(RecipeStepImage.step_index).all()
        
        # Используем сеттер через property
        recipe.step_images_list = [img.to_dict() for img in step_images]
    

    def get_recipe_with_step_images(self, recipe_id):
        """Получить рецепт с изображениями шагов"""
        recipe = self.get_recipe_by_id(recipe_id)
        if recipe:
            self._load_step_images(recipe)
        return recipe
    
    # recipe_service.py
    def update_recipe_with_steps(self, recipe_id, recipe_data, step_images=None, user=None):
        """Обновить рецепт с изображениями шагов"""
        try:
            recipe = Recipe.query.get(recipe_id)
            if not recipe:
                return None
            
            # Проверяем права доступа
            if user and (user.id == recipe.author_id or user.username == "admin"):
                # Обновляем только переданные поля
                if 'title' in recipe_data:
                    recipe.title = recipe_data['title']
                if 'cooking_time' in recipe_data:
                    recipe.cooking_time = recipe_data.get('cooking_time', recipe.cooking_time)
                if 'category' in recipe_data:
                    recipe.category = recipe_data.get('category', recipe.category)
                if 'difficulty' in recipe_data:
                    recipe.difficulty = recipe_data.get('difficulty', recipe.difficulty)
                if 'servings' in recipe_data:
                    recipe.servings = recipe_data.get('servings', recipe.servings)

                # Обновляем ingredients и instructions если переданы
                if 'ingredients' in recipe_data:
                    ingredients = recipe_data.get('ingredients', '')
                    import json
                    try:
                        if ingredients.startswith('['):
                            json.loads(ingredients)
                        recipe.ingredients = ingredients
                    except:
                        pass
                
                if 'instructions' in recipe_data:
                    instructions = recipe_data.get('instructions', '')
                    import json
                    try:
                        if instructions.startswith('['):
                            json.loads(instructions)
                        recipe.instructions = instructions
                    except:
                        pass
                
                # ВАЖНОЕ ИСПРАВЛЕНИЕ: Обновляем основное изображение если передано
                if 'main_image' in recipe_data and recipe_data['main_image']:
                    main_image_url = self.save_image(recipe_data['main_image'])
                    if main_image_url:
                        recipe.image_url = main_image_url
                        print(f"DEBUG: Updated main image to: {main_image_url}")
                elif recipe_data.get('remove_main_image') == 'true':
                    # Удаляем основное изображение если запрошено
                    recipe.image_url = None
                    print(f"DEBUG: Removed main image")                
                
                # Обновляем изображения шагов только если они переданы
                if step_images is not None:
                    # Удаляем старые изображения шагов
                    from models.recipe import RecipeStepImage
                    RecipeStepImage.query.filter_by(recipe_id=recipe.id).delete()
                    
                    # Сохраняем новые изображения шагов если есть
                    for step_index, image_file in enumerate(step_images):
                        if image_file and image_file.filename:
                            image_url = self.save_image(image_file)
                            if image_url:
                                step_image = RecipeStepImage(
                                    recipe_id=recipe.id,
                                    step_index=step_index,
                                    image_url=image_url
                                )
                                db.session.add(step_image)
                
                db.session.commit()
                
                # Загружаем связанные изображения шагов
                self._load_step_images(recipe)
                return recipe
            
            return None
        except Exception as e:
            db.session.rollback()
            print(f"Error updating recipe with steps: {e}")
            return None