import React, { useState, useEffect } from 'react';
import RecipeCard from './RecipeCard';
import './FavoritesPage.css';

const FavoritesPage = ({ currentUser, onBack }) => {
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/favorites', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // data.favorites содержит ID рецептов
        // Нужно загрузить информацию о каждом рецепте
        const recipesPromises = data.favorites.map(id =>
          fetch(`http://localhost:5000/api/recipes/${id}`).then(r => r.json())
        );
        
        const recipes = await Promise.all(recipesPromises);
        setFavoriteRecipes(recipes);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (recipeId) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/favorites/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe_id: recipeId }),
        credentials: 'include'
      });
      
      if (response.ok) {
        // Удаляем из списка
        setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
        alert('Рецепт удален из избранного');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  return (
    <div className="favorites-page">
      <div className="favorites-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>Мои избранные рецепты</h2>
      </div>
      
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : favoriteRecipes.length === 0 ? (
        <div className="no-favorites">
          <p>У вас пока нет избранных рецептов</p>
        </div>
      ) : (
        <div className="favorites-list">
          {favoriteRecipes.map(recipe => (
            <div key={recipe.id} className="favorite-item">
              <RecipeCard
                recipe={recipe}
                onView={() => {}} // Обработчик просмотра
                currentUser={currentUser}
              />
              <button 
                className="remove-favorite-btn"
                onClick={() => handleRemoveFavorite(recipe.id)}
              >
                Удалить из избранного
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;