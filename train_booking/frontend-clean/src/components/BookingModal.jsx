import React, { useState } from 'react';
import '../styles/BookingModal.css';

const BookingModal = ({ 
  trajet, 
  filters, 
  user, 
  onClose, 
  onConfirm,
  formatHeure,
  calculerDuree,
  getPlacesDisponibles 
}) => {
  const [reservationData, setReservationData] = useState({
    nom: user.name?.split(' ')[1] || '',
    prenom: user.name?.split(' ')[0] || user.username,
    email: user.email || '',
    telephone: '',
    classe: 'standard',
    prixTotal: trajet ? trajet.prix * filters.passagers : 0
  });
  
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  
  const [currentStep, setCurrentStep] = useState('details'); // 'details' ou 'payment'
  const [loading, setLoading] = useState(false);

  if (!trajet) return null;

  const handleReservationChange = (e) => {
    const { name, value } = e.target;
    setReservationData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'classe') {
      const prixBase = trajet.prix * filters.passagers;
      const nouveauPrix = value === 'premium' ? prixBase * 1.5 : prixBase;
      setReservationData(prev => ({
        ...prev,
        prixTotal: nouveauPrix
      }));
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    
    // Formatage automatique pour la carte
    if (name === 'cardNumber') {
      const formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      setPaymentData(prev => ({ ...prev, [name]: formattedValue }));
    } 
    // Formatage automatique pour la date d'expiration
    else if (name === 'expiryDate') {
      const formattedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
      setPaymentData(prev => ({ ...prev, [name]: formattedValue }));
    }
    else {
      setPaymentData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validatePayment = () => {
    const errors = [];
    
    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length !== 16) {
      errors.push('Numéro de carte invalide');
    }
    
    if (!paymentData.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentData.expiryDate)) {
      errors.push('Date d\'expiration invalide');
    }
    
    if (!paymentData.cvv || paymentData.cvv.length !== 3) {
      errors.push('CVV invalide');
    }
    
    if (!paymentData.cardholderName) {
      errors.push('Nom du titulaire requis');
    }
    
    return errors;
  };

  const handleSubmitDetails = (e) => {
    e.preventDefault();
    setCurrentStep('payment');
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    
    const errors = validatePayment();
    if (errors.length > 0) {
      alert('Erreurs de validation:\n' + errors.join('\n'));
      return;
    }

    setLoading(true);
    
    try {
      // Simulation de traitement de paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Si le paiement est "réussi", confirmer la réservation
      await onConfirm(reservationData);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const prixBase = trajet.prix * filters.passagers;

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal">
        {/* Header */}
        <div className="booking-modal-header">
          <div>
            <h2>
              {currentStep === 'details' ? 'Confirmer la réservation' : 'Paiement sécurisé'}
            </h2>
            <p>{trajet.gare_depart?.ville} → {trajet.gare_arrivee?.ville}</p>
          </div>
          <button onClick={onClose} className="close-button">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Indicateur d'étapes */}
        <div className="steps-indicator">
          <div className={`step ${currentStep === 'details' ? 'active' : 'completed'}`}>
            <div className="step-number">1</div>
            <span>Détails</span>
          </div>
          <div className="step-line"></div>
          <div className={`step ${currentStep === 'payment' ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <span>Paiement</span>
          </div>
        </div>

        {/* Étape 1: Détails de réservation */}
        {currentStep === 'details' && (
          <form onSubmit={handleSubmitDetails} className="reservation-form">
            <div className="form-section">
              <h3>Informations personnelles</h3>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    type="text"
                    name="prenom"
                    value={reservationData.prenom}
                    onChange={handleReservationChange}
                    required
                    placeholder="Votre prénom"
                  />
                </div>
                
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    name="nom"
                    value={reservationData.nom}
                    onChange={handleReservationChange}
                    required
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={reservationData.email}
                  onChange={handleReservationChange}
                  required
                  placeholder="votre@email.com"
                />
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={reservationData.telephone}
                  onChange={handleReservationChange}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Options de voyage</h3>
              
              <div className="form-group">
                <label>Classe</label>
                <select name="classe" value={reservationData.classe} onChange={handleReservationChange}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium (+50%)</option>
                </select>
              </div>
            </div>

            {/* Récapitulatif du prix */}
            <div className="price-summary">
              <h4>Récapitulatif</h4>
              <div className="price-line">
                <span>Prix base ({filters.passagers} passager(s)):</span>
                <span>{prixBase.toFixed(2)}€</span>
              </div>
              {reservationData.classe === 'premium' && (
                <div className="price-line premium">
                  <span>Supplément premium:</span>
                  <span>+{(prixBase * 0.5).toFixed(2)}€</span>
                </div>
              )}
              <div className="price-total">
                <span>Total à payer:</span>
                <span>{reservationData.prixTotal}€</span>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button type="button" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="primary">
                Continuer vers le paiement
              </button>
            </div>
          </form>
        )}

        {/* Étape 2: Paiement */}
        {currentStep === 'payment' && (
          <form onSubmit={handleSubmitPayment} className="payment-form">
            <div className="payment-security">
              <div className="secure-badge">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
                Paiement sécurisé SSL
              </div>
            </div>

            <div className="form-section">
              <h3>Informations de paiement</h3>
              
              <div className="form-group">
                <label>Numéro de carte *</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={paymentData.cardNumber}
                  onChange={handlePaymentChange}
                  required
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                />
                <div className="card-icons">
                  <span className="card-icon">💳</span>
                  <span className="card-icon">🔒</span>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Date d'expiration *</label>
                  <input
                    type="text"
                    name="expiryDate"
                    value={paymentData.expiryDate}
                    onChange={handlePaymentChange}
                    required
                    placeholder="MM/AA"
                    maxLength="5"
                  />
                </div>
                
                <div className="form-group">
                  <label>CVV *</label>
                  <input
                    type="text"
                    name="cvv"
                    value={paymentData.cvv}
                    onChange={handlePaymentChange}
                    required
                    placeholder="123"
                    maxLength="3"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nom du titulaire *</label>
                <input
                  type="text"
                  name="cardholderName"
                  value={paymentData.cardholderName}
                  onChange={handlePaymentChange}
                  required
                  placeholder="M. DUPONT Jean"
                />
              </div>
            </div>

            {/* Récapitulatif final */}
            <div className="final-summary">
              <h4>Récapitulatif de commande</h4>
              <div className="summary-item">
                <span>Trajet:</span>
                <span>{trajet.gare_depart?.ville} → {trajet.gare_arrivee?.ville}</span>
              </div>
              <div className="summary-item">
                <span>Train:</span>
                <span>{trajet.train?.numero} - {trajet.train?.type}</span>
              </div>
              <div className="summary-item">
                <span>Passagers:</span>
                <span>{filters.passagers} {filters.passagers === 1 ? 'personne' : 'personnes'}</span>
              </div>
              <div className="summary-item">
                <span>Classe:</span>
                <span>{reservationData.classe === 'premium' ? 'Premium' : 'Standard'}</span>
              </div>
              <div className="summary-total">
                <span>Total:</span>
                <span>{reservationData.prixTotal}€</span>
              </div>
            </div>

            {/* Actions de paiement */}
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setCurrentStep('details')}
                disabled={loading}
              >
                ← Retour
              </button>
              <button
                type="submit"
                className="primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Traitement en cours...
                  </>
                ) : (
                  `Payer ${reservationData.prixTotal}€`
                )}
              </button>
            </div>

            {/* Informations de test */}
            <div className="test-info">
              <h5>💳 Carte de test pour simulation :</h5>
              <p><strong>Numéro:</strong> 4242 4242 4242 4242</p>
              <p><strong>Date:</strong> 12/25</p>
              <p><strong>CVV:</strong> 123</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookingModal;