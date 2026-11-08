// components/AlgoSelectionAuto.jsx
import React, { useState, useEffect } from 'react';
import '../styles/AlgoSelectionAuto.css';

const AlgoSelectionAuto = ({ trajets, onBilletSelect }) => {
  const [modeAffichage, setModeAffichage] = useState('initial');
  const [trajetsAvecKC, setTrajetsAvecKC] = useState([]);
  const [trajetsSansEscales, setTrajetsSansEscales] = useState([]);
  const [criteresPriorite, setCriteresPriorite] = useState({
    prix: false,
    duree: false,
    escales: false
  });
  const [trajetsFiltres, setTrajetsFiltres] = useState([]);

  // Convertir durée en minutes
  const convertirDureeEnMinutes = (duree) => {
    if (!duree) return 0;
    
    if (typeof duree === 'string' && duree.includes('h')) {
      const parts = duree.toLowerCase().split('h');
      const heures = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return heures * 60 + minutes;
    }
    
    return parseInt(duree) || 0;
  };

  // Formater les minutes
  const formaterDuree = (minutes) => {
    if (!minutes && minutes !== 0) return '--:--';
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${heures}h ${mins}min` : `${heures}h`;
  };

  // Afficher durée de façon fiable
  const afficherDuree = (trajet) => {
    if (trajet.duree) return trajet.duree;
    if (trajet.dureeMinutes) return formaterDuree(trajet.dureeMinutes);
    if (trajet.heure_depart && trajet.heure_arrivee) {
      try {
        const depart = new Date(trajet.heure_depart);
        const arrivee = new Date(trajet.heure_arrivee);
        const diffMinutes = (arrivee - depart) / (1000 * 60);
        return formaterDuree(diffMinutes);
      } catch (e) {
        return '--:--';
      }
    }
    return '--:--';
  };

  // Calculer k/c
  const calculerKC = (trajet) => {
    let dureeMinutes = 0;
    
    if (trajet.duree) {
      dureeMinutes = convertirDureeEnMinutes(trajet.duree);
    } else if (trajet.heure_depart && trajet.heure_arrivee) {
      try {
        const depart = new Date(trajet.heure_depart);
        const arrivee = new Date(trajet.heure_arrivee);
        dureeMinutes = (arrivee - depart) / (1000 * 60);
      } catch (e) {
        dureeMinutes = 0;
      }
    }
    
    const escales = trajet.escales_count || 0;
    const denominateur = dureeMinutes + escales + 1;
    const kc = trajet.prix / denominateur;
    
    return {
      ...trajet,
      dureeMinutes,
      escales,
      kc: parseFloat(kc.toFixed(3)),
      estDirect: escales === 0
    };
  };

  // Initialiser les données
  useEffect(() => {
    if (trajets && trajets.length > 0) {
      const calcules = trajets.map(calculerKC);
      setTrajetsAvecKC(calcules);
      
      // Filtrer les trajets sans escales
      const sansEscales = calcules.filter(t => t.escales === 0);
      setTrajetsSansEscales(sansEscales);
      setTrajetsFiltres(sansEscales);
    }
  }, [trajets]);

  // Formater l'heure
  const formatHeure = (dateString) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  };

  // Sélection automatique
  const handleAutoSelect = () => {
    setModeAffichage('auto');
  };

  // Retour à l'écran initial
  const handleRetourInitial = () => {
    setModeAffichage('initial');
    setCriteresPriorite({
      prix: false,
      duree: false,
      escales: false
    });
    setTrajetsFiltres(trajetsSansEscales);
  };

  // Gérer le changement de critère prioritaire
  const handleCritereChange = (critere) => {
    const newCriteres = {
      prix: false,
      duree: false,
      escales: false
    };
    newCriteres[critere] = true;
    setCriteresPriorite(newCriteres);
    
    let trajetsTries = [...trajetsSansEscales];
    
    switch(critere) {
      case 'prix':
        trajetsTries.sort((a, b) => a.prix - b.prix);
        break;
      case 'duree':
        trajetsTries.sort((a, b) => a.dureeMinutes - b.dureeMinutes);
        break;
      case 'escales':
        trajetsTries.sort((a, b) => a.kc - b.kc);
        break;
      default:
        trajetsTries.sort((a, b) => a.kc - b.kc);
    }
    
    setTrajetsFiltres(trajetsTries);
  };

  // Obtenir le libellé du critère
  const getCritereLabel = (critere) => {
    switch(critere) {
      case 'prix': return 'Prix le plus bas';
      case 'duree': return 'Durée la plus courte';
      case 'escales': return 'Meilleur compromis (k/c)';
      default: return '';
    }
  };

  return (
    <div className="algo-selection-container">
      <div className="algo-header">
        <h2>
          <i className="fas fa-train"></i>
          Sélection de Trajet
        </h2>
        <p className="algo-subtitle">
          {modeAffichage === 'initial' 
            ? 'Choisissez votre méthode de sélection' 
            : 'Sélectionnez selon vos préférences'}
        </p>
      </div>

      {/* ÉCRAN INITIAL */}
      {modeAffichage === 'initial' && trajetsAvecKC.length > 0 && (
        <>
          <div className="tableau-initial">
            <h3>
              <i className="fas fa-list"></i>
              Tous les trajets disponibles ({trajetsAvecKC.length})
            </h3>
            
            <div className="tableau-trajets">
              <table>
                <thead>
                  <tr>
                    <th>Train</th>
                    <th>Départ</th>
                    <th>Arrivée</th>
                    <th>Durée</th>
                    <th>Prix</th>
                    <th>Escales</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {trajetsAvecKC.map((trajet) => (
                    <tr key={trajet.id}>
                      <td>
                        <div className="train-info">
                          <strong>{trajet.train.numero}</strong>
                          <small>{trajet.train.type}</small>
                        </div>
                      </td>
                      <td className="depart-cell">
                        <div className="heure-gare">
                          <span className="heure">{formatHeure(trajet.heure_depart)}</span>
                          <span className="gare">{trajet.gare_depart.nom}</span>
                        </div>
                      </td>
                      <td className="arrivee-cell">
                        <div className="heure-gare">
                          <span className="heure">{formatHeure(trajet.heure_arrivee)}</span>
                          <span className="gare">{trajet.gare_arrivee.nom}</span>
                        </div>
                      </td>
                      <td className="duree-cell">
                        <span className="value">{afficherDuree(trajet)}</span>
                      </td>
                      <td className="prix-cell">
                        <span className="value">{trajet.prix}€</span>
                      </td>
                      <td className="escales-cell">
                        <span className={`value ${trajet.escales === 0 ? 'direct' : ''}`}>
                          {trajet.escales}
                          {trajet.escales === 0 && <i className="fas fa-bolt"></i>}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-select-small"
                          onClick={() => onBilletSelect && onBilletSelect(trajet)}
                        >
                          <i className="fas fa-check"></i>
                          Choisir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="choix-methode">
            <h3>
              <i className="fas fa-hand-pointer"></i>
              Comment souhaitez-vous choisir ?
            </h3>
            
            <div className="methode-options">
              <div className="methode-card">
                <div className="methode-icon">
                  <i className="fas fa-hand-point-up"></i>
                </div>
                <h4>Sélection manuelle</h4>
                <p>
                  Choisissez vous-même un trajet dans le tableau ci-dessus.
                </p>
                <button 
                  className="btn-manuel"
                  onClick={() => onBilletSelect && trajetsAvecKC.length > 0 && onBilletSelect(trajetsAvecKC[0])}
                >
                  <i className="fas fa-mouse-pointer"></i>
                  Choisir manuellement
                </button>
              </div>
              
              <div className="methode-card">
                <div className="methode-icon">
                  <i className="fas fa-filter"></i>
                </div>
                <h4>Filtre intelligent</h4>
                <p>
                  Voir seulement les trajets <strong>sans escales</strong> et choisissez votre critère prioritaire.
                </p>
                <button 
                  className="btn-auto"
                  onClick={handleAutoSelect}
                >
                  <i className="fas fa-sliders-h"></i>
                  Filtrer les trajets
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ÉCRAN AUTO */}
      {modeAffichage === 'auto' && trajetsSansEscales.length > 0 && (
        <>
          <div className="retour-section">
            <button 
              className="btn-retour"
              onClick={handleRetourInitial}
            >
              <i className="fas fa-arrow-left"></i>
              Retour à tous les trajets
            </button>
          </div>

          <div className="intro-auto">
            <div className="intro-icon">
              <i className="fas fa-filter"></i>
            </div>
            <div className="intro-content">
              <h3>Trajets directs sans escales</h3>
              <p>
                {trajetsSansEscales.length} trajet{trajetsSansEscales.length > 1 ? 's' : ''} direct{trajetsSansEscales.length > 1 ? 's' : ''} disponible{trajetsSansEscales.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="selection-critere">
            <h4>
              <i className="fas fa-sliders-h"></i>
              Quel est votre critère le plus important ?
            </h4>
            
            <div className="critere-boutons">
              <button 
                className={`critere-btn ${criteresPriorite.prix ? 'active' : ''}`}
                onClick={() => handleCritereChange('prix')}
              >
                <div className="critere-icon">
                  <i className="fas fa-euro-sign"></i>
                </div>
                <div className="critere-info">
                  <div className="critere-titre">Prix le plus bas</div>
                  <div className="critere-desc">Priorité au tarif minimum</div>
                </div>
                {criteresPriorite.prix && (
                  <div className="critere-selected">
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </button>
              
              <button 
                className={`critere-btn ${criteresPriorite.duree ? 'active' : ''}`}
                onClick={() => handleCritereChange('duree')}
              >
                <div className="critere-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="critere-info">
                  <div className="critere-titre">Durée la plus courte</div>
                  <div className="critere-desc">Arriver le plus rapidement</div>
                </div>
                {criteresPriorite.duree && (
                  <div className="critere-selected">
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </button>
              
              <button 
                className={`critere-btn ${criteresPriorite.escales ? 'active' : ''}`}
                onClick={() => handleCritereChange('escales')}
              >
                <div className="critere-icon">
                  <i className="fas fa-balance-scale"></i>
                </div>
                <div className="critere-info">
                  <div className="critere-titre">Meilleur compromis</div>
                  <div className="critere-desc">Équilibre prix/durée (k/c)</div>
                </div>
                {criteresPriorite.escales && (
                  <div className="critere-selected">
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </button>
            </div>
          </div>

          {Object.values(criteresPriorite).some(v => v) && (
            <div className="critere-selectionne">
              <i className="fas fa-info-circle"></i>
              Trié par : <strong>{getCritereLabel(Object.keys(criteresPriorite).find(key => criteresPriorite[key]))}</strong>
            </div>
          )}

          {/* TABLEAU AVEC COLONNE ESCALES */}
          <div className="tableau-auto">
            <h3>
              <i className="fas fa-bolt"></i>
              Trajets directs {Object.values(criteresPriorite).some(v => v) ? `(triés par ${getCritereLabel(Object.keys(criteresPriorite).find(key => criteresPriorite[key]))})` : ''}
            </h3>
            
            {trajetsFiltres.length > 0 ? (
              <div className="tableau-sans-escales">
                <table>
                  <thead>
                    <tr>
                      <th>Train</th>
                      <th>Départ</th>
                      <th>Arrivée</th>
                      <th>Durée</th>
                      <th>Prix</th>
                      <th>Escales</th>
                      <th>k/c</th>
                      <th>Recommandé</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trajetsFiltres.map((trajet, index) => {
                      const estRecommande = index === 0 && Object.values(criteresPriorite).some(v => v);
                      const raisonRecommande = estRecommande ? 
                        getCritereLabel(Object.keys(criteresPriorite).find(key => criteresPriorite[key])) : '';
                      
                      return (
                        <tr key={trajet.id} className={estRecommande ? 'top-choice' : ''}>
                          <td>
                            <div className="train-info">
                              <strong>{trajet.train.numero}</strong>
                              <small>{trajet.train.type}</small>
                            </div>
                          </td>
                          <td className="depart-cell">
                            <div className="heure-gare">
                              <span className="heure">{formatHeure(trajet.heure_depart)}</span>
                              <span className="gare">{trajet.gare_depart.nom}</span>
                            </div>
                          </td>
                          <td className="arrivee-cell">
                            <div className="heure-gare">
                              <span className="heure">{formatHeure(trajet.heure_arrivee)}</span>
                              <span className="gare">{trajet.gare_arrivee.nom}</span>
                            </div>
                          </td>
                          <td className="duree-cell">
                            <span className="value">{afficherDuree(trajet)}</span>
                            <div className="duree-minutes">
                              ({trajet.dureeMinutes} min)
                            </div>
                          </td>
                          <td className="prix-cell">
                            <span className="value">{trajet.prix}€</span>
                          </td>
                          <td className="escales-cell">
                            <span className={`value ${trajet.escales === 0 ? 'direct' : ''}`}>
                              {trajet.escales}
                              {trajet.escales === 0 && <i className="fas fa-bolt"></i>}
                            </span>
                          </td>
                          <td className="kc-cell">
                            <div className="kc-value">
                              {trajet.kc.toFixed(3)}
                            </div>
                          </td>
                          <td className="recommande-cell">
                            {estRecommande ? (
                              <div className="recommande-badge">
                                <i className="fas fa-star"></i>
                                {raisonRecommande}
                              </div>
                            ) : (
                              <span className="non-recommande">—</span>
                            )}
                          </td>
                          <td>
                            <button 
                              className={`btn-select ${estRecommande ? 'btn-recommande' : ''}`}
                              onClick={() => onBilletSelect && onBilletSelect(trajet)}
                            >
                              <i className="fas fa-check"></i>
                              {estRecommande ? 'Recommandé' : 'Choisir'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="aucun-trajet">
                <i className="fas fa-search"></i>
                <p>Aucun trajet sans escales disponible</p>
              </div>
            )}
          </div>

          <div className="actions-footer">
            <button 
              className="btn-retour"
              onClick={handleRetourInitial}
            >
              <i className="fas fa-arrow-left"></i>
              Retour à tous les trajets
            </button>
            <div className="note-selection">
              <i className="fas fa-lightbulb"></i>
              Sélectionnez votre critère prioritaire pour voir les trajets correspondants
            </div>
          </div>
        </>
      )}

      {trajets.length === 0 && (
        <div className="no-trajets">
          <i className="fas fa-search"></i>
          <p>Aucun trajet disponible</p>
          <p className="sub">Effectuez d'abord une recherche de trajets</p>
        </div>
      )}
    </div>
  );
};

export default AlgoSelectionAuto;