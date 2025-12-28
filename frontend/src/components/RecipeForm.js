import React, { useState } from 'react';
import './RecipeForm.css';
import Swal from 'sweetalert2';

// Фиксированный список категорий
const FIXED_CATEGORIES = [
  'Завтрак',
  'Обед',
  'Ужин',
  'Десерт',
  'Выпечка',
  'Салаты',
  'Супы',
  'Закуски',
  'Напитки',
  'Вегетарианское',
  'Диетическое',
  'Праздничное'
];

const RecipeForm = ({ onAddRecipe }) => {
  // Состояние для динамических ингредиентов
  const [ingredients, setIngredients] = useState([
    { id: 1, name: '', amount: '', unit: 'г' }
  ]);

  // Состояние для динамических шагов
  const [steps, setSteps] = useState([
    { id: 1, description: '', image: null, imagePreview: '' }
  ]);

  // Состояние для основных полей рецепта
  const [formData, setFormData] = useState({
    title: '',
    cooking_time: '',
    category: '',  // Только из фиксированного списка
    difficulty: 'Легкий',
    servings: 6, 
    mainImage: null,
    mainImagePreview: '',
  });

  // Состояния для ошибок и touched полей
  const [errors, setErrors] = useState({
    title: '',
    category: '',
    cooking_time: '',
    servings: ''
  });

  const [touched, setTouched] = useState({
    title: false,
    category: false,
    cooking_time: false,
    servings: false
  });

  const [ingredientErrors, setIngredientErrors] = useState([{ name: '', amount: '' }]);
  const [stepErrors, setStepErrors] = useState(['']);

  // Валидация основных полей
  const validateField = (name, value) => {
    switch (name) {
      case 'title':
        if (!value.trim()) return 'Название рецепта обязательно';
        if (value.length > 100) return 'Название не должно превышать 100 символов';
        return '';
      case 'category':
        if (!value) return 'Выберите категорию рецепта';
        return '';
      case 'cooking_time':
        if (!value.trim()) return 'Время приготовления обязательно'; // ← ДОБАВИТЬ ЭТУ СТРОКУ
        if (parseFloat(value) < 0) return 'Время не может быть отрицательным';
        if (parseFloat(value) > 1440) return 'Время не может превышать 24 часа (1440 минут)';
        if (parseFloat(value) < 1) return 'Время должно быть не менее 1 минуты'; // ← ТАКЖЕ МОЖНО ДОБАВИ
        return '';
      case 'servings':
        if (value && parseFloat(value) <= 0) return 'Количество порций должно быть больше 0';
        if (value && parseFloat(value) > 100) return 'Количество порций не должно превышать 100';
        return '';
      default:
        return '';
    }
  };

  // Валидация ингредиента
  const validateIngredient = (index) => {
    const ing = ingredients[index];
    const newErrors = { name: '', amount: '' };
    
    if (!ing.name.trim()) {
      newErrors.name = 'Название ингредиента обязательно';
    }
    if (!ing.amount || parseFloat(ing.amount) <= 0) {
      newErrors.amount = 'Введите корректное количество';
    }
    
    return newErrors;
  };

  // Валидация шага
  const validateStep = (index) => {
    const step = steps[index];
    if (!step.description.trim()) {
      return 'Описание шага обязательно';
    }
    return '';
  };

  const handleMainImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        Swal.fire({
          title: 'Ошибка',
          text: 'Пожалуйста, выберите файл изображения',
          icon: 'error',
          confirmButtonText: 'Хорошо',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          mainImage: file,
          mainImagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Обработчик изменения основных полей
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Валидация в реальном времени для тронутых полей
    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, value)
      }));
    }
  };

  // Обработчик потери фокуса
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  // Добавление нового ингредиента
  const addIngredient = () => {
    const newId = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.id)) + 1 : 1;
    setIngredients([
      ...ingredients,
      { id: newId, name: '', amount: '', unit: 'г' }
    ]);
    setIngredientErrors([...ingredientErrors, { name: '', amount: '' }]);
  };

  // Изменение ингредиента
  const handleIngredientChange = (id, field, value) => {
    const index = ingredients.findIndex(ing => ing.id === id);
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);

    // Валидация ингредиента
    const newErrors = validateIngredient(index);
    const newIngredientErrors = [...ingredientErrors];
    newIngredientErrors[index] = newErrors;
    setIngredientErrors(newIngredientErrors);
  };

  // Обработчик потери фокуса для ингредиента
  const handleIngredientBlur = (id, field) => {
    const index = ingredients.findIndex(ing => ing.id === id);
    const newErrors = validateIngredient(index);
    const newIngredientErrors = [...ingredientErrors];
    newIngredientErrors[index] = { ...newIngredientErrors[index], [field]: newErrors[field] };
    setIngredientErrors(newIngredientErrors);
  };

  // Удаление ингредиента
  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      const index = ingredients.findIndex(ing => ing.id === id);
      setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
      
      // Удаляем ошибки для этого ингредиента
      const newIngredientErrors = [...ingredientErrors];
      newIngredientErrors.splice(index, 1);
      setIngredientErrors(newIngredientErrors);
    } else {
      Swal.fire({
        title: 'Нельзя удалить!',
        text: 'Должен остаться хотя бы один ингредиент',
        icon: 'error',
        showCancelButton: false,
        confirmButtonText: 'Понятно',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  // Добавление нового шага
  const addStep = () => {
    const newId = steps.length > 0 ? Math.max(...steps.map(s => s.id)) + 1 : 1;
    setSteps([
      ...steps,
      { id: newId, description: '', image: null, imagePreview: '' }
    ]);
    setStepErrors([...stepErrors, '']);
  };

  // Изменение описания шага
  const handleStepChange = (id, value) => {
    const index = steps.findIndex(step => step.id === id);
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], description: value };
    setSteps(newSteps);

    // Валидация шага
    const error = validateStep(index);
    const newStepErrors = [...stepErrors];
    newStepErrors[index] = error;
    setStepErrors(newStepErrors);
  };

  // Обработчик потери фокуса для шага
  const handleStepBlur = (id) => {
    const index = steps.findIndex(step => step.id === id);
    const error = validateStep(index);
    const newStepErrors = [...stepErrors];
    newStepErrors[index] = error;
    setStepErrors(newStepErrors);
  };

  // Загрузка изображения для шага
  const handleStepImage = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        Swal.fire({
          title: 'Ошибка',
          text: 'Пожалуйста, выберите файл изображения',
          icon: 'error',
          confirmButtonText: 'Хорошо',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const index = steps.findIndex(step => step.id === id);
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], image: file, imagePreview: reader.result };
        setSteps(newSteps);
      };
      reader.readAsDataURL(file);
    }
  };

  // Удаление изображения шага
  const removeStepImage = (id) => {
    const index = steps.findIndex(step => step.id === id);
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], image: null, imagePreview: '' };
    setSteps(newSteps);
  };

  // Удаление шага
  const removeStep = (id) => {
    if (steps.length > 1) {
      Swal.fire({
        title: 'Удалить шаг?',
        text: 'Вы уверены, что хотите удалить этот шаг приготовления?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Да, удалить!',
        cancelButtonText: 'Отмена',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      }).then((result) => {
        if (result.isConfirmed) {
          const index = steps.findIndex(step => step.id === id);
          setSteps(steps.filter(step => step.id !== id));
          
          // Удаляем ошибки для этого шага
          const newStepErrors = [...stepErrors];
          newStepErrors.splice(index, 1);
          setStepErrors(newStepErrors);
        }
      });
    } else {
      Swal.fire({
        title: 'Нельзя удалить!',
        text: 'Должен остаться хотя бы один шаг',
        icon: 'error',
        confirmButtonText: 'Понятно',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  // Полная валидация формы
  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };
    const newIngredientErrors = [...ingredientErrors];
    const newStepErrors = [...stepErrors];

    // Проверка основных полей
    Object.keys(formData).forEach(key => {
      if (['title', 'category', 'cooking_time', 'servings'].includes(key)) {
        const error = validateField(key, formData[key]);
        newErrors[key] = error;
        if (error) isValid = false;
      }
    });

    // Проверка ингредиентов
    ingredients.forEach((ing, index) => {
      const ingErrors = validateIngredient(index);
      newIngredientErrors[index] = ingErrors;
      if (ingErrors.name || ingErrors.amount) isValid = false;
    });

    // Проверка шагов
    steps.forEach((step, index) => {
      const stepError = validateStep(index);
      newStepErrors[index] = stepError;
      if (stepError) isValid = false;
    });

    // Обновляем состояния ошибок
    setErrors(newErrors);
    setIngredientErrors(newIngredientErrors);
    setStepErrors(newStepErrors);
    
    // Помечаем все поля как touched
    const allTouched = {};
    Object.keys(touched).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!isValid) {
      Swal.fire({
        title: 'Ошибка валидации',
        text: 'Пожалуйста, проверьте заполнение формы',
        icon: 'error',
        confirmButtonText: 'Хорошо',
        confirmButtonColor: '#3085d6',
      });
    }

    return isValid;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Подготовка данных для отправки
    const formDataToSend = new FormData();
    
    // Основные поля
    formDataToSend.append('title', formData.title);
    formDataToSend.append('cooking_time', formData.cooking_time || '0');
    formDataToSend.append('category', formData.category);
    formDataToSend.append('difficulty', formData.difficulty);
    formDataToSend.append('servings', formData.servings || 6);
    
    // Основное изображение
    if (formData.mainImage) {
      formDataToSend.append('main_image', formData.mainImage);
      console.log('Main image added to FormData:', formData.mainImage.name);
    }
    
    // Ингредиенты (отправляем как JSON строку)
    const ingredientsData = ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit
    }));
    formDataToSend.append('ingredients', JSON.stringify(ingredientsData));
    console.log('Ingredients JSON:', JSON.stringify(ingredientsData));

    // Инструкции (шаги)
    const instructionsData = steps.map(step => ({
      description: step.description,
      hasImage: !!step.image
    }));
    formDataToSend.append('instructions', JSON.stringify(instructionsData));
    console.log('Instructions JSON:', JSON.stringify(instructionsData));

    // Изображения шагов
    steps.forEach((step, index) => {
      if (step.image) {
        formDataToSend.append(`step_images_${index}`, step.image);
        console.log(`Step image ${index} added:`, step.image.name);
      }
    });

    // Отладка: проверка FormData
    console.log('FormData entries:');
    for (let pair of formDataToSend.entries()) {
      console.log(pair[0] + ': ', pair[1]);
    }

    try {
      // Используем правильный endpoint
      const response = await fetch('http://localhost:5000/api/recipes/with-steps', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include'  // Для cookies с session_id
      });

      const data = await response.json();
      console.log('Server response:', data);
      
      if (response.ok) {
        await Swal.fire({
          title: 'Успешно!',
          text: 'Рецепт успешно сохранен! ',
          icon: 'success',
          showCancelButton: true,
          cancelButtonText: 'Отмена',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#6c757d',
        }).then((result) => {
          if (result.isConfirmed) {
            resetForm();
          } else {
            // Можно обновить страницу или сделать что-то еще
            // window.location.reload();
          }
        });
        // Сбрасываем форму
        resetForm();
        
        // Вызываем callback если есть
        if (onAddRecipe) {
          onAddRecipe(data);
        }
        // ОБНОВЛЯЕМ СТРАНИЦУ
        window.location.reload();
      } else {
        alert(`Ошибка: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ошибка при отправке формы');
    }
  };
  
  // Сброс формы
  const resetForm = () => {
    setFormData({
      title: '',
      cooking_time: '',
      category: '',
      difficulty: 'Легкий',
      servings: 6,
      mainImage: null,
      mainImagePreview: ''
    });
    setIngredients([{ id: 1, name: '', amount: '', unit: 'г' }]);
    setSteps([{ id: 1, description: '', image: null, imagePreview: '' }]);
    setErrors({
      title: '',
      category: '',
      cooking_time: '',
      servings: ''
    });
    setTouched({
      title: false,
      category: false,
      cooking_time: false,
      servings: false
    });
    setIngredientErrors([{ name: '', amount: '' }]);
    setStepErrors(['']);
  };

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <h3>
        <i className="fas fa-plus-circle"></i>
        Добавление рецепта
      </h3>
      
      <div className="section-line"></div>
      
      {/* Секция основного изображения */}
      <div className="main-image-section">
        <h4 className="section-title">
          <i className="fas fa-image"></i>
          Основное изображение блюда:
        </h4>
        
        <div className="main-image-upload-container">
          <div 
            className="main-image-upload"
            onClick={() => document.getElementById('main-image-input').click()}
          >
            <input
              id="main-image-input"
              type="file"
              accept="image/*"
              onChange={handleMainImage}
              className="image-input"
            />
            
            {formData.mainImagePreview ? (
              <>
                <img 
                  src={formData.mainImagePreview} 
                  alt="Preview" 
                  className="main-image-preview"
                />
                <button 
                  type="button" 
                  className="remove-main-image-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData(prev => ({
                      ...prev,
                      mainImage: null,
                      mainImagePreview: ''
                    }));
                  }}
                >
                  Удалить изображение
                </button>
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                <span>Загрузить основное изображение</span>
                <small>(рекомендуется 800×600px, JPG или PNG)</small>
              </>
            )}
          </div>
          
          <div className="main-image-info">
            <p>Основное изображение будет отображаться на карточке рецепта</p>
          </div>
        </div>
      </div>
      
      <div className="section-line"></div>

      {/* Основные поля рецепта */}
      <div className="form-row">
        <div className="form-group">
          <input
            type="text"
            name="title"
            placeholder="Название рецепта *"
            value={formData.title}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input ${touched.title && errors.title ? 'error' : ''}`}
            required
          />
          {touched.title && errors.title && (
            <div className="error-message">{errors.title}</div>
          )}
        </div>
        
        <div className="form-group">
          <select 
            name="difficulty" 
            value={formData.difficulty} 
            onChange={handleChange}
            className="form-select"
          >
            <option value="Легкий">Легкий</option>
            <option value="Средний">Средний</option>
            <option value="Сложный">Сложный</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <input
            type="number"
            name="cooking_time"
            placeholder="Время приготовления (мин)*"
            value={formData.cooking_time}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input ${touched.cooking_time && errors.cooking_time ? 'error' : ''}`}
            min="1"
            required 
          />
          {touched.cooking_time && errors.cooking_time && (
            <div className="error-message">{errors.cooking_time}</div>
          )}
        </div>
        
        <div className="form-group">
          <input
            type="number"
            name="servings"
            placeholder="Количество порций"
            value={formData.servings}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input ${touched.servings && errors.servings ? 'error' : ''}`}
            min="1"
            max="20"
          />
          {touched.servings && errors.servings && (
            <div className="error-message">{errors.servings}</div>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-select category-select ${touched.category && errors.category ? 'error' : ''}`}
            required
          >
            <option value="">Выберите категорию *</option>
            {FIXED_CATEGORIES.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
          {touched.category && errors.category && (
            <div className="error-message">{errors.category}</div>
          )}
        </div>
      </div>

      {/* Блок ингредиентов */}
      <div className="ingredients-block">
        <h4 className="section-title">
          <i className="fas fa-carrot"></i>
          Ингредиенты:
        </h4>
        
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id} className="ingredient-item">
            <div className="ingredient-number">{index + 1}.</div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Название ингредиента *"
                value={ingredient.name}
                onChange={(e) => handleIngredientChange(ingredient.id, 'name', e.target.value)}
                onBlur={() => handleIngredientBlur(ingredient.id, 'name')}
                className={`form-input ${ingredientErrors[index]?.name ? 'error' : ''}`}
                required
              />
              {ingredientErrors[index]?.name && (
                <div className="error-message">{ingredientErrors[index].name}</div>
              )}
            </div>
            <div className="form-group">
              <input
                type="number"
                placeholder="Количество *"
                value={ingredient.amount}
                onChange={(e) => handleIngredientChange(ingredient.id, 'amount', e.target.value)}
                onBlur={() => handleIngredientBlur(ingredient.id, 'amount')}
                className={`form-input ${ingredientErrors[index]?.amount ? 'error' : ''}`}
                min="0"
                step="0.1"
                required
              />
              {ingredientErrors[index]?.amount && (
                <div className="error-message">{ingredientErrors[index].amount}</div>
              )}
            </div>
            <select
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(ingredient.id, 'unit', e.target.value)}
              className="form-select"
            >
              <option value="г">г.</option>
              <option value="кг">кг</option>
              <option value="мл">мл</option>
              <option value="л">л</option>
              <option value="шт">шт.</option>
              <option value="ч.л.">ч. л.</option>
              <option value="ст.л.">ст. л.</option>
            </select>
            <button 
              type="button" 
              className="remove-ingredient"
              onClick={() => removeIngredient(ingredient.id)}
              title="Удалить ингредиент"
            >
              ×
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          className="add-btn"
          onClick={addIngredient}
          title="Добавить ингредиент"
        >
          +
        </button>
      </div>

      <div className="section-line"></div>

      {/* Блок шагов приготовления */}
      <div className="steps-block">
        <h4 className="section-title">
          <i className="fas fa-list-ol"></i>
          Шаги приготовления:
        </h4>
        
        {steps.map((step, index) => (
          <div key={step.id} className="step-item">
            <div className="step-number">{index + 1}.</div>
            <div className="step-content">
              <div className="form-group">
                <textarea
                  placeholder="Опишите шаг приготовления... *"
                  value={step.description}
                  onChange={(e) => handleStepChange(step.id, e.target.value)}
                  onBlur={() => handleStepBlur(step.id)}
                  className={`form-textarea step-textarea ${stepErrors[index] ? 'error' : ''}`}
                  required
                />
                {stepErrors[index] && (
                  <div className="error-message">{stepErrors[index]}</div>
                )}
              </div>
              
              <div className="image-upload" onClick={() => document.getElementById(`image-input-${step.id}`).click()}>
                <input
                  id={`image-input-${step.id}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleStepImage(step.id, e)}
                  className="image-input"
                />
                {step.imagePreview ? (
                  <>
                    <img 
                      src={step.imagePreview} 
                      alt="Preview" 
                      className="image-preview"
                      style={{ display: 'block' }}
                    />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStepImage(step.id);
                      }}
                    >
                      Удалить изображение
                    </button>
                  </>
                ) : (
                  <>
                    <i className="fas fa-camera"></i>
                    <span>Добавить изображение</span>
                  </>
                )}
              </div>
            </div>
            <button 
              type="button" 
              className="remove-btn"
              onClick={() => removeStep(step.id)}
              title="Удалить шаг"
            >
              ×
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          className="add-btn"
          onClick={addStep}
          title="Добавить шаг"
        >
          +
        </button>
      </div>

      <div className="form-buttons">
        <button 
          type="submit" 
          className="submit-btn"
          disabled={
            !!errors.title || 
            !!errors.category || 
            ingredientErrors.some(e => e.name || e.amount) ||
            stepErrors.some(e => e)
          }
        >
          Сохранить рецепт
        </button>
        <button 
          type="button" 
          className="cancel-btn"
          onClick={resetForm}
        >
          Очистить форму
        </button>
      </div>
    </form>
  );
};

export default RecipeForm;