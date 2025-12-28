from models.db import db
from models.recipe import Recipe
from sqlalchemy import or_
import os
import json
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
from datetime import datetime  # Добавить этот импорт
import uuid  # Добавить этот импорт

class RecipeService:
    def __init__(self, use_imgbb=False, upload_folder=None):
        self.ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
        self.UPLOAD_FOLDER = upload_folder or 'uploads/recipes'
        self.use_imgbb = use_imgbb
        
        print(f"DEBUG: RecipeService initialized. Use ImgBB: {use_imgbb}, Upload folder: {self.UPLOAD_FOLDER}")
        
        if use_imgbb:
            try:
                from .imgbb_service import ImgBBService
                self.imgbb_service = ImgBBService()
                print(f"DEBUG: ImgBBService loaded successfully")
            except ImportError as e:
                print(f"ERROR: Cannot import ImgBBService: {e}")
                self.use_imgbb = False
    
    def allowed_file(self, filename):
        if not filename or '.' not in filename:
            return False
        ext = filename.rsplit('.', 1)[1].lower()
        result = ext in self.ALLOWED_EXTENSIONS
        print(f"DEBUG: File '{filename}' allowed: {result}")
        return result
    
    def save_image(self, file, image_type="recipe"):
        """Сохранить изображение и вернуть URL"""
        print(f"DEBUG: Saving image type: {image_type}")
        
        if not file or not file.filename:
            print(f"DEBUG: No file provided")
            return None
        
        if not self.allowed_file(file.filename):
            print(f"DEBUG: File type not allowed: {file.filename}")
            return None
        
        # Получаем расширение файла
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        
        # Используем ImgBB если включено
        if self.use_imgbb and hasattr(self, 'imgbb_service'):
            try:
                print(f"DEBUG: Uploading to ImgBB")
                
                # Генерируем имя файла
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                unique_id = str(uuid.uuid4())[:8]
                filename = f"{image_type}_{timestamp}_{unique_id}.{file_ext}"
                
                # Загружаем на ImgBB
                image_url = self.imgbb_service.upload_image(
                    file=file,
                    name=filename,
                    expiration=0
                )
                
                if image_url:
                    print(f"SUCCESS: Image uploaded to ImgBB: {image_url}")
                    return image_url
                else:
                    print(f"WARNING: Failed to upload to ImgBB, falling back to local")
                    return self._save_image_local(file, file_ext, image_type)
                    
            except Exception as e:
                print(f"ERROR: Exception uploading to ImgBB: {e}")
                return self._save_image_local(file, file_ext, image_type)
        else:
            # Локальное сохранение
            return self._save_image_local(file, file_ext, image_type)
    
    def _save_image_local(self, file, file_ext, image_type="recipe"):
        """Локальное сохранение изображения"""
        try:
            # Генерируем уникальное имя файла
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{image_type}_{timestamp}_{unique_id}.{file_ext}"
            
            # Создаем папку если не существует
            os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
            
            file_path = os.path.join(self.UPLOAD_FOLDER, filename)
            print(f"DEBUG: Saving locally to {file_path}")
            
            file.save(file_path)
            
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"SUCCESS: Image saved locally, size: {file_size} bytes")
                return f"/uploads/recipes/{filename}"
            else:
                print(f"ERROR: Image file not saved!")
                return None
                
        except Exception as e:
            print(f"ERROR: Exception saving image locally: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def save_step_images(self, recipe_id, step_images):
        """Сохранить изображения шагов для рецепта"""
        from models.recipe import RecipeStepImage
        
        saved_images = []
        for step_index, image_file in enumerate(step_images):
            if image_file and image_file.filename:
                print(f"DEBUG: Saving step {step_index} image")
                image_url = self.save_image(image_file, f"step_{recipe_id}")
                if image_url:
                    step_image = RecipeStepImage(
                        recipe_id=recipe_id,
                        step_index=step_index,
                        image_url=image_url
                    )
                    db.session.add(step_image)
                    saved_images.append(step_image)
        
        db.session.commit()
        print(f"DEBUG: Saved {len(saved_images)} step images")
        return saved_images
    
    def delete_local_image(self, image_url):
        """Удалить локальное изображение если оно существует"""
        if image_url and image_url.startswith('/uploads/recipes/'):
            filename = image_url.split('/')[-1]
            file_path = os.path.join(self.UPLOAD_FOLDER, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"DEBUG: Local image deleted: {file_path}")
                except Exception as e:
                    print(f"DEBUG: Error deleting local image: {e}")

    # Остальные методы остаются без изменений, за исключением вызовов save_image
    
    def create_recipe_with_steps(self, recipe_data, step_images=None, user=None):
        """Создать рецепт с изображениями шагов"""
        try:
            # Сохраняем основное изображение если есть
            main_image_url = None
            if 'main_image' in recipe_data and recipe_data['main_image']:
                main_image_url = self.save_image(recipe_data['main_image'], "main_recipe")
            
            # Создаем рецепт
            new_recipe = Recipe(
                title=recipe_data.get('title', ''),
                ingredients=recipe_data.get('ingredients', ''),
                instructions=recipe_data.get('instructions', ''),
                cooking_time=recipe_data.get('cooking_time', 0),
                category=recipe_data.get('category', ''),
                difficulty=recipe_data.get('difficulty', 'Легкий'),
                image_url=main_image_url,
                servings=recipe_data.get('servings', 6),
                author=user.username if user else recipe_data.get('author', 'Гость'),
                author_id=user.id if user else None
            )
            
            db.session.add(new_recipe)
            db.session.flush()
            
            # Сохраняем изображения шагов если есть
            if step_images:
                for step_index, image_file in enumerate(step_images):
                    if image_file and image_file.filename:
                        image_url = self.save_image(image_file, f"step_{new_recipe.id}")
                        if image_url:
                            from models.recipe import RecipeStepImage
                            step_image = RecipeStepImage(
                                recipe_id=new_recipe.id,
                                step_index=step_index,
                                image_url=image_url
                            )
                            db.session.add(step_image)
            
            db.session.commit()
            self._load_step_images(new_recipe)
            return new_recipe
            
        except Exception as e:
            db.session.rollback()
            print(f"Error adding recipe with steps: {e}")
            return None
    
    def update_recipe_with_steps(self, recipe_id, recipe_data, step_images=None, user=None):
        """Обновить рецепт с изображениями шагов"""
        try:
            recipe = Recipe.query.get(recipe_id)
            if not recipe:
                return None
            
            # Проверяем права доступа
            if user and (user.id == recipe.author_id or user.username == "admin"):
                # Обновляем поля
                if 'title' in recipe_data:
                    recipe.title = recipe_data['title']
                if 'cooking_time' in recipe_data:
                    recipe.cooking_time = recipe_data['cooking_time']
                if 'category' in recipe_data:
                    recipe.category = recipe_data['category']
                if 'difficulty' in recipe_data:
                    recipe.difficulty = recipe_data['difficulty']
                if 'servings' in recipe_data:
                    recipe.servings = recipe_data['servings']
                if 'ingredients' in recipe_data:
                    recipe.ingredients = recipe_data['ingredients']
                if 'instructions' in recipe_data:
                    recipe.instructions = recipe_data['instructions']
                
                # Обновляем основное изображение если передано
                if 'main_image' in recipe_data and recipe_data['main_image']:
                    main_image_url = self.save_image(recipe_data['main_image'], "main_recipe")
                    if main_image_url:
                        # Удаляем старое локальное изображение если было
                        if not self.use_imgbb and recipe.image_url:
                            self.delete_local_image(recipe.image_url)
                        recipe.image_url = main_image_url
                        print(f"DEBUG: Updated main image to: {main_image_url}")
                elif recipe_data.get('remove_main_image') == 'true':
                    # Удаляем основное изображение если запрошено
                    if not self.use_imgbb and recipe.image_url:
                        self.delete_local_image(recipe.image_url)
                    recipe.image_url = None
                    print(f"DEBUG: Removed main image")
                
                # Обновляем изображения шагов только если они переданы
                if step_images is not None:
                    from models.recipe import RecipeStepImage
                    
                    # Получаем старые изображения шагов для удаления локальных файлов
                    old_step_images = RecipeStepImage.query.filter_by(recipe_id=recipe.id).all()
                    
                    # Удаляем старые записи из БД
                    RecipeStepImage.query.filter_by(recipe_id=recipe.id).delete()
                    
                    # Удаляем локальные файлы если не используем ImgBB
                    if not self.use_imgbb:
                        for old_image in old_step_images:
                            self.delete_local_image(old_image.image_url)
                    
                    # Сохраняем новые изображения шагов
                    for step_index, image_file in enumerate(step_images):
                        if image_file and image_file.filename:
                            image_url = self.save_image(image_file, f"step_{recipe.id}")
                            if image_url:
                                step_image = RecipeStepImage(
                                    recipe_id=recipe.id,
                                    step_index=step_index,
                                    image_url=image_url
                                )
                                db.session.add(step_image)
                
                db.session.commit()
                self._load_step_images(recipe)
                return recipe
            
            return None
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating recipe with steps: {e}")
            return None        
    
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

    def delete_recipe_images(self, recipe):
        """Удалить все изображения рецепта"""
        try:
            # Удаляем основное изображение
            if recipe.image_url:
                self.delete_local_image(recipe.image_url)
            
            # Удаляем изображения шагов
            from models.recipe import RecipeStepImage
            step_images = RecipeStepImage.query.filter_by(recipe_id=recipe.id).all()
            for step_image in step_images:
                if step_image.image_url:
                    self.delete_local_image(step_image.image_url)
            
            # Удаляем записи из БД
            RecipeStepImage.query.filter_by(recipe_id=recipe.id).delete()
            
            print(f"DEBUG: All images for recipe {recipe.id} deleted")
            return True
        except Exception as e:
            print(f"ERROR deleting recipe images: {e}")
            return False    
    
    
    def delete_recipe(self, recipe_id, user=None):
        try:
            recipe = Recipe.query.get(recipe_id)
            if not recipe:
                print(f"Recipe {recipe_id} not found")
                return False
            
            print(f"Recipe author_id: {recipe.author_id}, User id: {user.id if user else 'No user'}")
            
            # Проверяем права доступа
            if user and (user.id == recipe.author_id or user.username == "admin"):
                # Удаляем изображения перед удалением рецепта
                self.delete_recipe_images(recipe)
                
                # Удаляем сам рецепт
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
 
