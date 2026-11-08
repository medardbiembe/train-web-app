import React, { useState, useEffect } from 'react';
import '../styles/Modals.css';

const HistoriqueModal = ({ user, onClose, downloadBillet }) => {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, reserved, cancelled

  useEffect(() => {
    fetchHistorique();
  }, []);

  const fetchHistorique = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/billets/', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setHistorique(data);
      }
    } catch (err) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistorique = historique.filter(billet => {
    if (filter === 'all') return true;
    return billet.statut === filter;
  });

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'réservé': return 'status-reserved';
      case 'confirmé': return 'status-confirmed';
      case 'annulé': return 'status-cancelled';
      default: return 'status-default';
    }
  };

  const getStatusText = (statut) => {
    switch (statut) {
      case 'réservé': return 'Réservé';
      case 'confirmé': return 'Confirmé';
      case 'annulé': return 'Annulé';
      default: return statut;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal historique-modal">
        <div className="modal-header">
          <h2>Historique des réservations</h2>
          <button onClick={onClose} className="close-button">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {/* Filtres */}
          <div className="filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tous
            </button>
            <button 
              className={`filter-btn ${filter === 'réservé' ? 'active' : ''}`}
              onClick={() => setFilter('réservé')}
            >
              Réservés
            </button>
            <button 
              className={`filter-btn ${filter === 'annulé' ? 'active' : ''}`}
              onClick={() => setFilter('annulé')}
            >
              Annulés
            </button>
          </div>

          {/* Liste des réservations */}
          <div className="historique-list">
            {loading ? (
              <div className="loading">Chargement de l'historique...</div>
            ) : filteredHistorique.length === 0 ? (
              <div className="empty-state">
                <svg className="w-12 h-12 text-secondary-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <h3>Aucune réservation trouvée</h3>
                <p>Votre historique de réservations apparaîtra ici.</p>
              </div>
            ) : (
              filteredHistorique.map(billet => (
                <div key={billet.id} className="historique-item">
                  <div className="item-header">
                    <div className="item-info">
                      <h4>
                        {billet.trajet?.gare_depart?.nom} → {billet.trajet?.gare_arrivee?.nom}
                      </h4>
                      <p className="item-details">
                        {billet.trajet?.train?.numero} • 
                        {new Date(billet.trajet?.heure_depart).toLocaleDateString('fr-FR')} • 
                        {billet.trajet?.train?.type}
                      </p>
                    </div>
                    <div className="item-actions">
                      <span className={`status-badge ${getStatusColor(billet.statut)}`}>
                        {getStatusText(billet.statut)}
                      </span>
                      <span className="item-price">{billet.prix_total}€</span>
                    </div>
                  </div>
                  
                  <div className="item-footer">
                    <div className="item-date">
                      Réservé le {new Date(billet.date_reservation).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="action-buttons">
                      {(billet.statut === 'réservé' || billet.statut === 'confirmé') && (
                        <>
                          <button
                            onClick={() => downloadBillet(billet.id)}
                            className="btn-download"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Télécharger
                          </button>
                          {billet.statut === 'réservé' && (
                            <button className="btn-cancel">
                              Annuler
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
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
};

export default HistoriqueModal;