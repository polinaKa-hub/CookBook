import React, { useState } from 'react';
import './AuthForms.css';

const RegisterForm = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: ''
  });

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false
  });

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Пароль должен быть не менее 8 символов';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну заглавную букву';
    }
    if (!/[0-9]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну цифру';
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return 'Пароль должен содержать хотя бы один специальный символ (!@#$%^&*)';
    }
    return '';
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (password !== confirmPassword) {
      return 'Пароли не совпадают';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Валидация в реальном времени только для полей, которые были в фокусе
    if (touched[name]) {
      if (name === 'password') {
        setErrors({
          ...errors,
          password: validatePassword(value),
          confirmPassword: validateConfirmPassword(value, formData.confirmPassword)
        });
      } else if (name === 'confirmPassword') {
        setErrors({
          ...errors,
          confirmPassword: validateConfirmPassword(formData.password, value)
        });
      }
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched({
      ...touched,
      [name]: true
    });

    // Валидация при потере фокуса
    if (name === 'password') {
      setErrors({
        ...errors,
        password: validatePassword(formData.password),
        confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword)
      });
    } else if (name === 'confirmPassword') {
      setErrors({
        ...errors,
        confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Проверка всех полей перед отправкой
    const passwordError = validatePassword(formData.password);
    const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);
    
    if (passwordError || confirmError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmError
      });
      setTouched({
        password: true,
        confirmPassword: true
      });
      return;
    }
    
    await onRegister(formData);
  };

  return (
    <div className="auth-form">
      <h3>Регистрация</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            name="username"
            placeholder="Имя пользователя"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={touched.password && errors.password ? 'error' : ''}
            required
          />
          {touched.password && errors.password && (
            <div className="error-message">
              {errors.password}
            </div>
          )}
          {touched.password && !errors.password && formData.password && (
            <div className="success-message">✓ Пароль надежный</div>
          )}
        </div>
        
        <div className="form-group">
          <input
            type="password"
            name="confirmPassword"
            placeholder="Подтвердите пароль"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            className={touched.confirmPassword && errors.confirmPassword ? 'error' : ''}
            required
          />
          {touched.confirmPassword && errors.confirmPassword && (
            <div className="error-message">
              {errors.confirmPassword}
            </div>
          )}
          {touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword && (
            <div className="success-message">✓ Пароли совпадают</div>
          )}
        </div>
        
        <button 
          type="submit" 
          className="auth-btn"
          disabled={!!errors.password || !!errors.confirmPassword}
        >
          Зарегистрироваться
        </button>
      </form>
      
      <p className="auth-switch">
        Уже есть аккаунт? 
        <button type="button" onClick={onSwitchToLogin} className="link-btn">
          Войти
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;