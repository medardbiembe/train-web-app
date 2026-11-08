// components/RegisterModal.js
import React, { useState } from 'react';
import '../styles/RegisterModal.css';

export default function RegisterModal({ onClose, onLoginSwitch }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur quand l'utilisateur modifie
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (formData.username.length < 3) {
      newErrors.username = "Le nom d'utilisateur doit faire au moins 3 caractères";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 8) {
      newErrors.password = "Le mot de passe doit faire au moins 8 caractères";
    }
    
    if (!formData.password2) {
      newErrors.password2 = "Veuillez confirmer votre mot de passe";
    } else if (formData.password !== formData.password2) {
      newErrors.password2 = "Les mots de passe ne correspondent pas";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(true);
        // Auto-login après inscription réussie
        setTimeout(() => {
          alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
          onClose();
          if (onLoginSwitch) onLoginSwitch();
        }, 1500);
      } else {
        // Gestion des erreurs du serveur
        if (data.username && data.username.includes('existe déjà')) {
          setErrors({ username: "Ce nom d'utilisateur existe déjà" });
        } else if (data.email && data.email.includes('existe déjà')) {
          setErrors({ email: "Cet email est déjà utilisé" });
        } else {
          setErrors({ general: data.detail || "Erreur lors de l'inscription" });
        }
      }
    } catch (err) {
      console.error('Erreur inscription:', err);
      setErrors({ general: "Erreur de connexion au serveur" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="voyageurx-modal-overlay">
        <div className="voyageurx-register-modal voyageurx-modal">
          <div className="voyageurx-modal-success">
            <div className="voyageurx-success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3 className="voyageurx-success-title">Inscription réussie !</h3>
            <p className="voyageurx-success-text">
              Votre compte a été créé avec succès.
            </p>
            <p className="voyageurx-success-text">
              Vous allez être redirigé vers la page de connexion...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voyageurx-modal-overlay" onClick={onClose}>
      <div className="voyageurx-register-modal voyageurx-modal" onClick={(e) => e.stopPropagation()}>
        <div className="voyageurx-modal-header">
          <h2 className="voyageurx-modal-title">
            <i className="fas fa-user-plus"></i>
            Créer un compte
          </h2>
          <button onClick={onClose} className="voyageurx-modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="voyageurx-modal-body">
          {errors.general && (
            <div className="voyageurx-error-alert">
              <i className="fas fa-exclamation-triangle"></i>
              {errors.general}
            </div>
          )}
          
          <form className="voyageurx-register-form" onSubmit={handleSubmit}>
            <div className="voyageurx-form-row">
              <div className="voyageurx-form-group">
                <label className="voyageurx-form-label">
                  <i className="fas fa-user"></i> Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`voyageurx-form-input ${errors.username ? 'error' : ''}`}
                  placeholder="john_doe"
                  autoComplete="username"
                />
                {errors.username && (
                  <span className="voyageurx-error-message">{errors.username}</span>
                )}
              </div>
              
              <div className="voyageurx-form-group">
                <label className="voyageurx-form-label">
                  <i className="fas fa-envelope"></i> Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`voyageurx-form-input ${errors.email ? 'error' : ''}`}
                  placeholder="john@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="voyageurx-error-message">{errors.email}</span>
                )}
              </div>
            </div>
            
            <div className="voyageurx-form-row">
              <div className="voyageurx-form-group">
                <label className="voyageurx-form-label">
                  <i className="fas fa-id-card"></i> Prénom
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="voyageurx-form-input"
                  placeholder="John"
                  autoComplete="given-name"
                />
              </div>
              
              <div className="voyageurx-form-group">
                <label className="voyageurx-form-label">
                  <i className="fas fa-id-card"></i> Nom
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="voyageurx-form-input"
                  placeholder="Doe"
                  autoComplete="family-name"
                />
              </div>
            </div>
            
            <div className="voyageurx-form-row">
              <div className="voyageurx-form-group">
                <label className="voyageurx-form-label">
                  <i className="fas fa-lock"></i> Mot de passe *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`voyageurx-form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Au moins 8 caractères"
                  autoComplete="new-password"
                />
                {errors.password && (
                  <span className="voyageurx-error-message">{errors.password}</span>
                )}
                <div className="voyageurx-password-hints">
                  <i className="fas fa-info-circle"></i>
                  <span>Minimum 8 caractères, avec lettres et chiffres</span>
                </div>
              </div>
              
              <div className="voyageurx-form-group">
                <label className="voyageurx-form-label">
                  <i className="fas fa-lock"></i> Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  name="password2"
                  value={formData.password2}
                  onChange={handleChange}
                  className={`voyageurx-form-input ${errors.password2 ? 'error' : ''}`}
                  placeholder="Retapez votre mot de passe"
                  autoComplete="new-password"
                />
                {errors.password2 && (
                  <span className="voyageurx-error-message">{errors.password2}</span>
                )}
              </div>
            </div>
            
            <div className="voyageurx-form-footer">
              <button
                type="submit"
                disabled={loading}
                className="voyageurx-submit-btn"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Créer mon compte
                  </>
                )}
              </button>
              
              <div className="voyageurx-form-links">
                <p>
                  Vous avez déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={onLoginSwitch}
                    className="voyageurx-link-btn"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
              
              <div className="voyageurx-terms-notice">
                <p>
                  <i className="fas fa-shield-alt"></i>
                  En créant un compte, vous acceptez nos{' '}
                  <a href="/conditions">Conditions d'utilisation</a> et notre{' '}
                  <a href="/confidentialite">Politique de confidentialité</a>.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}