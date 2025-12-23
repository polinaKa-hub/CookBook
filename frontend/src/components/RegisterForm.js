import React, { useState } from 'react';
import './AuthForms.css';

const RegisterForm = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Пароли не совпадают!');
      return;
    }
    
    if (formData.password.length < 6) {
      alert('Пароль должен быть не менее 6 символов');
      return;
    }
    
    await onRegister(formData);
  };

  return (
    <div className="auth-form">
      <h3>Регистрация</h3>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Имя пользователя"
          value={formData.username}
          onChange={handleChange}
          required
        />
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        
        <input
          type="password"
          name="password"
          placeholder="Пароль"
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        <input
          type="password"
          name="confirmPassword"
          placeholder="Подтвердите пароль"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
        
        <button type="submit" className="auth-btn">
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