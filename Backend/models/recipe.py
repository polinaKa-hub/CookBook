from .db import db
from datetime import datetime

class Recipe(db.Model):
    __tablename__ = 'recipes'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    ingredients = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text)
    cooking_time = db.Column(db.Integer, default=0)
    category = db.Column(db.String(100))
    difficulty = db.Column(db.String(50), default='Легкий')
    image_url = db.Column(db.String(500))
    author = db.Column(db.String(100))
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    servings = db.Column(db.Integer, default=6)  # Добавляем поле servings
    # Статистика
    rating = db.Column(db.Float, default=0.0)
    rating_count = db.Column(db.Integer, default=0)
    views = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def step_images_list(self):
        """Геттер: получить список изображений шагов"""
        if hasattr(self, '_step_images_cache'):
            return self._step_images_cache
        
        # Ленивая загрузка при первом обращении
        from models.recipe import RecipeStepImage
        step_images = RecipeStepImage.query.filter_by(
            recipe_id=self.id
        ).order_by(RecipeStepImage.step_index).all()
        
        self._step_images_cache = [img.to_dict() for img in step_images]
        return self._step_images_cache
    
    @step_images_list.setter
    def step_images_list(self, value):
        """Сеттер: установить кэшированные изображения шагов"""
        self._step_images_cache = value
    
    def to_dict(self):
        import json
        ingredients = self.ingredients
        instructions = self.instructions
        
        # Пытаемся парсить как JSON
        try:
            if ingredients.startswith('[') or ingredients.startswith('{'):
                ingredients = json.loads(ingredients)
        except:
            pass  # Оставляем как строку если не JSON
        
        try:
            if instructions.startswith('[') or instructions.startswith('{'):
                instructions = json.loads(instructions)
        except:
            pass  # Оставляем как строку если не JSON
        
        # ДЕБАГ: Проверяем image_url
        print(f"DEBUG [Recipe.to_dict]: id={self.id}, image_url={self.image_url}")
        return {
            'id': self.id,
            'title': self.title,
            'ingredients': ingredients,
            'instructions': instructions,
            'cooking_time': self.cooking_time,
            'category': self.category,
            'difficulty': self.difficulty,
            'image_url': self.image_url,
            'author': self.author,
            'author_id': self.author_id,            
            'servings': self.servings,  # Добавляем servings в ответ API
            'rating': round(self.rating, 1) if self.rating else 0.0,
            'rating_count': self.rating_count,
            'views': self.views,
            'likes': self.likes,
            'comments_count': self.comments_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'step_images': self.step_images_list 
        }

class Rating(db.Model):
    __tablename__ = 'ratings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'recipe_id', name='unique_user_recipe_rating'),)

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Связи
    user = db.relationship('User', backref='comments')
    recipe = db.relationship('Recipe', backref='comments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'recipe_id': self.recipe_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Unknown',
            'text': self.text,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    

class RecipeStepImage(db.Model):
    __tablename__ = 'recipe_step_images'
    
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    step_index = db.Column(db.Integer, nullable=False)  # Индекс шага (0, 1, 2...)
    image_url = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Связь с рецептом
    recipe = db.relationship('Recipe', backref=db.backref('step_images', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'recipe_id': self.recipe_id,
            'step_index': self.step_index,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }