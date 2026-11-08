from django.http import JsonResponse, HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework_simplejwt.tokens import RefreshToken
from io import BytesIO
import json
import logging
import os
import threading
import uuid
from datetime import datetime, timedelta
from collections import defaultdict
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from django.conf import settings
from PIL import Image
import qrcode
import hashlib
from django.core.files.base import ContentFile

from .models import Gare, Train, Trajet, Billet, Escale
from .serializers import GareSerializer, TrainSerializer, TrajetSerializer, BilletSerializer, EscaleSerializer

logger = logging.getLogger(__name__)

# ========== IMPORT GPT4ALL ==========
try:
    from gpt4all import GPT4All
    GPT4ALL_DISPONIBLE = True
except ImportError:
    GPT4ALL_DISPONIBLE = False
    print("⚠️ GPT4All non installé. Installe-le avec: pip install gpt4all")

# ========== ASSISTANT FERROVIAIRE - HYBRIDE (BD + TinyLlama reformulation) ==========

class AssistantFerroviaire:
    """Assistant BD + TinyLlama pour reformuler les réponses"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self.model = None
        
        print("\n" + "="*60)
        print("🤖 ASSISTANT VOYAGEURX - MODE HYBRIDE")
        print("="*60)
        
        # Charger TinyLlama si disponible
        if GPT4ALL_DISPONIBLE:
            self._charger_tinyllama()
        
        if self.model is None:
            print("⚠️ TinyLlama non disponible - Mode BD uniquement")
        else:
            print("✅ TinyLlama chargé - Reformulation des réponses")
        print("="*60 + "\n")
    
    def _charger_tinyllama(self):
        """Charge TinyLlama depuis le dossier local"""
        try:
            model_path = getattr(settings, 'GPT4ALL_MODEL_PATH', os.path.join(settings.BASE_DIR, 'models/'))
            # Utiliser EXACTEMENT ton modèle
            model_name = 'TinyLlama-1.1B-Chat-v0.4-Q4_K_M.gguf'
            
            full_path = os.path.join(model_path, model_name)
            
            if not os.path.exists(full_path):
                print(f"⚠️ TinyLlama non trouvé: {full_path}")
                print(f"📁 Dossier models: {model_path}")
                # Lister les fichiers disponibles
                if os.path.exists(model_path):
                    fichiers = os.listdir(model_path)
                    print(f"📋 Fichiers trouvés: {fichiers}")
                self.model = None
                return
            
            print(f"📂 Chargement de {model_name}...")
            self.model = GPT4All(model_name, model_path=model_path, allow_download=False, device='cpu')
            print(f"✅ TinyLlama chargé avec succès!")
            
        except Exception as e:
            print(f"⚠️ Erreur chargement: {e}")
            self.model = None
    
    def extraire_mots_cles(self, message):
        """Extrait les mots-clés significatifs d'une phrase"""
        stop_words = ['pour', 'depuis', 'vers', 'train', 'trajet', 'voyage', 'aller', 
                      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
                      'veux', 'veut', 'voulons', 'voulez', 'cherche', 'cherches',
                      'un', 'une', 'des', 'le', 'la', 'les', 'de', 'du', 'des',
                      'a', 'au', 'aux', 'et', 'ou', 'mais', 'donc', 'car', '?', '!']
        
        mots_cles = []
        for mot in message.lower().split():
            if mot not in stop_words and len(mot) > 2:
                mots_cles.append(mot)
        return mots_cles
    
    def trouver_gares(self, mots_cles):
        """Trouve les gares correspondant aux mots-clés"""
        gares_trouvees = []
        for gare in Gare.objects.all():
            gare_nom = gare.nom.lower()
            gare_ville = gare.ville.lower()
            for mot in mots_cles:
                if mot in gare_nom or mot in gare_ville:
                    if gare not in gares_trouvees:
                        gares_trouvees.append(gare)
                        break
        return gares_trouvees
    
    def rechercher_trajets(self, depart=None, arrivee=None, limit=5):
        """Recherche des trajets dans la base de données"""
        if depart and arrivee:
            trajets = Trajet.objects.filter(
                gare_depart=depart,
                gare_arrivee=arrivee
            ).select_related('gare_depart', 'gare_arrivee', 'train').order_by('heure_depart')[:limit]
        elif depart:
            trajets = Trajet.objects.filter(
                Q(gare_depart=depart) | Q(gare_arrivee=depart)
            ).select_related('gare_depart', 'gare_arrivee', 'train').order_by('heure_depart')[:limit]
        else:
            trajets = Trajet.objects.all().select_related('gare_depart', 'gare_arrivee', 'train').order_by('heure_depart')[:limit]
        
        resultats = []
        for t in trajets:
            resultats.append({
                'id': t.id,
                'depart': t.gare_depart.nom,
                'arrivee': t.gare_arrivee.nom,
                'date': t.heure_depart.strftime('%d/%m/%Y'),
                'heure_depart': t.heure_depart.strftime('%H:%M'),
                'prix': float(t.prix),
                'train_numero': t.train.numero,
                'train_type': t.train.type
            })
        return resultats
    
    def generer_reponse_base(self, message, utilisateur=None):
        """Génère la réponse brute depuis la base de données (sans IA)"""
        message_lower = message.lower()
        mots_cles = self.extraire_mots_cles(message)
        gares_trouvees = self.trouver_gares(mots_cles)
        
        # === TRAJETS ===
        if any(word in message_lower for word in ['trajet', 'voyage', 'train', 'aller']):
            if len(gares_trouvees) >= 2:
                depart = gares_trouvees[0]
                arrivee = gares_trouvees[1]
                trajets = self.rechercher_trajets(depart=depart, arrivee=arrivee)
                
                if trajets:
                    if len(trajets) == 1:
                        t = trajets[0]
                        return f"Trajet {t['depart']} → {t['arrivee']} le {t['date']} à {t['heure_depart']} pour {t['prix']}€ (Train {t['train_numero']})"
                    else:
                        reponse = f"{len(trajets)} trajets {depart.nom} → {arrivee.nom}: "
                        for i, t in enumerate(trajets[:3]):
                            reponse += f"{t['heure_depart']} {t['prix']}€"
                            if i < len(trajets[:3]) - 1:
                                reponse += ", "
                        return reponse
                else:
                    return f"Aucun trajet trouvé entre {depart.nom} et {arrivee.nom}"
            
            elif len(gares_trouvees) == 1:
                gare = gares_trouvees[0]
                trajets = self.rechercher_trajets(depart=gare)
                if trajets:
                    reponse = f"Trajets avec {gare.nom}: "
                    for i, t in enumerate(trajets[:3]):
                        if t['depart'] == gare.nom:
                            reponse += f"{t['depart']} → {t['arrivee']} à {t['heure_depart']}"
                        else:
                            reponse += f"{t['arrivee']} ← {t['depart']} à {t['heure_depart']}"
                        if i < len(trajets[:3]) - 1:
                            reponse += ", "
                    return reponse
                return f"Aucun trajet trouvé pour {gare.nom}"
            
            return "Précisez deux gares (ex: Paris Lyon)"
        
        # === GARES ===
        if 'gare' in message_lower or 'station' in message_lower:
            if 'liste' in message_lower or 'quelles' in message_lower:
                gares = Gare.objects.all()
                if gares:
                    reponse = f"Gares disponibles: "
                    reponse += ", ".join([g.nom for g in gares[:15]])
                    if Gare.objects.count() > 15:
                        reponse += f" et {Gare.objects.count() - 15} autres"
                    return reponse
                return "Aucune gare dans la base"
        
        # === PRIX ===
        if 'prix' in message_lower or 'tarif' in message_lower:
            if len(gares_trouvees) >= 2:
                depart = gares_trouvees[0]
                arrivee = gares_trouvees[1]
                trajets = self.rechercher_trajets(depart=depart, arrivee=arrivee)
                if trajets:
                    prix_min = min(t['prix'] for t in trajets)
                    prix_max = max(t['prix'] for t in trajets)
                    return f"Prix {depart.nom} → {arrivee.nom}: {prix_min}€ à {prix_max}€"
                return f"Aucun prix trouvé pour {depart.nom} → {arrivee.nom}"
            return "Précisez deux gares (ex: prix Paris Lyon)"
        
        # === BILLETS ===
        if 'billet' in message_lower or 'mes billets' in message_lower:
            if not utilisateur or not utilisateur.is_authenticated:
                return "Veuillez vous connecter pour voir vos billets"
            billets = Billet.objects.filter(utilisateur=utilisateur, statut='réservé')
            if billets:
                reponse = f"Vous avez {billets.count()} billet(s): "
                for i, b in enumerate(billets[:3]):
                    reponse += f"{b.trajet.gare_depart.nom} → {b.trajet.gare_arrivee.nom}"
                    if i < len(billets[:3]) - 1:
                        reponse += ", "
                return reponse
            return "Vous n'avez aucun billet réservé"
        
        # === AIDE ===
        if any(word in message_lower for word in ['bonjour', 'salut', 'aide', 'help']):
            return "Bonjour ! Je suis l'assistant VoyageurX. Commandes: 'Paris Lyon' pour un trajet, 'liste des gares', 'prix Paris Lyon', 'mes billets'"
        
        if 'merci' in message_lower:
            return "Je vous en prie ! Bon voyage !"
        
        return "Je n'ai pas compris. Essayez 'Paris Lyon' ou 'aide'"
    
    def reformuler_avec_tinyllama(self, reponse_brute, question_originale):
        """Utilise TinyLlama UNIQUEMENT pour reformuler la réponse"""
        if self.model is None or not reponse_brute:
            return reponse_brute
        
        # Prompt pour reformuler (pas pour inventer)
        prompt = f"""Reformule cette réponse de manière plus naturelle et amicale, sans changer les informations:

Question: {question_originale}
Réponse exacte: {reponse_brute}

Réponse reformulée (courte et naturelle): """
        
        try:
            response = self.model.generate(
                prompt,
                max_tokens=100,
                temp=0.4,
                top_k=40,
                top_p=0.9,
                repeat_penalty=1.1
            )
            
            response = response.strip()
            
            # Nettoyer les balises
            nettoyer = ["<s>", "</s>", "User:", "Assistant:", "Réponse:", "Reformule", "\n\n"]
            for mot in nettoyer:
                response = response.replace(mot, "")
            
            response = response.strip()
            
            # Si la reformulation est valide, la retourner
            if response and len(response) > 10 and len(response) < len(reponse_brute) * 2:
                return response
            return reponse_brute
            
        except Exception as e:
            print(f"⚠️ Erreur reformulation: {e}")
            return reponse_brute
    
    def generer_reponse(self, user_message, utilisateur=None):
        """Génère la réponse avec reformulation optionnelle"""
        
        print(f"\n🔍 Message: '{user_message}'")
        
        # 1. Générer la réponse brute depuis la BD (précise et fiable)
        reponse_brute = self.generer_reponse_base(user_message, utilisateur)
        print(f"📊 Réponse brute: {reponse_brute[:80]}...")
        
        # 2. Si TinyLlama est disponible, essayer de reformuler
        if self.model is not None and len(reponse_brute) > 20 and not reponse_brute.startswith("Je n'ai pas compris"):
            reponse_reformulee = self.reformuler_avec_tinyllama(reponse_brute, user_message)
            if reponse_reformulee != reponse_brute:
                print(f"✨ TinyLlama a reformulé")
                return reponse_reformulee
        
        # 3. Sinon retourner la réponse brute
        return reponse_brute

# ========== VIEWSETS ==========

class GareViewSet(viewsets.ModelViewSet):
    queryset = Gare.objects.all()
    serializer_class = GareSerializer
    permission_classes = [AllowAny]

class TrainViewSet(viewsets.ModelViewSet):
    queryset = Train.objects.all()
    serializer_class = TrainSerializer
    permission_classes = [AllowAny]

class EscaleViewSet(viewsets.ModelViewSet):
    queryset = Escale.objects.all()
    serializer_class = EscaleSerializer
    permission_classes = [AllowAny]

class TrajetViewSet(viewsets.ModelViewSet):
    queryset = Trajet.objects.all()
    serializer_class = TrajetSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Trajet.objects.all()
        
        queryset = queryset.select_related(
            'gare_depart', 
            'gare_arrivee', 
            'train'
        ).prefetch_related(
            'escales__gare'
        )
        
        gare_depart = self.request.query_params.get('gare_depart')
        gare_arrivee = self.request.query_params.get('gare_arrivee')
        
        if gare_depart:
            queryset = queryset.filter(gare_depart__nom__icontains=gare_depart)
        if gare_arrivee:
            queryset = queryset.filter(gare_arrivee__nom__icontains=gare_arrivee)
            
        return queryset

    def list(self, request):
        gare_depart = request.GET.get('gare_depart', '').strip()
        gare_arrivee = request.GET.get('gare_arrivee', '').strip()
        date = request.GET.get('date', '').strip()
        
        trajets = Trajet.objects.all()
        
        if gare_depart:
            trajets = trajets.filter(
                Q(gare_depart__nom__icontains=gare_depart) |
                Q(gare_depart__ville__icontains=gare_depart)
            )
        
        if gare_arrivee:
            trajets = trajets.filter(
                Q(gare_arrivee__nom__icontains=gare_arrivee) |
                Q(gare_arrivee__ville__icontains=gare_arrivee)
            )
        
        if date:
            trajets = trajets.filter(heure_depart__date=date)
        
        trajets = trajets.order_by('heure_depart')
        
        logger.info(f"🔍 Recherche: {gare_depart} -> {gare_arrivee}, résultats: {trajets.count()}")
        
        serializer = self.get_serializer(trajets, many=True)
        return Response(serializer.data)

# ========== BILLETVIEWSET ==========

@method_decorator(csrf_exempt, name='dispatch')
class BilletViewSet(viewsets.ModelViewSet):
    serializer_class = BilletSerializer
    permission_classes = [IsAuthenticated]
    queryset = Billet.objects.all()

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            print("❌ Utilisateur non authentifié")
            return Billet.objects.none()
        
        print(f"✅ Utilisateur authentifié: {self.request.user}")
        return Billet.objects.filter(utilisateur=self.request.user)

    def create(self, request, *args, **kwargs):
        print("="*50)
        print("📥 BilletViewSet.create appelé")
        print(f"👤 Utilisateur: {request.user}")
        print(f"🔑 Authentifié: {request.user.is_authenticated}")
        print(f"📦 Données reçues: {request.data}")
        print("="*50)
        
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        data = request.data.copy()
        
        if 'trajet_id' in data and 'trajet' not in data:
            data['trajet'] = data['trajet_id']
            del data['trajet_id']
        
        if 'gare_embarquement_id' in data and data['gare_embarquement_id'] is None:
            del data['gare_embarquement_id']
        if 'gare_descente_id' in data and data['gare_descente_id'] is None:
            del data['gare_descente_id']
        
        if 'prix_total' in data:
            try:
                data['prix_total'] = float(data['prix_total'])
            except (ValueError, TypeError):
                pass
        
        print(f"📦 Données adaptées: {data}")
        
        serializer = self.get_serializer(data=data)
        
        if serializer.is_valid():
            print("✅ Données valides")
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print(f"❌ Erreurs: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        print(f"💾 Sauvegarde pour {self.request.user}")
        serializer.save(utilisateur=self.request.user)

# ========== API VIEWS ==========

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def register_view(request):
    logger.info(f"📝 Tentative d'inscription")
    
    from .serializers import RegisterSerializer
    
    data = request.data.copy()
    
    if 'password2' in data:
        data['password_confirm'] = data['password2']
    
    serializer = RegisterSerializer(data=data)
    
    if serializer.is_valid():
        try:
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            response_data = {
                'success': True,
                'message': 'Compte créé avec succès',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                }
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    errors = {}
    for field, error_list in serializer.errors.items():
        errors[field] = error_list[0] if isinstance(error_list, list) else str(error_list)
    
    return Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    username = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'success': False, 'message': 'Identifiants requis'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'success': True,
            'message': 'Connexion réussie',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            }
        })
    else:
        return Response({'success': False, 'message': 'Identifiants incorrects'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'success': True, 'message': 'Déconnexion réussie'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'is_authenticated': True
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def get_gares(request):
    gares = Gare.objects.all()
    gares_data = [{'id': g.id, 'nom': g.nom, 'ville': g.ville, 'code': g.code} for g in gares]
    return Response(gares_data)

@api_view(['POST'])
@permission_classes([AllowAny])
def search_trajets(request):
    try:
        gare_depart = request.data.get('gare_depart', '').strip()
        gare_arrivee = request.data.get('gare_arrivee', '').strip()
        date_depart = request.data.get('date_depart', '').strip()
        nombre_passagers = int(request.data.get('nombre_passagers', 1))
        
        if not gare_depart or not gare_arrivee:
            return Response({'error': 'Gares requises'}, status=status.HTTP_400_BAD_REQUEST)
        
        trajets = Trajet.objects.filter(
            gare_depart__nom__icontains=gare_depart,
            gare_arrivee__nom__icontains=gare_arrivee
        ).select_related('train', 'gare_depart', 'gare_arrivee')
        
        if date_depart:
            trajets = trajets.filter(heure_depart__date=date_depart)
        
        trajets_data = []
        for trajet in trajets:
            billets_reserves = Billet.objects.filter(trajet=trajet, statut__in=['réservé', 'confirmé']).count()
            places_restantes = trajet.train.capacite - billets_reserves
            disponible = places_restantes >= nombre_passagers
            
            trajets_data.append({
                'id': trajet.id,
                'train': {'id': trajet.train.id, 'numero': trajet.train.numero, 'type': trajet.train.type, 'capacite': trajet.train.capacite},
                'gare_depart': {'id': trajet.gare_depart.id, 'nom': trajet.gare_depart.nom, 'ville': trajet.gare_depart.ville, 'code': trajet.gare_depart.code},
                'gare_arrivee': {'id': trajet.gare_arrivee.id, 'nom': trajet.gare_arrivee.nom, 'ville': trajet.gare_arrivee.ville, 'code': trajet.gare_arrivee.code},
                'heure_depart': trajet.heure_depart.isoformat(),
                'heure_arrivee': trajet.heure_arrivee.isoformat(),
                'prix': float(trajet.prix),
                'duree': str(trajet.duree()),
                'places_restantes': max(0, places_restantes),
                'disponible': disponible,
                'nombre_passagers': nombre_passagers,
                'prix_total': float(trajet.prix * nombre_passagers)
            })
        
        return Response({'success': True, 'trajets': trajets_data, 'count': len(trajets_data)})
        
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ========== CHATBOT ==========

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@csrf_exempt
def chatbot_reply(request):
    """Assistant avec TinyLlama pour reformulation"""
    try:
        message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id', str(uuid.uuid4()))
        
        if not message:
            return Response({'reply': 'Veuillez saisir un message.', 'session_id': session_id})
        
        logger.info(f"💬 Message: {message[:50]}...")
        
        assistant = AssistantFerroviaire()
        reply = assistant.generer_reponse(message, request.user if request.user.is_authenticated else None)
        
        return Response({
            'reply': reply,
            'session_id': session_id,
            'mode': 'HYBRIDE_BD_TINYLLAMA'
        })
        
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        return Response({'reply': "Désolé, une erreur est survenue."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ========== GÉNÉRATION PDF ==========

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_billet_pdf(request, billet_id):
    try:
        billet = get_object_or_404(Billet, id=billet_id)
        
        if request.user != billet.utilisateur and not request.user.is_staff:
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        qr_image_buffer = None
        
        if billet.qr_code and hasattr(billet.qr_code, 'path') and os.path.exists(billet.qr_code.path):
            try:
                with open(billet.qr_code.path, 'rb') as f:
                    qr_image_buffer = BytesIO(f.read())
                qr_image_buffer.seek(0)
            except Exception:
                qr_image_buffer = None
        
        if not qr_image_buffer:
            try:
                qr_data = {
                    "billet_id": billet.id,
                    "passager": billet.utilisateur.username,
                    "trajet": f"{billet.trajet.gare_depart.nom} → {billet.trajet.gare_arrivee.nom}",
                    "date_depart": billet.trajet.heure_depart.strftime('%H:%M'),
                    "date_voyage": billet.date_voyage.strftime('%d/%m/%Y') if billet.date_voyage else '',
                    "prix": str(billet.prix_total),
                    "statut": billet.statut
                }
                
                qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
                qr.add_data(json.dumps(qr_data))
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                qr_image_buffer = BytesIO()
                img.save(qr_image_buffer, format='PNG')
                qr_image_buffer.seek(0)
                
                filename = f"billet_{billet.id}_qr.png"
                billet.qr_code.save(filename, ContentFile(qr_image_buffer.getvalue()), save=True)
            except Exception:
                qr_image_buffer = None
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        c.setFont("Helvetica-Bold", 20)
        c.drawString(2*cm, 27*cm, "VOYAGEURX - BILLET DE TRAIN")
        
        c.setFont("Helvetica", 12)
        c.drawString(2*cm, 25*cm, f"Billet N°: {billet.id}")
        c.drawString(2*cm, 24*cm, f"Réservation: {billet.date_reservation.strftime('%d/%m/%Y %H:%M')}")
        c.drawString(2*cm, 23*cm, f"Statut: {billet.statut}")
        c.drawString(2*cm, 22*cm, f"Prix total: {billet.prix_total}€")
        
        c.setFont("Helvetica-Bold", 14)
        c.drawString(2*cm, 20*cm, "INFORMATIONS DU TRAJET")
        
        c.setFont("Helvetica", 12)
        c.drawString(2*cm, 19*cm, f"Départ: {billet.trajet.gare_depart.nom} ({billet.trajet.gare_depart.ville})")
        c.drawString(2*cm, 18*cm, f"Arrivée: {billet.trajet.gare_arrivee.nom} ({billet.trajet.gare_arrivee.ville})")
        
        date_str = billet.date_voyage.strftime('%d/%m/%Y') if billet.date_voyage else billet.trajet.heure_depart.strftime('%d/%m/%Y')
        c.drawString(2*cm, 17*cm, f"Date du voyage: {date_str}")
        c.drawString(2*cm, 16*cm, f"Heure départ: {billet.trajet.heure_depart.strftime('%H:%M')}")
        c.drawString(2*cm, 15*cm, f"Heure arrivée: {billet.trajet.heure_arrivee.strftime('%H:%M')}")
        c.drawString(2*cm, 14*cm, f"Train: {billet.trajet.train.numero} - {billet.trajet.train.type}")
        c.drawString(2*cm, 13*cm, f"Durée: {billet.trajet.duree()}")
        
        c.setFont("Helvetica-Bold", 14)
        c.drawString(2*cm, 11*cm, "INFORMATIONS PASSAGER")
        
        c.setFont("Helvetica", 12)
        c.drawString(2*cm, 10*cm, f"Nom: {billet.utilisateur.username}")
        c.drawString(2*cm, 9*cm, f"Email: {billet.utilisateur.email}")
        c.drawString(2*cm, 8*cm, f"Nombre de passagers: {billet.nombre_passagers}")
        
        if qr_image_buffer:
            try:
                img_reader = ImageReader(qr_image_buffer)
                c.drawImage(img_reader, 14*cm, 20*cm, width=5*cm, height=5*cm)
                c.setFont("Helvetica", 9)
                c.drawString(14*cm, 19.5*cm, "QR Code validation")
            except Exception:
                pass
        
        c.setFont("Helvetica", 10)
        c.drawString(2*cm, 3*cm, "Merci d'avoir choisi VoyageurX !")
        c.drawString(2*cm, 2.5*cm, "Contact: +375 25 527 48 97")
        
        width, height = A4
        c.rect(1*cm, 1*cm, width - 2*cm, height - 2*cm)
        
        c.showPage()
        c.save()
        
        pdf = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="billet_{billet.id}.pdf"'
        return response
        
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_billets_pdf(request):
    try:
        billets = Billet.objects.filter(utilisateur=request.user, statut='réservé')
        if not billets:
            return Response({'error': 'Aucun billet'}, status=status.HTTP_404_NOT_FOUND)
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        c.setFont("Helvetica-Bold", 20)
        c.drawString(2*cm, 27*cm, f"MES BILLETS ({billets.count()})")
        
        y = 25*cm
        for billet in billets:
            if y < 5*cm:
                c.showPage()
                y = 27*cm
            
            c.setFont("Helvetica-Bold", 14)
            c.drawString(2*cm, y, f"Billet N°{billet.id}")
            
            c.setFont("Helvetica", 12)
            y -= 0.8*cm
            c.drawString(2*cm, y, f"{billet.trajet.gare_depart.nom} → {billet.trajet.gare_arrivee.nom}")
            
            date_str = billet.date_voyage.strftime('%d/%m/%Y') if billet.date_voyage else billet.trajet.heure_depart.strftime('%d/%m/%Y')
            y -= 0.8*cm
            c.drawString(2*cm, y, f"Date: {date_str}")
            
            y -= 0.8*cm
            c.drawString(2*cm, y, f"Prix: {billet.prix_total}€ | Statut: {billet.statut}")
            
            y -= 1.5*cm
        
        c.showPage()
        c.save()
        
        pdf = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="billets_{request.user.username}.pdf"'
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ========== VUES QR CODE ==========

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_qr_code(request, billet_id):
    try:
        billet = get_object_or_404(Billet, id=billet_id)
        if request.user != billet.utilisateur and not request.user.is_staff:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        if billet.qr_code and billet.qr_code.url:
            return Response({'success': True, 'qr_code_url': billet.qr_code.url})
        
        billet.generer_qr_code()
        billet.save()
        return Response({'success': True, 'qr_code_url': billet.qr_code.url if billet.qr_code else None})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_qr_code(request, billet_id):
    try:
        billet = get_object_or_404(Billet, id=billet_id)
        if request.user != billet.utilisateur and not request.user.is_staff:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        if billet.qr_code and hasattr(billet.qr_code, 'path') and os.path.exists(billet.qr_code.path):
            os.remove(billet.qr_code.path)
        
        billet.generer_qr_code()
        billet.save()
        
        return Response({'success': True, 'qr_code_url': billet.qr_code.url})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ========== TESTS ==========

@api_view(['GET'])
@permission_classes([AllowAny])
def test_qr_generation(request):
    try:
        billet = Billet.objects.first()
        if not billet:
            return Response({"error": "Aucun billet"})
        
        billet.generer_qr_code()
        billet.save()
        
        return Response({"success": True, "qr_code": billet.qr_code.url if billet.qr_code else None})
        
    except Exception as e:
        return Response({"error": str(e)})

@api_view(['GET'])
@permission_classes([AllowAny])
def test_pdf(request):
    try:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        c.setFont("Helvetica-Bold", 20)
        c.drawString(2*cm, height - 2*cm, "TEST PDF - VOYAGEURX")
        
        c.setFont("Helvetica", 12)
        c.drawString(2*cm, height - 4*cm, "Test de génération PDF")
        c.drawString(2*cm, height - 5*cm, f"Date: {timezone.now().strftime('%d/%m/%Y %H:%M:%S')}")
        
        c.rect(1*cm, 1*cm, width - 2*cm, height - 2*cm)
        c.showPage()
        c.save()
        
        pdf = buffer.getvalue()
        buffer.close()
        
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="test.pdf"'
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ========== COMPATIBILITÉ ==========

@method_decorator(csrf_exempt, name='dispatch')
class CompatLoginView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            
            if user:
                login(request, user)
                return JsonResponse({
                    'success': True,
                    'user': {'id': user.id, 'username': user.username, 'email': user.email, 'name': f"{user.first_name} {user.last_name}".strip() or user.username}
                })
            return JsonResponse({'success': False, 'message': 'Identifiants invalides'}, status=400)
        except:
            return JsonResponse({'success': False, 'message': 'Erreur'}, status=400)

@api_view(['GET'])
def get_current_user_legacy(request):
    if request.user.is_authenticated:
        user = request.user
        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'is_authenticated': True
        })
    return JsonResponse({'is_authenticated': False}, status=401)

# ========== EXPORT ==========

__all__ = [
    'GareViewSet', 'TrainViewSet', 'TrajetViewSet', 'BilletViewSet', 'EscaleViewSet',
    'login_view', 'logout_view', 'current_user_view', 'get_gares', 'search_trajets',
    'chatbot_reply', 'generate_billet_pdf', 'export_billets_pdf', 'get_qr_code',
    'generate_qr_code', 'test_qr_generation', 'test_pdf', 'CompatLoginView',
    'get_current_user_legacy', 'register_view'
]