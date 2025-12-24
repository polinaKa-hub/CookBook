// src/components/UserProfile.js
import React, { useState, useEffect } from 'react';
import './UserProfile.css';
//import RecipeCard from './RecipeCard';

const UserProfile = ({ currentUser, profileUserId, onBack, onViewRecipe, onGoToMyRecipes }) => {
  const [userData, setUserData] = useState(null);
  const [userRecipes, setUserRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    bio: '',
    avatar: null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes', 'favorites', 'info'

  // Определяем, это собственный профиль или чужой
  const isOwnProfile = currentUser && profileUserId === currentUser.id;

  useEffect(() => {
    fetchUserProfile();
    if (activeTab === 'recipes') {
      fetchUserRecipes();
    } else if (activeTab === 'favorites' && isOwnProfile) {
      fetchFavoriteRecipes();
    }
  }, [profileUserId, activeTab]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://cookbook-9xc5.onrender.com/api/users/${profileUserId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const user = await response.json();
        setUserData(user);
        setEditForm({
          email: user.email || '',
          bio: user.bio || '',
          avatar: null,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        if (user.avatar_url) {
          setAvatarPreview(user.avatar_url);
        }
      } else {
        // Если API не реализован, используем текущего пользователя для собственного профиля
        if (isOwnProfile && currentUser) {
          const mockUser = {
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email || 'user@example.com',
            bio: currentUser.bio || 'Расскажите о себе',
            joinDate: currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString('ru-RU') : '2023-01-15',
            avatar_url: currentUser.avatar_url || 'https://via.placeholder.com/150',
            recipes_count: userRecipes.length,
            favorites_count: 0
          };
          setUserData(mockUser);
          setEditForm({
            email: mockUser.email,
            bio: mockUser.bio,
            avatar: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setAvatarPreview(mockUser.avatar_url);
        } else {
          // Для чужого профиля используем моковые данные
          const mockUser = {
            id: profileUserId,
            username: 'Пользователь ' + profileUserId,
            email: 'user@example.com',
            bio: 'Любитель готовить вкусные блюда',
            joinDate: '2023-01-15',
            recipes_count: 0,
            favorites_count: 0,
            avatar_url: 'https://via.placeholder.com/150'
          };
          setUserData(mockUser);
          setEditForm({
            email: mockUser.email,
            bio: mockUser.bio,
            avatar: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setAvatarPreview(mockUser.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRecipes = async () => {
    try {
      const response = await fetch(`https://cookbook-9xc5.onrender.com/api/recipes/user/${profileUserId}`);
      if (response.ok) {
        const recipes = await response.json();
        setUserRecipes(recipes);
      }
    } catch (error) {
      console.error('Error fetching user recipes:', error);
    }
  };

  const fetchFavoriteRecipes = async () => {
    try {
      const response = await fetch('https://cookbook-9xc5.onrender.com/api/auth/favorite-recipes', {
        credentials: 'include'
      });
      if (response.ok) {
        const favorites = await response.json();
        setUserRecipes(favorites);
      }
    } catch (error) {
      console.error('Error fetching favorite recipes:', error);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      
      // Добавляем текстовые поля
      formData.append('email', editForm.email);
      formData.append('bio', editForm.bio);
      
      // Добавляем аватар если выбран
      if (editForm.avatar) {
        formData.append('avatar', editForm.avatar);
      }
      
      // Добавляем пароль если изменяется
      if (editForm.currentPassword && editForm.newPassword) {
        formData.append('current_password', editForm.currentPassword);
        formData.append('new_password', editForm.newPassword);
      }
      
      const response = await fetch(`https://cookbook-9xc5.onrender.com/api/users/${profileUserId}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        
        // Обновляем данные пользователя
        setUserData(prev => ({
          ...prev,
          email: updatedUser.email,
          bio: updatedUser.bio,
          avatar_url: updatedUser.avatar_url || prev.avatar_url
        }));
        
        // Сбрасываем форму пароля
        setEditForm(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        
        setIsEditing(false);
        alert('Профиль успешно обновлен!');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка при обновлении профиля');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }
      
      // Проверяем тип файла
      if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
      }
      
      setEditForm(prev => ({ ...prev, avatar: file }));
      
      // Показываем превью
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRecipeClick = () => {
    if (onGoToMyRecipes) {
      onGoToMyRecipes();
    }
  };

  const stats = [
    { 
      label: 'Рецептов', 
      value: userData?.recipes_count || 0, 
      icon: 'fa-utensils',
      onClick: () => setActiveTab('recipes')
    },
    { 
      label: 'В избранном', 
      value: userData?.favorites_count || 0, 
      icon: 'fa-bookmark',
      onClick: () => isOwnProfile && setActiveTab('favorites')
    },
    { 
      label: 'С нами с', 
      value: userData?.joinDate || '2023', 
      icon: 'fa-calendar',
      onClick: null
    }
  ];

  if (loading) {
    return <div className="loading">Загрузка профиля...</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <button className="back-btn" onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Назад
        </button>
      </div>

      <div className="profile-container">
        {/* Боковая панель с информацией */}
        <div className="profile-sidebar">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              <img 
                src={avatarPreview || userData?.avatar_url} 
                alt={userData?.username}
                className="profile-avatar"
              />
              {isOwnProfile && !isEditing && (
                <label className="avatar-upload">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <i className="fas fa-camera"></i>
                </label>
              )}
            </div>
            <h3 className="profile-username">{userData?.username}</h3>
            {isOwnProfile && (
              <button 
                className="edit-profile-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                <i className="fas fa-edit"></i>
                {isEditing ? 'Отменить редактирование' : 'Редактировать профиль'}
              </button>
            )}
          </div>

          {isEditing ? (
            <form className="edit-profile-form" onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Ваш email"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>О себе:</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Расскажите о себе..."
                  rows="3"
                />
              </div>

              {/* Смена пароля */}
              <div className="password-section">
                <h4>Смена пароля</h4>
                <div className="form-group">
                  <label>Текущий пароль:</label>
                  <input
                    type="password"
                    value={editForm.currentPassword}
                    onChange={(e) => setEditForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Введите текущий пароль"
                  />
                </div>
                <div className="form-group">
                  <label>Новый пароль:</label>
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Введите новый пароль"
                  />
                </div>
                <div className="form-group">
                  <label>Подтвердите пароль:</label>
                  <input
                    type="password"
                    value={editForm.confirmPassword}
                    onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Повторите новый пароль"
                  />
                </div>
                {(editForm.newPassword || editForm.confirmPassword) && 
                 editForm.newPassword !== editForm.confirmPassword && (
                  <p className="error-message">Пароли не совпадают</p>
                )}
              </div>

              <div className="form-buttons">
                <button type="submit" className="save-btn">
                  <i className="fas fa-save"></i> Сохранить изменения
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setIsEditing(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="bio-section">
                <h4>О себе</h4>
                <p>{userData?.bio || 'Пользователь еще не добавил информацию о себе'}</p>
              </div>
              <div className="contact-section">
                <h4>Контактная информация</h4>
                <p><i className="fas fa-envelope"></i> {userData?.email}</p>
              </div>
            </div>
          )}

          <div className="profile-stats">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className={`stat-item ${stat.onClick ? 'clickable' : ''} ${activeTab === (index === 0 ? 'recipes' : index === 1 ? 'favorites' : '') ? 'active' : ''}`}
                onClick={stat.onClick}
              >
                <div className="stat-icon">
                  <i className={`fas ${stat.icon}`}></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Основной контент */}
        <div className="profile-content">
          <div className="content-header">
            {/* <div className="tabs">
              <button 
                className={`tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
                onClick={() => setActiveTab('recipes')}
              >
                <i className="fas fa-utensils"></i>
                {isOwnProfile ? 'Мои рецепты' : 'Рецепты пользователя'}
              </button>
              {isOwnProfile && (
                <button 
                  className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                  onClick={() => setActiveTab('favorites')}
                >
                  <i className="fas fa-bookmark"></i>
                  Избранные рецепты
                </button>
              )}
            </div> */}
            
            {isOwnProfile && activeTab === 'recipes' && (
              <div className="action-buttons">
                <button 
                  className="add-recipe-btn"
                  onClick={handleAddRecipeClick}
                >
                  <i className="fas fa-plus"></i> Добавить рецепт
                </button>
              </div>
            )}
          </div>

          {activeTab === 'recipes' && (
            <>
              <div className="recipes-count">
                {userRecipes.length} рецепт{userRecipes.length % 10 === 1 && userRecipes.length % 100 !== 11 ? '' : 
                 userRecipes.length % 10 >= 2 && userRecipes.length % 10 <= 4 && 
                 (userRecipes.length % 100 < 10 || userRecipes.length % 100 >= 20) ? 'а' : 'ов'}
              </div>

              {userRecipes.length === 0 ? (
                <div className="no-recipes-message">
                  <i className="fas fa-utensils"></i>
                  <p>{isOwnProfile ? 'У вас пока нет рецептов' : 'У пользователя пока нет рецептов'}</p>
                  {isOwnProfile && (
                    <button 
                      className="create-first-recipe"
                      onClick={handleAddRecipeClick}
                    >
                      Создать первый рецепт
                    </button>
                  )}
                </div>
              ) : (
                <div className="user-recipes-grid">
                  {userRecipes.map(recipe => (
                    <div 
                      key={recipe.id} 
                      className="profile-recipe-card"
                      onClick={() => onViewRecipe(recipe.id)}
                    >
                      <div className="recipe-image-container">
                        {recipe.image_url ? (
                          <img 
                            src={`http://localhost:5000${recipe.image_url}`} 
                            alt={recipe.title}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="recipe-image-placeholder">
                            <i className="fas fa-image"></i>
                          </div>
                        )}
                      </div>
                      <div className="recipe-card-info">
                        <div className="recipe-category-badge">{recipe.category}</div>
                        <h3 className="recipe-card-title">{recipe.title}</h3>
                        <div className="recipe-card-meta">
                          <span><i className="fas fa-clock"></i> {recipe.cooking_time} мин</span>
                          <span><i className="fas fa-fire"></i> {recipe.difficulty}</span>
                          {recipe.servings && <span><i className="fas fa-users"></i> {recipe.servings} порц</span>}
                        </div>
                        <div className="recipe-card-stats">
                          {/* <span><i className="fas fa-heart"></i> {recipe.likes || 0}</span> */}
                          <span><i className="fas fa-comment"></i> {recipe.comments_count || 0}</span>
                          <span><i className="fas fa-eye"></i> {recipe.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'favorites' && isOwnProfile && (
            <>
              <div className="recipes-count">
                {userRecipes.length} избранн{userRecipes.length === 1 ? 'ый' : 
                 userRecipes.length >= 2 && userRecipes.length <= 4 ? 'ых' : 'ых'} рецепт{userRecipes.length % 10 === 1 && userRecipes.length % 100 !== 11 ? '' : 
                 userRecipes.length % 10 >= 2 && userRecipes.length % 10 <= 4 && 
                 (userRecipes.length % 100 < 10 || userRecipes.length % 100 >= 20) ? 'а' : 'ов'}
              </div>

              {userRecipes.length === 0 ? (
                <div className="no-recipes-message">
                  <i className="fas fa-bookmark"></i>
                  <p>У вас пока нет избранных рецептов</p>
                  <p className="hint">Добавляйте рецепты в избранное, чтобы они отображались здесь</p>
                </div>
              ) : (
                <div className="user-recipes-grid">
                  {userRecipes.map(recipe => (
                    <div 
                      key={recipe.id} 
                      className="profile-recipe-card"
                      onClick={() => onViewRecipe(recipe.id)}
                    >
                      <div className="recipe-image-container">
                        {recipe.image_url ? (
                          <img 
                            src={`http://localhost:5000${recipe.image_url}`} 
                            alt={recipe.title}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="recipe-image-placeholder">
                            <i className="fas fa-image"></i>
                          </div>
                        )}
                      </div>
                      <div className="recipe-card-info">
                        <div className="recipe-category-badge">{recipe.category}</div>
                        <h3 className="recipe-card-title">{recipe.title}</h3>
                        <div className="recipe-card-meta">
                          <span><i className="fas fa-clock"></i> {recipe.cooking_time} мин</span>
                          <span><i className="fas fa-fire"></i> {recipe.difficulty}</span>
                          {recipe.servings && <span><i className="fas fa-users"></i> {recipe.servings} порц</span>}
                        </div>
                        <div className="recipe-card-stats">
                          <span><i className="fas fa-heart"></i> {recipe.likes || 0}</span>
                          <span><i className="fas fa-comment"></i> {recipe.comments_count || 0}</span>
                          <span><i className="fas fa-eye"></i> {recipe.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;