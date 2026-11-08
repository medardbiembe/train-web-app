import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import '../styles/Modals.css';

const ParametresModal = ({ user, onClose }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    newsletter: false,
    language: 'fr',
    theme: 'light'
  });

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Le contenu de la modal
  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal parametres-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Paramètres du compte</h2>
          <button onClick={onClose} className="close-button">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {/* Informations du compte */}
          <div className="settings-section">
            <h3>Informations personnelles</h3>
            <div className="user-info">
              <div className="info-item">
                <label>Nom complet</label>
                <p>{user?.name}</p>
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{user?.email}</p>
              </div>
              <div className="info-item">
                <label>Compte créé le</label>
                <p>{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>

          {/* Préférences de notification */}
          <div className="settings-section">
            <h3>Préférences de notification</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <label>Notifications par email</label>
                  <p>Recevoir les confirmations et rappels</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="setting-item">
                <div className="setting-info">
                  <label>Newsletter</label>
                  <p>Offres spéciales et nouvelles fonctionnalités</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.newsletter}
                    onChange={(e) => handleSettingChange('newsletter', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Préférences d'affichage */}
          <div className="settings-section">
            <h3>Préférences d'affichage</h3>
            <div className="settings-grid">
              <div className="form-group">
                <label>Langue</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="form-input"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Thème</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="form-input"
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                  <option value="auto">Automatique</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="settings-section">
            <h3>Actions du compte</h3>
            <div className="actions-grid">
              <button className="btn-secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Modifier le profil
              </button>
              <button className="btn-secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
                Changer le mot de passe
              </button>
              <button className="btn-danger">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Supprimer le compte
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-primary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  // Utiliser ReactDOM.createPortal pour rendre en dehors de la hiérarchie React normale
  return ReactDOM.createPortal(modalContent, document.body);
};

export default ParametresModal;