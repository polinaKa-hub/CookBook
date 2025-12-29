import React, { useState, useEffect } from 'react';
import './App.css';
import RecipeCard from './components/RecipeCard';
import RecipeForm from './components/RecipeForm';
import SearchFilters from './components/SearchFilters';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import RecipeDetail from './components/RecipeDetail';
import UserProfile from './components/UserProfile';
import RecipeEditForm from './components/RecipeEditForm';
import Swal from 'sweetalert2';
const API_URL = process.env.REACT_APP_API_URL || 'https://cookbook-backend-kupo.onrender.com';


function App() {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [view, setView] = useState('main'); // 'main', 'myRecipes', 'recipeBook', 'detail'
  const [loading, setLoading] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddRecipeForm, setShowAddRecipeForm] = useState(false);

  const categories = [...new Set(recipes.map(recipe => recipe.category).filter(Boolean))];
  const difficulties = ['Легкий', 'Средний', 'Сложный'];

  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Загрузка рецептов при старте
  useEffect(() => {
    fetchRecipes();

  }, []);
// Добавьте этот useEffect для обработки событий навигации из RecipeDetail
  useEffect(() => {
    const handleNavigateToMyRecipes = () => {
      setView('myRecipes');
      setShowUserProfile(false);
      setViewingProfileId(null);
      setShowAddRecipeForm(false);
      fetchMyRecipes();
    };

    const handleNavigateToRecipeBook = () => {
      setView('recipeBook');
      setShowUserProfile(false);
      setViewingProfileId(null);
      setShowAddRecipeForm(false);
      fetchRecipeBook();
    };

    const handleOpenAuthModal = (event) => {
      const { view: authType } = event.detail;
      setAuthView(authType);
      setShowAuthModal(true);
    };

    // Подписываемся на события
    window.addEventListener('navigateToMyRecipes', handleNavigateToMyRecipes);
    window.addEventListener('navigateToRecipeBook', handleNavigateToRecipeBook);
    window.addEventListener('openAuthModal', handleOpenAuthModal);

    // Проверяем localStorage для навигации при загрузке
    const defaultView = localStorage.getItem('defaultView');
    if (defaultView && (defaultView === 'myRecipes' || defaultView === 'recipeBook')) {
      localStorage.removeItem('defaultView');
      if (defaultView === 'myRecipes') {
        handleNavigateToMyRecipes();
      } else {
        handleNavigateToRecipeBook();
      }
    }

    // Отписка при размонтировании
    return () => {
      window.removeEventListener('navigateToMyRecipes', handleNavigateToMyRecipes);
      window.removeEventListener('navigateToRecipeBook', handleNavigateToRecipeBook);
      window.removeEventListener('openAuthModal', handleOpenAuthModal);
    };
  }, [currentUser]); // Добавьте currentUser в зависимости, если нужно

  // Проверка авторизации
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('https://cookbook-backend-kupo.onrender.com/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
    }
  };

  const handleRegister = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCurrentUser(data.user);
        setShowAuthModal(false);
        //alert('Регистрация успешна!');
        Swal.fire({
          title: 'Регистрация успешна!',
          //text: 'Вы уверены, что хотите удалить этот рецепт?',
          icon: 'success',
          showCancelButton: false,
          confirmButtonText: 'ОК',
          confirmButtonColor: '#7DBA4A',
        })

      } else {  
        Swal.fire({
        title: 'Ошибка регистрации',
        text: data.error || 'Ошибка регистрации',
        icon: 'cross',
        showCancelButton: false,
        confirmButtonText: 'OK',
        confirmButtonColor: 'rgba(120, 125, 120, 1)',
        })
      }
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      alert('Ошибка при регистрации');
    }
  };

  const handleLogin = async (userData) => {
    try {
      const response = await fetch('https://cookbook-backend-kupo.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCurrentUser(data.user);
        setShowAuthModal(false);
        //alert('Вход выполнен успешно!');
      } else {
        console.error('Ошибка при входе:', data.error);
        
        Swal.fire({
          title: 'Ошибка при выходе:',
          text: data.error,
          icon: 'cross',
          showCancelButton: false,
          confirmButtonText: 'OK',
          confirmButtonColor: 'rgba(120, 125, 120, 1)',
        })
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      
    }
  };

  // Функция для показа профиля:
  // Обновите функцию handleViewProfile
  const handleViewProfile = (userId) => {
    setViewingProfileId(userId);
    setShowUserProfile(true);
    setView('profile');
    // Сбросим форму добавления рецепта при переходе в профиль
    setShowAddRecipeForm(false);
  };
  // Функция для показа своего профиля:
  // Внутри компонента App
  const handleMyProfile = () => {
    if (currentUser) {
      setViewingProfileId(currentUser.id);
      setShowUserProfile(true);
      setView('profile');
    } else {
      setShowAuthModal(true);
      setAuthView('login');
      //alert('Для просмотра профиля необходимо войти в систему');
      
      Swal.fire({
        title: 'Войдите в систему',
        text: 'Для просмотра профиля необходимо войти в систему',
        //icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Хорошо',
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
      })   

    }
  };

  const handleBackFromProfile = () => {
    setShowUserProfile(false);
    setViewingProfileId(null);
    setView('main');
  };

  const handleGoToMyRecipes = () => {
    setView('myRecipes');
    setShowUserProfile(false);
    setViewingProfileId(null);
    setShowAddRecipeForm(true); // Исправлено: setShowAddRecipeForm(true) вместо setShowAddRecipeForm(false)
  };

  const handleLogout = async () => {
    try {
      await fetch('https://cookbook-backend-kupo.onrender.com/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setCurrentUser(null);
      setView('main');
      setShowAddRecipeForm(false);
      //alert('Выход выполнен успешно!');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://cookbook-backend-kupo.onrender.com/api/recipes");
      if (!response.ok) throw new Error('Ошибка загрузки рецептов');
      const data = await response.json();
      setRecipes(data);
      setFilteredRecipes(data);
    } catch (error) {
      console.error('Ошибка при загрузке рецептов:', error);
      alert('Не удалось загрузить рецепты. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRecipes = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      setAuthView('login');
      //alert('Для просмотра ваших рецептов необходимо войти в систему');
      Swal.fire({
        title: 'Войдите в систему',
        text: 'Для просмотра ваших рецептов необходимо войти в систему',
        //icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Хорошо',
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
      })       
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://cookbook-backend-kupo.onrender.com/api/recipes/my', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('My recipes API response:', data); // Для отладки
      
      // Проверяем, что data - массив
      if (Array.isArray(data)) {
        setFilteredRecipes(data);
      } else if (data && data.error) {
        // Если API вернул ошибку
        console.error('API error:', data.error);
        alert(`Ошибка: ${data.error}`);
        setFilteredRecipes([]);
      } else {
        console.error('API вернул не массив:', data);
        setFilteredRecipes([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке моих рецептов:', error);
      alert('Не удалось загрузить ваши рецепты');
      setFilteredRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipeBook = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      setAuthView('login');
      //alert('Для просмотра книги рецептов необходимо войти в систему');
      Swal.fire({
        title: 'Войдите в систему',
        text: 'Для просмотра книги рецептов необходимо войти в систему',
        //icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Хорошо',
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
      })  
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://cookbook-backend-kupo.onrender.com/api/auth/favorites', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Favorites API response:', data);
      
      let recipeIds = [];
      
      // Обрабатываем разные форматы ответа
      if (Array.isArray(data)) {
        recipeIds = data;
      } else if (data && Array.isArray(data.favorites)) {
        recipeIds = data.favorites;
      } else if (data && data.error) {
        console.error('API error:', data.error);
        alert(`Ошибка: ${data.error}`);
        setFilteredRecipes([]);
        return;
      } else {
        console.error('Неправильный формат ответа API:', data);
        setFilteredRecipes([]);
        return;
      }
      
      console.log('Recipe IDs from favorites:', recipeIds);
      
      // Если нет избранных рецептов
      if (recipeIds.length === 0) {
        setFilteredRecipes([]);
        return;
      }
      
      // Загружаем информацию о каждом рецепте
      const recipesPromises = recipeIds.map(async (id) => {
        try {
          const recipeResponse = await fetch(`https://cookbook-backend-kupo.onrender.com/api/recipes/${id}`);
          if (recipeResponse.ok) {
            return await recipeResponse.json();
          } else {
            console.error(`Failed to fetch recipe ${id}`);
            return null;
          }
        } catch (error) {
          console.error(`Error fetching recipe ${id}:`, error);
          return null;
        }
      });
      
      const recipes = await Promise.all(recipesPromises);
      // Фильтруем null значения
      const validRecipes = recipes.filter(recipe => recipe !== null);
      console.log('Loaded recipes for favorites:', validRecipes);
      setFilteredRecipes(validRecipes);
      
    } catch (error) {
      console.error('Ошибка при загрузке книги рецептов:', error);
      alert('Не удалось загрузить избранные рецепты');
      setFilteredRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      // В зависимости от текущего вида показываем соответствующие рецепты
      if (view === 'myRecipes') {
        fetchMyRecipes();
      } else if (view === 'recipeBook') {
        fetchRecipeBook();
      } else {
        setFilteredRecipes(Array.isArray(recipes) ? recipes : []);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://cookbook-backend-kupo.onrender.com/api/recipes/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setFilteredRecipes(data);
      } else {
        setFilteredRecipes([]);
      }
    } catch (error) {
      console.error('Ошибка при поиске:', error);
      // Локальная фильтрация
      const sourceRecipes = view === 'myRecipes' 
        ? filteredRecipes 
        : view === 'recipeBook' 
          ? filteredRecipes 
          : recipes;
      
      if (Array.isArray(sourceRecipes)) {
        const filtered = sourceRecipes.filter(recipe => 
          recipe.title.toLowerCase().includes(query.toLowerCase()) ||
          (recipe.ingredients && recipe.ingredients.toLowerCase().includes(query.toLowerCase())) ||
          (recipe.category && recipe.category.toLowerCase().includes(query.toLowerCase()))
        );
        setFilteredRecipes(filtered);
      } else {
        setFilteredRecipes([]);
      }
    } finally {
      setLoading(false);
    }
  };
  // Добавьте новую функцию для получения списка всех ингредиентов
  const getAllIngredients = () => {
    const ingredientSet = new Set();
    
    recipes.forEach(recipe => {
      if (recipe.ingredients) {
        if (Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach(ing => {
            if (ing.name) {
              ingredientSet.add(ing.name.toLowerCase());
            }
          });
        } else if (typeof recipe.ingredients === 'string') {
          // Парсим строку ингредиентов
          const ingredientsList = recipe.ingredients.split(/[,;]/);
          ingredientsList.forEach(ing => {
            const cleanIng = ing.trim().toLowerCase();
            if (cleanIng) {
              // Убираем количество и единицы измерения
              const nameOnly = cleanIng.replace(/\s*[-–]\s*\d+.*$/, '').trim();
              if (nameOnly) {
                ingredientSet.add(nameOnly);
              }
            }
          });
        }
      }
    });
    
    return Array.from(ingredientSet).sort();
  };

  // Обновите функцию applyFilters для поддержки ингредиентов
  const applyFilters = async (filters) => {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    // Убрали фильтр по времени
    if (filters.includeIngredients && filters.includeIngredients.length > 0) {
      params.append('ingredients', filters.includeIngredients.join(','));
    }
    if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
      params.append('exclude_ingredients', filters.excludeIngredients.join(','));
    }

    setLoading(true);
    try {
      const response = await fetch(`https://cookbook-backend-kupo.onrender.com/api/recipes/filter?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setFilteredRecipes(data);
      } else {
        // Локальная фильтрация если API не поддерживает фильтры по ингредиентам
        let filtered = recipes;
        
        if (filters.category) {
          filtered = filtered.filter(recipe => recipe.category === filters.category);
        }
        if (filters.difficulty) {
          filtered = filtered.filter(recipe => recipe.difficulty === filters.difficulty);
        }
        
        // Фильтрация по включаемым ингредиентам
        if (filters.includeIngredients && filters.includeIngredients.length > 0) {
          filtered = filtered.filter(recipe => {
            const recipeIngredients = getRecipeIngredientsAsArray(recipe);
            return filters.includeIngredients.every(ing => 
              recipeIngredients.some(recipeIng => 
                recipeIng.toLowerCase().includes(ing.toLowerCase())
              )
            );
          });
        }
        
        // Фильтрация по исключаемым ингредиентам
        if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
          filtered = filtered.filter(recipe => {
            const recipeIngredients = getRecipeIngredientsAsArray(recipe);
            return !filters.excludeIngredients.some(ing => 
              recipeIngredients.some(recipeIng => 
                recipeIng.toLowerCase().includes(ing.toLowerCase())
              )
            );
          });
        }
        
        setFilteredRecipes(filtered);
      }
    } catch (error) {
      console.error('Ошибка при фильтрации:', error);
      // Локальная фильтрация при ошибке
      let filtered = recipes;
      
      if (filters.category) {
        filtered = filtered.filter(recipe => recipe.category === filters.category);
      }
      if (filters.difficulty) {
        filtered = filtered.filter(recipe => recipe.difficulty === filters.difficulty);
      }
      if (filters.includeIngredients && filters.includeIngredients.length > 0) {
        filtered = filtered.filter(recipe => {
          const recipeIngredients = getRecipeIngredientsAsArray(recipe);
          return filters.includeIngredients.every(ing => 
            recipeIngredients.some(recipeIng => 
              recipeIng.toLowerCase().includes(ing.toLowerCase())
            )
          );
        });
      }
      if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
        filtered = filtered.filter(recipe => {
          const recipeIngredients = getRecipeIngredientsAsArray(recipe);
          return !filters.excludeIngredients.some(ing => 
            recipeIngredients.some(recipeIng => 
              recipeIng.toLowerCase().includes(ing.toLowerCase())
            )
          );
        });
      }
      
      setFilteredRecipes(filtered);
    } finally {
      setLoading(false);
    }
  };

  // Вспомогательная функция для получения ингредиентов как массива
  const getRecipeIngredientsAsArray = (recipe) => {
    if (!recipe.ingredients) return [];
    
    if (Array.isArray(recipe.ingredients)) {
      return recipe.ingredients.map(ing => 
        typeof ing === 'string' ? ing : ing.name || ''
      ).filter(Boolean);
    }
    
    if (typeof recipe.ingredients === 'string') {
      return recipe.ingredients.split(/[,;]/).map(ing => ing.trim()).filter(Boolean);
    }
    
    return [];
  };

  const handleRemoveFromFavorites = async (recipeId) => {
    if (!currentUser) {
      //alert('Для удаления из избранного необходимо войти в систему');
      Swal.fire({
        title: 'Войдите в систему',
        text: 'Для удаления из избранного необходимо войти в систему',
        //icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Хорошо',
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
      })        
      return;
    }

    try {
      const response = await fetch('https://cookbook-backend-kupo.onrender.com/api/auth/favorites/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe_id: recipeId }),
        credentials: 'include'
      });

      if (response.ok) {
        //alert('Рецепт удален из избранного');
        
        // Обновляем состояние
        if (view === 'recipeBook') {
          fetchRecipeBook(); // Перезагружаем список избранного
        }
        
        // Обновляем список рецептов в основном представлении
        setRecipes(prev => prev.map(recipe => 
          recipe.id === recipeId ? { ...recipe, isFavorite: false } : recipe
        ));
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка при удалении из избранного');
      }
    } catch (error) {
      console.error('Ошибка при удалении из избранного:', error);
    }
  };

  const addRecipe = async (recipeData) => {
    if (!currentUser) {
      setShowAuthModal(true);
      setAuthView('login');
      //alert('Для добавления рецепта необходимо войти в систему');
      Swal.fire({
        title: 'Войдите в систему',
        text: 'Для добавления рецепта необходимо войти в систему',
        //icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Хорошо',
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
      })           
      return;
    }
    
    // Эта функция теперь должна вызываться из RecipeForm.js напрямую
    // Удалите или закомментируйте старый код, так как отправка происходит в RecipeForm.js
    console.log('Recipe creation triggered from RecipeForm');
  };
  
 // Функция обновления рецепта
  const handleUpdateRecipe = async (recipeId, formData) => {
    console.log('Updating recipe:', recipeId);
    
    try {
      const response = await fetch(`https://cookbook-backend-kupo.onrender.com/api/recipes/${recipeId}/update-with-steps`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include'
        // НЕ устанавливайте Content-Type вручную для FormData!
      });
      
      console.log('Update response status:', response.status);
      console.log('Update response headers:', [...response.headers.entries()]);
      
      if (response.ok) {
        const updatedRecipe = await response.json();
        console.log('Recipe updated successfully:', updatedRecipe);
        
        // Обновляем состояние рецептов
        setRecipes(prev => prev.map(recipe => 
          recipe.id === recipeId ? updatedRecipe : recipe
        ));
        setFilteredRecipes(prev => prev.map(recipe => 
          recipe.id === recipeId ? updatedRecipe : recipe
        ));
        
        setShowEditModal(false);
        setEditingRecipe(null);
        //alert('Рецепт успешно обновлен!');
        
        // Обновляем текущий выбранный рецепт если он открыт
        if (selectedRecipe && selectedRecipe.id === recipeId) {
          setSelectedRecipe(updatedRecipe);
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update error:', error);
        alert(`Ошибка при обновлении: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Ошибка при обновлении рецепта: ' + error.message);
    }
  };
  // Функция удаления рецепта
  const handleDeleteRecipe = async (recipeId) => {

    try {
      const response = await fetch(`https://cookbook-backend-kupo.onrender.com/api/recipes/${recipeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      console.log('Delete response status:', response.status); // Добавьте эту строку
      const responseData = await response.json().catch(() => ({}));
      console.log('Delete response data:', responseData); // Добавьте эту строку    
      
      if (response.ok) {
        setRecipes(prev => prev.filter(r => r.id !== recipeId));
        setFilteredRecipes(prev => prev.filter(r => r.id !== recipeId));
        setShowEditModal(false);
        setEditingRecipe(null);
        //alert('Рецепт успешно удален!');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Ошибка при удалении рецепта');
    }
  };

  const viewRecipe = async (recipeId) => {
    try {
      const response = await fetch(`https://cookbook-backend-kupo.onrender.com/api/recipes/${recipeId}`);
      const recipe = await response.json();
      setSelectedRecipe(recipe);
      setView('detail');
    } catch (error) {
      console.error('Ошибка при загрузке рецепта:', error);
    }
  };

// Обновите render для RecipeDetail в компоненте App

  const backToList = () => {
    // Возвращаемся к предыдущему виду
    if (view === 'detail') {
      // Проверяем localStorage для определения куда вернуться
      const defaultView = localStorage.getItem('defaultView');
      
      if (defaultView === 'myRecipes') {
        setView('myRecipes');
        setShowAddRecipeForm(false);
        fetchMyRecipes();
      } else if (defaultView === 'recipeBook') {
        setView('recipeBook');
        setShowAddRecipeForm(false);
        fetchRecipeBook();
      } else {
        setView('main');
        setShowAddRecipeForm(false);
        fetchRecipes();
      }
      
      setSelectedRecipe(null);
      localStorage.removeItem('defaultView');
    }
  };

  const checkIfFavorite = async (recipeId) => {
    if (!currentUser) return false;
    
    try {
      const response = await fetch('https://cookbook-backend-kupo.onrender.com/api/auth/favorites', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        let favoriteIds = [];
        
        if (Array.isArray(data)) {
          favoriteIds = data;
        } else if (data && Array.isArray(data.favorites)) {
          favoriteIds = data.favorites;
        }
        
        return favoriteIds.includes(recipeId);
      }
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
    
    return false;
  };

  const handleAddToFavorites = async (recipeId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      setAuthView('login');
      //alert('Для добавления в избранное необходимо войти в систему');
      Swal.fire({
        title: 'Войдите в систему',
        text: 'Для добавления рецепта в книгу необходимо войти в систему',
        //icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Хорошо',
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
      })           
      return;
    }

    // Проверяем, не добавлен ли уже рецепт
    const isFavorite = await checkIfFavorite(recipeId);
    if (isFavorite) {
      //alert('Этот рецепт уже в избранном!');
      Swal.fire({
        title: 'Уже в книге',
        text: 'Этот рецепт уже есть в книге!',
        //icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Хорошо',
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
      })         
      return;
    }

    try {
      const response = await fetch('https://cookbook-backend-kupo.onrender.com/api/auth/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe_id: recipeId }),
        credentials: 'include'
      });

      if (response.ok) {
        //alert('Рецепт добавлен в избранное!');
        // Если мы на странице "Книга рецептов", обновляем список
        if (view === 'recipeBook') {
          fetchRecipeBook();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка при добавлении в избранное');
      }
    } catch (error) {
      console.error('Ошибка при добавлении в избранное:', error);
    }
  };

  // Обработчик перехода на главную
  const goToMain = () => {
    setView('main');
    setShowAddRecipeForm(false);
    fetchRecipes();
  };

  // Обработчик перехода в "Мои рецепты"
  const goToMyRecipes = () => {
    setView('myRecipes');
    setShowAddRecipeForm(false);
    fetchMyRecipes();
  };

  // Обработчик перехода в "Книгу рецептов"
  const goToRecipeBook = () => {
    setView('recipeBook');
    setShowAddRecipeForm(false);
    fetchRecipeBook();
  };

  // Детальный просмотр рецепта
  if (view === 'detail' && selectedRecipe) {
    return (
      <RecipeDetail 
        recipe={selectedRecipe}
        currentUser={currentUser}
        onBack={backToList}
        onAddToFavorites={handleAddToFavorites}
        onViewProfile={handleViewProfile} 
      />
    );
  }

  // Определяем заголовок в зависимости от текущего вида
  const getPageTitle = () => {
    switch(view) {
      case 'myRecipes': return 'Мои рецепты';
      case 'recipeBook': return 'Книга рецептов';
      case 'profile': return 'Профиль пользователя'; // ДОБАВЬТЕ
      default: return 'Подбор рецептов';
    }
  };

  // Список рецептов
  return (
    <div className="App">
      <header className="app-header">
        <div className="header-top">
          <div className="logo" onClick={goToMain} style={{ cursor: 'pointer', fontSize:'30pt' }}>Cook Book</div>
          {currentUser ? (
            <div className="user-nav">
              <button 
                onClick={handleMyProfile}
                className={`nav-btn ${view === 'profile' ? 'active' : ''}`} // ДОБАВЬТЕ active класс
              
                title="Мой профиль"
              >
                <i className="fas fa-user-circle"></i>
                <span>Профиль</span>
              </button>
              <button 
                onClick={goToMyRecipes} 
                className={`nav-btn ${view === 'myRecipes' ? 'active' : ''}`}
              >
                <i className="fas fa-utensils"></i>
                <span>Мои рецепты</span>
              </button>
              <button 
                onClick={goToRecipeBook} 
                className={`nav-btn ${view === 'recipeBook' ? 'active' : ''}`}
              >
                <i className="fas fa-bookmark"></i>
                <span>Книга рецептов</span>
              </button>
              <button onClick={handleLogout} className="logout-btn">
                <i className="fas fa-sign-out-alt"></i>
                <span>Выйти</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthView('login');
                }} 
                className="auth-btn"
              >
                Войти
              </button>
              <button 
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthView('register');
                }} 
                className="auth-btn"
              >
                Регистрация
              </button>
            </div>
          )}
        </div>
              {/* Показываем подзаголовок для всех страниц кроме профиля */}
        {view !== 'profile' && view !== 'detail' && (
          <>
            <div className="container">
              <div className="header-subtitle">{getPageTitle()}</div>
            </div>
            <div className="header-divider"></div>
          </>
        )}
        
        {/* Для профиля показываем свой подзаголовок */}
        {view === 'profile' && (
          <>
            <div className="container">
              <div className="header-subtitle">Профиль пользователя</div>
            </div>
            <div className="header-divider"></div>
          </>
        )}

        {/* <div className="container">
          <div className="header-subtitle">{getPageTitle()}</div>
        </div>
        <div className="header-divider"></div> */}
      </header>
      
      {/* РАЗДЕЛ ПРОФИЛЯ (так же как "Мои рецепты" и "Книга рецептов") */}
      {view === 'profile' && showUserProfile && viewingProfileId && (
        <div className="main-content profile-page">
          <UserProfile
            currentUser={currentUser}
            profileUserId={viewingProfileId}
            onBack={handleBackFromProfile}
            onViewRecipe={viewRecipe}
            onGoToMyRecipes={handleGoToMyRecipes}
          />
        </div>
      )}
      {/* Поиск и фильтры на всех страницах кроме профиля */}
      {(view === 'main' || view === 'myRecipes' || view === 'recipeBook') && (
        <>
          <div className="main-content">
            <SearchFilters 
              onSearch={handleSearch}
              onFilter={applyFilters}
              categories={categories}
              difficulties={difficulties}
              availableIngredients={getAllIngredients()}
            />
          </div>
          <div className="header-divider"></div>
        </>
      )}

      {/* ОСНОВНОЙ КОНТЕНТ для главной, моих рецептов и книги рецептов */}
      {(view === 'main' || view === 'myRecipes' || view === 'recipeBook') && (
        <>


          <div className="main-content">
            {/* Показываем кнопку "Добавить рецепт" только в разделе "Мои рецепты" */}
            {currentUser && view === 'myRecipes' && !showAddRecipeForm && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button 
                  onClick={() => setShowAddRecipeForm(true)} 
                  className="submit-btn"
                  style={{ width: 'auto', padding: '12px 30px', backgroundColor: '#7DBA4A', color: '#ffffffff'}}
                >
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  Добавить рецепт
                </button>
              </div>
            )}

            {/* Показываем форму добавления рецепта только в разделе "Мои рецепты" */}
            {currentUser && view === 'myRecipes' && showAddRecipeForm && (
              <div style={{ marginBottom: '30px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{ margin: 0 }}>Добавление нового рецепта</h3>
                  <button 
                    onClick={() => setShowAddRecipeForm(false)} 
                    className="cancel-btn"
                    style={{ padding: '8px 16px' }}
                  >
                    Отмена
                  </button>
                </div>
                <RecipeForm onAddRecipe={addRecipe} categories={categories} />
              </div>
            )}

            <div className="recipes-list">
              <div className="recipes-count">
                {view === 'myRecipes' && 'Ваши рецепты: '}
                {view === 'recipeBook' && 'Избранные рецепты: '}
                {view === 'main' && 'Все рецепты: '}
                Найдено {Array.isArray(filteredRecipes) ? filteredRecipes.length : 0} рецептов
              </div>

              {loading && <div className="loading">Загрузка...</div>}

              {!loading && (!Array.isArray(filteredRecipes) || filteredRecipes.length === 0) && (
                <div className="no-recipes">
                  <p>😔 Рецепты не найдены</p>
                  {view === 'myRecipes' && (
                    <p>У вас пока нет добавленных рецептов</p>
                  )}
                  {view === 'recipeBook' && (
                    <p>У вас пока нет избранных рецептов</p>
                  )}
                  {view === 'main' && (
                    <p>Попробуйте изменить параметры поиска или фильтры</p>
                  )}
                </div>
              )}

              {!loading && Array.isArray(filteredRecipes) && filteredRecipes.map(recipe => (
                <RecipeCard 
                  key={recipe.id}
                  recipe={recipe}
                  onView={viewRecipe}
                  onAddToFavorites={handleAddToFavorites}
                  onRemoveFromFavorites={handleRemoveFromFavorites}
                  onViewProfile={handleViewProfile}
                  currentUser={currentUser}
                  checkIfFavorite={checkIfFavorite}
                  onEdit={(recipe) => {
                    const loadRecipeDetails = async () => {
                      try {
                        const response = await fetch(`https://cookbook-backend-kupo.onrender.com/api/recipes/${recipe.id}`);
                        const fullRecipe = await response.json();
                        setEditingRecipe(fullRecipe);
                        setShowEditModal(true);
                      } catch (error) {
                        console.error('Error loading recipe details:', error);
                        setEditingRecipe(recipe);
                        setShowEditModal(true);
                      }
                    };
                    
                    loadRecipeDetails();
                  }}
                  onDelete={handleDeleteRecipe}
                  isMyRecipe={view === 'myRecipes'}
                  currentView={view}
                />
              ))}

              {/* Модальное окно редактирования */}
              {showEditModal && editingRecipe && (
                <RecipeEditForm
                  recipe={editingRecipe}
                  onUpdate={handleUpdateRecipe}
                  onCancel={() => {
                    setShowEditModal(false);
                    setEditingRecipe(null);
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* ФУТЕР для всех страниц кроме детального просмотра рецепта */}
      {view !== 'detail' && (
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-divider"></div>
            <div className="footer-logo">Cook Book</div>
            <div className="footer-divider"></div>
          </div>
        </footer>
      )}

      {/* МОДАЛЬНОЕ ОКНО АВТОРИЗАЦИИ */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-btn"
              onClick={() => setShowAuthModal(false)}
            >
              ×
            </button>
            
            {authView === 'login' ? (
              <LoginForm 
                onLogin={handleLogin}
                onSwitchToRegister={() => setAuthView('register')}
              />
            ) : (
              <RegisterForm 
                onRegister={handleRegister}
                onSwitchToLogin={() => setAuthView('login')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;