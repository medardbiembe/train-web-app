import React, { useState, useEffect, useCallback } from 'react';
import BookingModal from './BookingModal';
import ParametresModal from './ParametresModal';
import HistoriqueModal from './HistoriqueModal';
import AlgoSelectionAuto from './AlgoSelectionAuto';
import ChatBot from './ChatBot';
import '../styles/Home.css';

export default function Home({ user, onLogout }) {
  const [filters, setFilters] = useState({
    gareDepart: '',
    gareArrivee: '',
    date: '',
    passagers: 1
  });

  const [trajets, setTrajets] = useState([]);
  const [gares, setGares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingGares, setLoadingGares] = useState(true);
  const [apiError, setApiError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [activeTab, setActiveTab] = useState('train');
  
  // États pour les modals
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showParametresModal, setShowParametresModal] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  
  // États pour les billets
  const [billetsEnCours, setBilletsEnCours] = useState([]);
  const [showBilletsSection, setShowBilletsSection] = useState(false);
  
  // État pour l'algorithme
  const [showAlgoSelection, setShowAlgoSelection] = useState(false);
  const [algoTrajetSelectionne, setAlgoTrajetSelectionne] = useState(null);

  // Fonction pour récupérer le token CSRF
  const getCSRFToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // ========== FONCTIONS UTILITAIRES POUR LE FORMATAGE ==========

  // Formater l'heure (HH:MM)
  const formatHeure = (dateString) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--:--';
      
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '--:--';
    }
  };

  // Formater la date (DD/MM/YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  // Calculer la durée entre deux dates
  const calculerDuree = (depart, arrivee) => {
    if (!depart || !arrivee) return '--h --min';
    
    try {
      const dateDepart = new Date(depart);
      const dateArrivee = new Date(arrivee);
      
      if (isNaN(dateDepart.getTime()) || isNaN(dateArrivee.getTime())) {
        return '--h --min';
      }
      
      const diffMs = dateArrivee - dateDepart;
      
      if (diffMs < 0) return '--h --min';
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
    } catch {
      return '--h --min';
    }
  };

  // Obtenir le nombre de places disponibles
  const getPlacesDisponibles = (trajet) => {
    return trajet.places_restantes !== undefined 
      ? trajet.places_restantes 
      : trajet.train?.capacite || 0;
  };

  // Calculer le prix total
  const getPrixTotal = (trajet) => {
    return (trajet.prix * filters.passagers).toFixed(2);
  };

  // Charger les gares depuis Django
  useEffect(() => {
    const fetchGares = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/gares/', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setGares(data);
        } else {
          throw new Error('Erreur API gares');
        }
      } catch (err) {
        console.error('Erreur chargement gares', err);
        setApiError('Erreur de connexion au serveur');
      } finally {
        setLoadingGares(false);
      }
    };

    fetchGares();
  }, []);

  // Fonction pour charger les trajets
  const fetchTrajets = async () => {
    const { gareDepart, gareArrivee } = filters;
    
    if (!gareDepart?.trim() || !gareArrivee?.trim()) {
      setApiError('Veuillez sélectionner les gares de départ et d\'arrivée');
      return;
    }

    setLoading(true);
    setApiError('');
    setSearchPerformed(true);
    setShowAlgoSelection(false);
    
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('gare_depart', gareDepart.trim());
      queryParams.append('gare_arrivee', gareArrivee.trim());
      
      const url = `http://localhost:8000/api/trajets/?${queryParams}`;
      
      console.log('🔍 Recherche trajets:', url);
      
      const res = await fetch(url, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('📊 Données reçues:', data);
      
      let trajetsData = [];
      if (data.results && Array.isArray(data.results)) {
        trajetsData = data.results;
      } else if (Array.isArray(data)) {
        trajetsData = data;
      }
      
      // Ajouter escales_count si manquant
      trajetsData = trajetsData.map(trajet => ({
        ...trajet,
        escales_count: trajet.escales?.length || 0
      }));
      
      // Trier par heure de départ
      trajetsData.sort((a, b) => {
        const heureA = new Date(a.heure_depart).getTime();
        const heureB = new Date(b.heure_depart).getTime();
        return heureA - heureB;
      });
      
      setTrajets(trajetsData);
      
      if (trajetsData.length === 0) {
        setApiError(`Aucun trajet trouvé de "${gareDepart}" à "${gareArrivee}"`);
      } else {
        setShowAlgoSelection(true);
        
        setTimeout(() => {
          const algoSection = document.querySelector('.algo-section');
          if (algoSection) {
            algoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
      
    } catch (err) {
      console.error('Erreur chargement trajets:', err);
      setApiError(`Erreur de connexion: ${err.message}`);
      setTrajets([]);
    } finally {
      setLoading(false);
    }
  };

  // ========== CHARGEMENT DES BILLETS ==========

  // Charger les billets en cours avec useCallback
  const fetchBilletsEnCours = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('📥 Chargement des billets...');
      const res = await fetch('http://localhost:8000/api/billets/', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Structure des billets reçus:', data[0]); // Pour debug
        
        // Adapter les données pour utiliser trajet_details
        const billetsAdaptes = data.map(billet => ({
          ...billet,
          // Utiliser trajet_details s'il existe, sinon garder trajet
          trajetInfo: billet.trajet_details || billet.trajet || {}
        }));
        
        const billetsActifs = billetsAdaptes.filter(billet => 
          billet.statut === 'réservé' || billet.statut === 'confirmé'
        );
        setBilletsEnCours(billetsActifs);
        console.log('✅ Billets actifs chargés:', billetsActifs.length);
      }
    } catch (err) {
      console.error('Erreur chargement billets:', err);
    }
  }, [user]);

  // Charger les billets au démarrage
  useEffect(() => {
    if (user) {
      fetchBilletsEnCours();
    }
  }, [user, fetchBilletsEnCours]);

  const handleFilter = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Fonctions pour les modals
  const openParametresModal = () => setShowParametresModal(true);
  const closeParametresModal = () => setShowParametresModal(false);
  
  const openHistoriqueModal = () => setShowHistoriqueModal(true);
  const closeHistoriqueModal = () => setShowHistoriqueModal(false);

  const openReservationModal = (trajet) => {
    if (!user) {
      alert('Veuillez vous connecter pour réserver');
      return;
    }
    console.log('📝 Trajet sélectionné pour réservation:', trajet);
    setSelectedTrajet(trajet);
    setShowReservationModal(true);
  };

  const closeReservationModal = () => {
    setShowReservationModal(false);
    setSelectedTrajet(null);
  };

  // ========== FONCTION DE CONFIRMATION DE RÉSERVATION ==========
  const handleReservationConfirm = async (reservationData) => {
    console.log('🔍 DÉBUT RÉSERVATION');
    console.log('📝 selectedTrajet:', selectedTrajet);
    
    if (!user) {
      alert('Veuillez vous connecter pour réserver');
      return;
    }

    if (!selectedTrajet || !selectedTrajet.id) {
      alert('❌ Erreur: Aucun trajet sélectionné');
      return;
    }
    
    try {
      const csrfToken = getCSRFToken();
      
      // Payload avec 'trajet' (pas 'trajet_id')
      const payload = {
        trajet: selectedTrajet.id,
        nombre_passagers: filters.passagers,
        statut: 'réservé',
        date_voyage: filters.date 
      };

      console.log('📤 PAYLOAD:', JSON.stringify(payload));

      const res = await fetch('http://localhost:8000/api/billets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      console.log('📥 STATUT:', res.status);
      
      const responseText = await res.text();
      console.log('📥 RÉPONSE:', responseText);

      if (res.ok) {
        const billetData = JSON.parse(responseText);
        alert(`✅ Réservation confirmée !\n\nBillet #${billetData.id}\n${selectedTrajet.gare_depart?.nom} → ${selectedTrajet.gare_arrivee?.nom}\nPassagers: ${filters.passagers}\nPrix: ${billetData.prix_total}€`);
        
        closeReservationModal();
        fetchTrajets();
        fetchBilletsEnCours();
      } else {
        throw new Error(`Erreur ${res.status}: ${responseText}`);
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      alert('❌ ' + err.message);
    }
  };

  // Fonction pour télécharger un billet
  const downloadBillet = async (billetId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/billets/${billetId}/pdf/`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `billet-${billetId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert('Billet téléchargé avec succès !');
      } else {
        throw new Error('Erreur lors du téléchargement');
      }
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      alert('Erreur lors du téléchargement du billet');
    }
  };

  // Fonction pour annuler un billet
  const annulerBillet = async (billetId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler ce billet ?')) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/billets/${billetId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ statut: 'annulé' })
      });
      
      if (res.ok) {
        alert('Billet annulé avec succès');
        fetchBilletsEnCours();
      } else {
        throw new Error('Erreur lors de l\'annulation');
      }
    } catch (err) {
      console.error('Erreur annulation:', err);
      alert('Erreur lors de l\'annulation du billet');
    }
  };

  // Réinitialiser la recherche
  const handleResetSearch = () => {
    setFilters({ gareDepart: '', gareArrivee: '', date: '', passagers: 1 });
    setTrajets([]);
    setApiError('');
    setSearchPerformed(false);
    setShowBilletsSection(false);
    setShowAlgoSelection(false);
    setAlgoTrajetSelectionne(null);
  };

  // Fonction pour déterminer le type de trajet (badge)
  const getTypeTrajetBadge = (trajet) => {
    const escalesCount = trajet.escales?.length || trajet.escales_count || 0;
    
    if (escalesCount === 0) {
      return { text: '⚡ Direct', color: 'voyageurx-badge-green' };
    } else if (escalesCount === 1) {
      return { text: '🔄 1 escale', color: 'voyageurx-badge-blue' };
    } else {
      return { text: `🔄 ${escalesCount} escales`, color: 'voyageurx-badge-orange' };
    }
  };

  // Fonction pour rendre les escales sur la timeline
  const renderEscalesTimeline = (escales) => {
    if (!escales || escales.length === 0) return null;
    
    return escales.map((escale, index) => {
      const position = ((index + 1) * 100) / (escales.length + 1);
      
      return (
        <div 
          key={escale.id} 
          className="voyageurx-escale-point"
          style={{ left: `${position}%` }}
        >
          <div className="voyageurx-escale-dot"></div>
          <div className="voyageurx-escale-info">
            <div className="voyageurx-escale-time">
              {formatHeure(escale.heure_arrivee)}
            </div>
            <div className="voyageurx-escale-ville">
              {escale.gare?.ville}
            </div>
          </div>
        </div>
      );
    });
  };

  // Handler pour la sélection par algorithme
  const handleAlgoBilletSelect = (trajet) => {
    console.log('Trajet sélectionné par algorithme:', trajet);
    setAlgoTrajetSelectionne(trajet);
    
    alert(`✅ Trajet ${trajet.train?.numero} sélectionné par l'algorithme!\nPrix: ${trajet.prix}€ • Escales: ${trajet.escales_count || 0}`);
    
    openReservationModal(trajet);
  };

  // ========== SECTION D'AFFICHAGE DES BILLETS CORRIGÉE ==========
  const renderBilletsSection = () => {
    if (billetsEnCours.length === 0) return null;

    return (
      <div className="voyageurx-billets-section">
        <div className="voyageurx-billets-header">
          <h3 className="voyageurx-billets-title">
            <i className="fas fa-ticket-alt"></i>
            Mes billets en cours ({billetsEnCours.length})
          </h3>
          <button 
            onClick={() => setShowBilletsSection(false)}
            className="voyageurx-billets-close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="voyageurx-billets-grid">
          {billetsEnCours.map(billet => {
            // Utiliser trajetInfo qui contient soit trajet_details soit trajet
            const trajetInfo = billet.trajetInfo || {};
            const trainInfo = trajetInfo.train || {};
            const gareDepart = trajetInfo.gare_depart || {};
            const gareArrivee = trajetInfo.gare_arrivee || {};
            
            // Convertir le prix en nombre pour l'affichage (correction)
            const prixTotal = billet.prix_total ? parseFloat(billet.prix_total) : 0;
            
            return (
              <div key={billet.id} className="voyageurx-billet-card">
                <div className="voyageurx-billet-header">
                  <div className="voyageurx-billet-train">
                    <i className="fas fa-train"></i>
                    <span>
                      {trainInfo.numero || 'Train'} • {trainInfo.type || 'TER'}
                    </span>
                  </div>
                  <div className={`voyageurx-billet-statut ${billet.statut?.toLowerCase() || 'réservé'}`}>
                    {billet.statut || 'RÉSERVÉ'}
                  </div>
                </div>
                
                <div className="voyageurx-billet-route">
                  <div className="voyageurx-billet-depart">
                    <div className="voyageurx-billet-time">{formatHeure(trajetInfo.heure_depart)}</div>
                    <div className="voyageurx-billet-gare">{gareDepart.nom || 'Gare de départ'}</div>
                    <div className="voyageurx-billet-ville">{gareDepart.ville || ''}</div>
                  </div>
                  
                  <div className="voyageurx-billet-arrow">
                    <i className="fas fa-arrow-right"></i>
                    <div className="voyageurx-billet-duree">
                      {calculerDuree(trajetInfo.heure_depart, trajetInfo.heure_arrivee)}
                    </div>
                  </div>
                  
                  <div className="voyageurx-billet-arrivee">
                    <div className="voyageurx-billet-time">{formatHeure(trajetInfo.heure_arrivee)}</div>
                    <div className="voyageurx-billet-gare">{gareArrivee.nom || "Gare d'arrivée"}</div>
                    <div className="voyageurx-billet-ville">{gareArrivee.ville || ''}</div>
                  </div>
                </div>
                
                <div className="voyageurx-billet-footer">
                  <div className="voyageurx-billet-info">
                    <div className="voyageurx-billet-date">
                      <i className="fas fa-calendar"></i>
                      {formatDate(billet.date_reservation)}
                    </div>
                    <div className="voyageurx-billet-prix">
                      <i className="fas fa-euro-sign"></i>
                      {prixTotal.toFixed(2)}€
                    </div>
                  </div>
                  
                  <div className="voyageurx-billet-actions">
                    <button
                      onClick={() => downloadBillet(billet.id)}
                      className="voyageurx-billet-btn download"
                    >
                      <i className="fas fa-download"></i> Télécharger
                    </button>
                    <button
                      onClick={() => annulerBillet(billet.id)}
                      className="voyageurx-billet-btn cancel"
                    >
                      <i className="fas fa-times"></i> Annuler
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="voyageurx-billets-footer">
          <button
            onClick={openHistoriqueModal}
            className="voyageurx-billets-history-btn"
          >
            <i className="fas fa-history"></i> Voir tout l'historique
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="voyageurx-home">
      {/* Header style VoyageurX */}
      <header className="voyageurx-header">
        <div className="voyageurx-container">
          <div className="voyageurx-top-bar">
            {/* Logo VoyageurX */}
            <div className="voyageurx-logo">
              <div className="voyageurx-logo-icon">
                <i className="fas fa-train"></i>
              </div>
              <div>
                <div className="voyageurx-logo-text">Voyageur<span className="voyageurx-logo-x">X</span></div>
                <div className="voyageurx-logo-subtext">Voyagez avec confiance</div>
              </div>
            </div>
            
            {/* Badge officiel */}
            <div className="voyageurx-badge">
              <i className="fas fa-star"></i> PREMIUM
            </div>
            
            {/* Navigation utilisateur */}
            <nav className="voyageurx-nav-links">
              <button 
                className={`voyageurx-nav-item ${!showBilletsSection ? 'active' : ''}`}
                onClick={() => setShowBilletsSection(false)}
              >
                <i className="fas fa-home"></i> Accueil
              </button>
              
              {/* Bouton Billets - affiche la section des billets */}
              {user && billetsEnCours.length > 0 && (
                <button 
                  className={`voyageurx-nav-item ${showBilletsSection ? 'active' : ''}`}
                  onClick={() => setShowBilletsSection(true)}
                >
                  <i className="fas fa-ticket-alt"></i> Mes billets ({billetsEnCours.length})
                </button>
              )}
              
              <button className="voyageurx-nav-item">
                <i className="fas fa-map-marked-alt"></i> Cartes
              </button>
              
              {/* Dropdown utilisateur */}
              {user ? (
                <div className="voyageurx-dropdown">
                  <button className="voyageurx-nav-item passager" data-fullname={user.name}>
                    <i className="fas fa-user"></i> 
                    <span className="voyageurx-passager-name">{user.name}</span>
                  </button>
                  
                  <div className="voyageurx-dropdown-content">
                    <button
                      onClick={openHistoriqueModal}
                      className="voyageurx-dropdown-item"
                    >
                      <i className="fas fa-history"></i>
                      Historique des réservations
                    </button>
                    
                    <button
                      onClick={() => setShowBilletsSection(true)}
                      className="voyageurx-dropdown-item"
                    >
                      <i className="fas fa-ticket-alt"></i>
                      Mes billets ({billetsEnCours.length})
                    </button>
                    
                    <button
                      onClick={openParametresModal}
                      className="voyageurx-dropdown-item parametres"
                    >
                      <i className="fas fa-cog"></i>
                      Paramètres
                    </button>
                    
                    <div className="voyageurx-dropdown-divider"></div>
                    
                    <button
                      onClick={onLogout}
                      className="voyageurx-dropdown-item logout"
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      Déconnexion
                    </button>
                  </div>
                </div>
              ) : (
                <button className="voyageurx-nav-item">
                  <i className="fas fa-user"></i> Connexion
                </button>
              )}
            </nav>
          </div>
          
          {/* Section de recherche principale */}
          {!showBilletsSection && (
            <div className="voyageurx-search-section">
              <h2 className="voyageurx-search-title">
                <i className="fas fa-search"></i>
                Trouvez votre prochain voyage
              </h2>
              
              {/* Onglets de recherche */}
              <div className="voyageurx-search-tabs">
                <button 
                  className={`voyageurx-tab ${activeTab === 'train' ? 'active' : ''}`}
                  onClick={() => setActiveTab('train')}
                >
                  Train
                </button>
                
              </div>
              
              {/* Formulaire de recherche */}
              <form className="voyageurx-search-form" onSubmit={(e) => { e.preventDefault(); fetchTrajets(); }}>
                <div className="voyageurx-form-group">
                  <label className="voyageurx-form-label">
                    <i className="fas fa-map-marker-alt"></i> Départ
                  </label>
                  {loadingGares ? (
                    <div className="voyageurx-form-loading">Chargement des gares...</div>
                  ) : (
                    <select
                      name="gareDepart"
                      value={filters.gareDepart}
                      onChange={handleFilter}
                      className="voyageurx-form-input"
                      required
                    >
                      <option value="">Sélectionnez une gare</option>
                      {gares.map((gare) => (
                        <option key={gare.id} value={gare.nom}>
                          {gare.nom} - {gare.ville}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div className="voyageurx-form-group">
                  <label className="voyageurx-form-label">
                    <i className="fas fa-flag-checkered"></i> Arrivée
                  </label>
                  {loadingGares ? (
                    <div className="voyageurx-form-loading">Chargement des gares...</div>
                  ) : (
                    <select
                      name="gareArrivee"
                      value={filters.gareArrivee}
                      onChange={handleFilter}
                      className="voyageurx-form-input"
                      required
                    >
                      <option value="">Sélectionnez une gare</option>
                      {gares.map((gare) => (
                        <option key={gare.id} value={gare.nom}>
                          {gare.nom} - {gare.ville}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div className="voyageurx-form-group">
                  <label className="voyageurx-form-label">
                    <i className="fas fa-calendar-alt"></i> Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={filters.date}
                    onChange={handleFilter}
                    className="voyageurx-form-input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="voyageurx-form-group">
                  <label className="voyageurx-form-label">
                    <i className="fas fa-users"></i> Voyageurs
                  </label>
                  <select
                    name="passagers"
                    value={filters.passagers}
                    onChange={handleFilter}
                    className="voyageurx-form-input"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'passager' : 'passagers'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button 
                  type="submit"
                  disabled={!filters.gareDepart || !filters.gareArrivee || loading}
                  className="voyageurx-search-btn"
                >
                  <i className="fas fa-search"></i>
                  {loading ? 'Recherche...' : 'Rechercher'}
                </button>
              </form>
              
              {/* Message d'état */}
              {filters.gareDepart && filters.gareArrivee && (
                <div className="voyageurx-search-status">
                  <p>
                    {loading ? '⏳ Recherche en cours...' : `🔍 Prêt à rechercher: ${filters.gareDepart} → ${filters.gareArrivee}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="voyageurx-main-content">
        {/* Messages d'erreur */}
        {apiError && (
          <div className="voyageurx-error-message">
            <div className="voyageurx-error-content">
              <div className="voyageurx-error-icon">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <p>{apiError}</p>
              <button 
                onClick={handleResetSearch}
                className="voyageurx-error-btn"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Section Billets */}
        {showBilletsSection && renderBilletsSection()}

        {/* SECTION ALGORITHME DE SÉLECTION AUTOMATIQUE */}
        {showAlgoSelection && trajets.length > 0 && !showBilletsSection && (
          <section className="algo-section">
            <div className="voyageurx-container">
              <div className="algo-intro">
                <h2 className="section-title">
                  <i className="fas fa-robot"></i>
                  Sélection Intelligente Automatique
                </h2>
                <p className="section-subtitle">
                  Notre algorithme analyse automatiquement les {trajets.length} trajets trouvés 
                  et sélectionne le meilleur selon vos critères
                </p>
              </div>
              
              <AlgoSelectionAuto
                trajets={trajets}
                onBilletSelect={handleAlgoBilletSelect}
              />
              
              {algoTrajetSelectionne && (
                <div className="selection-confirmation">
                  <h3>
                    <i className="fas fa-check-circle"></i>
                    Trajet sélectionné avec succès
                  </h3>
                  <div className="selected-trajet-card">
                    <div className="selected-info">
                      <h4>{algoTrajetSelectionne.train?.numero} - {algoTrajetSelectionne.train?.type}</h4>
                      <div className="selected-details">
                        <div className="detail">
                          <i className="fas fa-euro-sign"></i>
                          <span>{algoTrajetSelectionne.prix}€</span>
                        </div>
                        <div className="detail">
                          <i className="fas fa-clock"></i>
                          <span>{algoTrajetSelectionne.duree || calculerDuree(algoTrajetSelectionne.heure_depart, algoTrajetSelectionne.heure_arrivee)}</span>
                        </div>
                        <div className="detail">
                          <i className="fas fa-map-marker-alt"></i>
                          <span>{algoTrajetSelectionne.escales_count || 0} escale(s)</span>
                        </div>
                      </div>
                      <button 
                        className="btn-reserver"
                        onClick={() => openReservationModal(algoTrajetSelectionne)}
                      >
                        <i className="fas fa-ticket-alt"></i>
                        Réserver maintenant
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section résultats de recherche */}
        {!showBilletsSection && !showAlgoSelection && (
          <section className="voyageurx-results-section">
            {loading ? (
              <div className="voyageurx-loading">
                <div className="voyageurx-spinner"></div>
                <p>Recherche des trajets en cours...</p>
              </div>
            ) : searchPerformed && trajets.length > 0 ? (
              <div>
                <div className="voyageurx-results-header">
                  <div>
                    <h3 className="voyageurx-results-title">
                      <span className="voyageurx-results-count">{trajets.length}</span> trajet(s) disponible(s)
                    </h3>
                    <p className="voyageurx-results-subtitle">
                      Chaque jour • {filters.passagers} {filters.passagers === 1 ? 'passager' : 'passagers'}
                    </p>
                  </div>
                  <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="voyageurx-scroll-top"
                  >
                    <i className="fas fa-arrow-up"></i> Haut de page
                  </button>
                </div>
                
                <div className="voyageurx-trajets-grid">
                  {trajets.map((trajet) => {
                    const placesDisponibles = getPlacesDisponibles(trajet);
                    const peutReserver = placesDisponibles >= filters.passagers;
                    const prixTotal = getPrixTotal(trajet);
                    const escalesCount = trajet.escales?.length || trajet.escales_count || 0;
                    const typeTrajetBadge = getTypeTrajetBadge(trajet);
                    
                    return (
                      <div key={trajet.id} className="voyageurx-trajet-card">
                        {/* Badges du trajet */}
                        <div className="voyageurx-trajet-badges">
                          <span className={`voyageurx-badge-type ${typeTrajetBadge.color}`}>
                            {typeTrajetBadge.text}
                          </span>
                          {escalesCount === 0 && (
                            <span className="voyageurx-badge-type voyageurx-badge-green">
                              <i className="fas fa-bolt"></i> Direct
                            </span>
                          )}
                        </div>
                        
                        <div className="voyageurx-trajet-content">
                          {/* Informations principales */}
                          <div className="voyageurx-trajet-header">
                            <div>
                              <h4 className="voyageurx-trajet-train">
                                {trajet.train?.numero} • {trajet.train?.type}
                              </h4>
                              <p className="voyageurx-trajet-route">
                                {trajet.gare_depart?.ville} → {trajet.gare_arrivee?.ville}
                              </p>
                            </div>
                            <div className="voyageurx-trajet-prix">
                              <div className="voyageurx-prix-total">{prixTotal}€</div>
                              {filters.passagers > 1 && (
                                <div className="voyageurx-prix-detail">
                                  ({trajet.prix}€ × {filters.passagers})
                                </div>
                              )}
                              <div className={`voyageurx-places ${peutReserver ? 'voyageurx-places-ok' : 'voyageurx-places-warning'}`}>
                                <i className="fas fa-chair"></i> {placesDisponibles} places
                              </div>
                            </div>
                          </div>
                          
                          {/* Horaires et ligne de trajet */}
                          <div className="voyageurx-trajet-timeline">
                            <div className="voyageurx-time-point">
                              <div className="voyageurx-time">{formatHeure(trajet.heure_depart)}</div>
                              <div className="voyageurx-gare">
                                <div className="voyageurx-gare-nom">{trajet.gare_depart?.nom}</div>
                                <div className="voyageurx-gare-ville">{trajet.gare_depart?.ville}</div>
                              </div>
                            </div>
                            
                            <div className="voyageurx-timeline-wrapper">
                              <div className="voyageurx-timeline-duration">
                                {calculerDuree(trajet.heure_depart, trajet.heure_arrivee)}
                              </div>
                              <div className="voyageurx-timeline">
                                <div className="voyageurx-timeline-line">
                                  <div className="voyageurx-timeline-progress"></div>
                                  {/* Points d'escale */}
                                  {renderEscalesTimeline(trajet.escales)}
                                </div>
                              </div>
                              <div className="voyageurx-escales-info">
                                {escalesCount === 0 ? 'Trajet direct' : `${escalesCount} escale(s)`}
                              </div>
                            </div>
                            
                            <div className="voyageurx-time-point">
                              <div className="voyageurx-time">{formatHeure(trajet.heure_arrivee)}</div>
                              <div className="voyageurx-gare">
                                <div className="voyageurx-gare-nom">{trajet.gare_arrivee?.nom}</div>
                                <div className="voyageurx-gare-ville">{trajet.gare_arrivee?.ville}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Informations complémentaires */}
                          <div className="voyageurx-trajet-info">
                            <div className="voyageurx-info-item">
                              <i className="fas fa-train"></i>
                              <span>{trajet.train?.type}</span>
                            </div>
                            <div className="voyageurx-info-item">
                              <i className="fas fa-clock"></i>
                              <span>{calculerDuree(trajet.heure_depart, trajet.heure_arrivee)}</span>
                            </div>
                            <div className="voyageurx-info-item">
                              <i className="fas fa-calendar"></i>
                              <span>Disponible tous les jours</span>
                            </div>
                            {escalesCount > 0 && (
                              <div className="voyageurx-info-item">
                                <i className="fas fa-exchange-alt"></i>
                                <span>{escalesCount} escale(s)</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Bouton de réservation */}
                          <div className="voyageurx-trajet-actions">
                            <button 
                              onClick={() => openReservationModal(trajet)}
                              disabled={!peutReserver || !user}
                              className={`voyageurx-reserve-btn ${!peutReserver ? 'voyageurx-btn-disabled' : !user ? 'voyageurx-btn-login' : 'voyageurx-btn-available'}`}
                            >
                              {!user ? 'Connectez-vous pour réserver' : peutReserver ? 'Réserver maintenant' : 'Places insuffisantes'}
                            </button>
                            <div className="voyageurx-reserve-info">
                              {user ? 'Annulation gratuite' : 'Connexion requise'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : searchPerformed ? (
              <div className="voyageurx-no-results">
                <div className="voyageurx-no-results-icon">
                  <i className="fas fa-search"></i>
                </div>
                <h3 className="voyageurx-no-results-title">Aucun trajet trouvé</h3>
                <p className="voyageurx-no-results-text">
                  Aucun trajet ne circule entre ces gares. Essayez avec d'autres gares.
                </p>
                <button 
                  onClick={handleResetSearch}
                  className="voyageurx-no-results-btn"
                >
                  <i className="fas fa-redo"></i> Nouvelle recherche
                </button>
              </div>
            ) : (
              <div className="voyageurx-welcome">
                <div className="voyageurx-welcome-icon">
                  <i className="fas fa-train"></i>
                </div>
                <h3 className="voyageurx-welcome-title">Bienvenue sur VoyageurX</h3>
                <p className="voyageurx-welcome-text">
                  Sélectionnez les gares de départ et d'arrivée, puis cliquez sur "Rechercher" pour trouver des trajets.
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Modals */}
      {showReservationModal && (
        <BookingModal
          trajet={selectedTrajet}
          filters={filters}
          user={user}
          onClose={closeReservationModal}
          onConfirm={handleReservationConfirm}
          formatHeure={formatHeure}
          calculerDuree={calculerDuree}
          getPlacesDisponibles={getPlacesDisponibles}
        />
      )}

      {showParametresModal && (
        <ParametresModal
          user={user}
          onClose={closeParametresModal}
        />
      )}

      {showHistoriqueModal && (
        <HistoriqueModal
          user={user}
          onClose={closeHistoriqueModal}
          downloadBillet={downloadBillet}
        />
      )}

      {/* AJOUT DU CHATBOT - Assistant virtuel */}
      <ChatBot user={user} />
    </div>
  );
}