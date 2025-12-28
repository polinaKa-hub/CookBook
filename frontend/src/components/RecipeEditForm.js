import React, { useState, useEffect } from 'react';
import './RecipeEditForm.css';
import Swal from 'sweetalert2';

const RecipeEditForm = ({ recipe, onUpdate, onCancel }) => {
  // Функция парсинга ингредиентов
  const parseIngredients = (ingredients) => {
    if (!ingredients) return [{ id: 1, name: '', amount: '', unit: 'г' }];
    
    try {
      if (typeof ingredients === 'string') {
        const parsed = JSON.parse(ingredients);
        if (Array.isArray(parsed)) {
          return parsed.map((ing, index) => ({
            id: index + 1,
            name: ing.name || ing,
            amount: ing.amount || '',
            unit: ing.unit || 'г'
          }));
        }
      } else if (Array.isArray(ingredients)) {
        return ingredients.map((ing, index) => ({
          id: index + 1,
          name: ing.name || ing,
          amount: ing.amount || '',
          unit: ing.unit || 'г'
        }));
      }
    } catch (e) {
      if (typeof ingredients === 'string') {
        const lines = ingredients.split('\n').filter(line => line.trim());
        return lines.map((line, index) => ({
          id: index + 1,
          name: line,
          amount: '',
          unit: 'г'
        }));
      }
    }
    
    return [{ id: 1, name: '', amount: '', unit: 'г' }];
  };

  // Функция парсинга инструкций
  const parseInstructions = (instructions) => {
    if (!instructions) return [{ id: 1, description: '', image: null, imagePreview: '' }];
    
    try {
      if (typeof instructions === 'string') {
        const parsed = JSON.parse(instructions);
        if (Array.isArray(parsed)) {
          return parsed.map((step, index) => ({
            id: index + 1,
            description: step.description || step || '',
            image: null,
            imagePreview: step.image_url || ''
          }));
        }
      } else if (Array.isArray(instructions)) {
        return instructions.map((step, index) => ({
          id: index + 1,
          description: step.description || step || '',
          image: null,
          imagePreview: step.image_url || ''
        }));
      }
    } catch (e) {
      if (typeof instructions === 'string') {
        const lines = instructions.split('\n').filter(line => line.trim());
        return lines.map((line, index) => ({
          id: index + 1,
          description: line,
          image: null,
          imagePreview: ''
        }));
      }
    }
    
    return [{ id: 1, description: '', image: null, imagePreview: '' }];
  };

  // Состояние для динамических ингредиентов
  const [ingredients, setIngredients] = useState(() => parseIngredients(recipe.ingredients));

  // Состояние для динамических шагов
  const [steps, setSteps] = useState(() => parseInstructions(recipe.instructions));

  // Состояние для основных полей рецепта - теперь с основным изображением
  const [formData, setFormData] = useState({
    title: recipe.title || '',
    cooking_time: recipe.cooking_time || '',
    category: recipe.category || '',
    difficulty: recipe.difficulty || 'Легкий',
    servings: recipe.servings || 6, 
    mainImage: null,
    mainImagePreview: recipe.main_image_url || recipe.image_url || ''
  });

  // Состояния для ошибок валидации
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

  // Состояния для ошибок ингредиентов и шагов
  const [ingredientErrors, setIngredientErrors] = useState(() => 
    parseIngredients(recipe.ingredients).map(() => ({ name: '', amount: '' }))
  );

  const [stepErrors, setStepErrors] = useState(() => 
    parseInstructions(recipe.instructions).map(() => '')
  );

  // Функции валидации
  const validateField = (name, value) => {
    switch (name) {
      case 'title':
        if (!value.trim()) return 'Название рецепта обязательно';
        if (value.length > 100) return 'Название не должно превышать 100 символов';
        return '';
      case 'category':
        if (!value.trim()) return 'Категория обязательна';
        return '';
      case 'cooking_time':
        if (!value) return 'Время приготовления обязательно';
        const time = parseFloat(value);
        if (isNaN(time)) return 'Введите число';
        if (time < 1) return 'Время должно быть не менее 1 минуты';
        if (time > 1440) return 'Время не может превышать 24 часа (1440 минут)';
        return '';
      case 'servings':
        if (!value) return 'Количество порций обязательно';
        const servings = parseFloat(value);
        if (isNaN(servings)) return 'Введите число';
        if (servings < 1) return 'Должна быть хотя бы 1 порция';
        if (servings > 100) return 'Не более 100 порций';
        return '';
      default:
        return '';
    }
  };

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

  const validateStep = (index) => {
    const step = steps[index];
    if (!step.description.trim()) {
      return 'Описание шага обязательно';
    }
    return '';
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

  // Инициализация существующего основного изображения
  useEffect(() => {
    if (recipe.main_image_url || recipe.image_url) {
      setFormData(prev => ({
        ...prev,
        mainImagePreview: recipe.main_image_url || recipe.image_url
      }));
    }
  }, [recipe]);

  // Обработчики для числовых полей
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : parseInt(value, 10);
    
    console.log(`🔢 Number change ${name}: ${value} → ${numValue}`);
    
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? '' : numValue
    }));

    // Валидация в реальном времени для тронутых полей
    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, numValue)
      }));
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

  // Обработчик основного изображения
  const handleMainImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        Swal.fire({
          title: 'Пожалуйста, выберите файл изображения',
          text: false,
          showCancelButton: true,
          confirmButtonText: 'Хорошо',
          confirmButtonColor: 'rgba(151, 146, 146, 1)',
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

  // Удаление основного изображения
  const removeMainImage = (e) => {
    e.stopPropagation();
    
    // Проверяем, было ли у рецепта исходное изображение
    const hadOriginalImage = recipe.image_url || recipe.main_image_url;
    
    setFormData(prev => ({
      ...prev,
      mainImage: null,
      mainImagePreview: '',
      hadOriginalImage: hadOriginalImage
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
        confirmButtonColor: 'rgba(151, 146, 146, 1)',
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
          title: 'Пожалуйста, выберите файл изображения',
          text: false,
          icon: 'warning',
          confirmButtonText: 'Хорошо',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const index = steps.findIndex(step => step.id === id);
        const newSteps = [...steps];
        newSteps[index] = { 
          ...newSteps[index], 
          image: file, 
          imagePreview: reader.result 
        };
        setSteps(newSteps);
      };
      reader.readAsDataURL(file);
    }
  };

  // Удаление изображения шага
  const removeStepImage = (id) => {
    const index = steps.findIndex(step => step.id === id);
    const newSteps = [...steps];
    newSteps[index] = { 
      ...newSteps[index], 
      image: null, 
      imagePreview: '' 
    };
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
    formDataToSend.append('servings', formData.servings || '6');
    
    // Основное изображение
    if (formData.mainImage) {
      formDataToSend.append('main_image', formData.mainImage);
      console.log('DEBUG: Adding main image to update');
    } else if (formData.mainImagePreview && !recipe.image_url) {
      // Если было изображение в рецепте, но мы его удалили в форме
      formDataToSend.append('remove_main_image', 'true');
      console.log('DEBUG: Removing main image from recipe');
    }

    // Ингредиенты (отправляем как JSON строку)
    const ingredientsData = ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit
    }));
    formDataToSend.append('ingredients', JSON.stringify(ingredientsData));

    // Инструкции (шаги)
    const instructionsData = steps.map(step => ({
      description: step.description,
      hasImage: !!step.image
    }));
    formDataToSend.append('instructions', JSON.stringify(instructionsData));

    // Изображения шагов
    steps.forEach((step, index) => {
      if (step.image) {
        formDataToSend.append(`step_images_${index}`, step.image);
      }
    });
    
    console.log("📝 BEFORE SUBMIT - Form data:");
    console.log("Servings from state:", formData.servings);
    console.log("Type of servings:", typeof formData.servings);
    console.log("Full formData:", formData);
    
    // Отправляем на обновление
    if (onUpdate) {
      onUpdate(recipe.id, formDataToSend);
    }
  };

  // Проверка, есть ли ошибки в форме
  const hasErrors = () => {
    return (
      !!errors.title || 
      !!errors.category || 
      !!errors.cooking_time || 
      !!errors.servings ||
      ingredientErrors.some(e => e.name || e.amount) ||
      stepErrors.some(e => e)
    );
  };

  return (
    <div className="modal-overlay-edit" onClick={onCancel}>
      <div 
        className="modal-content recipe-edit-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i className="fas fa-edit"></i>
            Редактирование рецепта
          </h3>
          <button 
            type="button" 
            className="close-btn"
            onClick={onCancel}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <form className="recipe-form" onSubmit={handleSubmit}>
            <div className="section-line"></div>

            {/* Основное изображение */}
            <div className="main-image-section">
              <h4 className="section-title">
                <i className="fas fa-image"></i>
                Основное изображение блюда:
              </h4>
              
              <div className="main-image-upload-container">
                <div 
                  className="main-image-upload"
                  onClick={() => document.getElementById('main-image-input-edit').click()}
                >
                  <input
                    id="main-image-input-edit"
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
                        onClick={removeMainImage}
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
                  placeholder="Время приготовления (мин) *"
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
                  type="text"
                  name="category"
                  placeholder="Категория *"
                  value={formData.category}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-input ${touched.category && errors.category ? 'error' : ''}`}
                  required
                />
                {touched.category && errors.category && (
                  <div className="error-message">{errors.category}</div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <input
                  type="number"
                  name="servings"
                  placeholder="Количество порций *"
                  value={formData.servings}
                  onChange={handleNumberChange}
                  onBlur={handleBlur}
                  className={`form-input ${touched.servings && errors.servings ? 'error' : ''}`}
                  min="1"
                  max="100"
                  required
                />
                {touched.servings && errors.servings && (
                  <div className="error-message">{errors.servings}</div>
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
                    
                    <div className="image-upload" onClick={() => document.getElementById(`image-input-edit-${step.id}`).click()}>
                      <input
                        id={`image-input-edit-${step.id}`}
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
                disabled={hasErrors()}
              >
                Сохранить изменения
              </button>
              <button 
                type="button" 
                className="cancel-btn"
                onClick={onCancel}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecipeEditForm;