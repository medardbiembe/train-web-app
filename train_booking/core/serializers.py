from rest_framework import serializers
from .models import Gare, Train, Trajet, Billet, Escale
from django.contrib.auth.models import User
import logging

class GareSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gare
        fields = ['id', 'nom', 'ville', 'code']

class TrainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Train
        fields = ['id', 'numero', 'type', 'capacite']

class EscaleSerializer(serializers.ModelSerializer):
    gare = GareSerializer(read_only=True)
    gare_id = serializers.PrimaryKeyRelatedField(
        queryset=Gare.objects.all(),
        source='gare',
        write_only=True,
        required=False
    )
    
    heure_arrivee_formatee = serializers.SerializerMethodField()
    heure_depart_formatee = serializers.SerializerMethodField()
    
    class Meta:
        model = Escale
        fields = [
            'id', 'gare', 'gare_id', 'heure_arrivee', 'heure_depart',
            'duree_arret', 'ordre', 'heure_arrivee_formatee', 'heure_depart_formatee'
        ]
    
    def get_heure_arrivee_formatee(self, obj):
        if obj.heure_arrivee:
            return obj.heure_arrivee.isoformat()
        return None
    
    def get_heure_depart_formatee(self, obj):
        if obj.heure_depart:
            return obj.heure_depart.isoformat()
        return None

class TrajetSerializer(serializers.ModelSerializer):
    train = TrainSerializer(read_only=True)
    gare_depart = GareSerializer(read_only=True)
    gare_arrivee = GareSerializer(read_only=True)
    escales = EscaleSerializer(many=True, read_only=True)
    
    # Pour la création/modification
    train_id = serializers.PrimaryKeyRelatedField(
        queryset=Train.objects.all(),
        source='train',
        write_only=True
    )
    gare_depart_id = serializers.PrimaryKeyRelatedField(
        queryset=Gare.objects.all(),
        source='gare_depart',
        write_only=True
    )
    gare_arrivee_id = serializers.PrimaryKeyRelatedField(
        queryset=Gare.objects.all(),
        source='gare_arrivee',
        write_only=True
    )
    
    # Champs calculés
    heure_depart_formatee = serializers.SerializerMethodField()
    heure_arrivee_formatee = serializers.SerializerMethodField()
    duree_formatee = serializers.SerializerMethodField()
    places_restantes = serializers.SerializerMethodField()
    has_escales = serializers.SerializerMethodField()
    
    class Meta:
        model = Trajet
        fields = [
            'id',
            'train', 'train_id',
            'gare_depart', 'gare_depart_id',
            'gare_arrivee', 'gare_arrivee_id',
            'heure_depart', 'heure_arrivee',
            'prix',
            'escales',
            'heure_depart_formatee',
            'heure_arrivee_formatee',
            'duree_formatee',
            'places_restantes',
            'has_escales'
        ]
    
    def get_heure_depart_formatee(self, obj):
        if obj.heure_depart:
            return obj.heure_depart.isoformat()
        return None
    
    def get_heure_arrivee_formatee(self, obj):
        if obj.heure_arrivee:
            return obj.heure_arrivee.isoformat()
        return None
    
    def get_duree_formatee(self, obj):
        if obj.heure_depart and obj.heure_arrivee:
            duree = obj.heure_arrivee - obj.heure_depart
            total_seconds = duree.total_seconds()
            hours = int(total_seconds // 3600)
            minutes = int((total_seconds % 3600) // 60)
            return f"{hours}h {minutes:02d}min"
        return None
    
    def get_places_restantes(self, obj):
        from .models import Billet
        billets_reserves = Billet.objects.filter(
            trajet=obj, 
            statut__in=['réservé', 'confirmé']
        ).count()
        return obj.train.capacite - billets_reserves
    
    def get_has_escales(self, obj):
        return obj.escales.exists()

class BilletSerializer(serializers.ModelSerializer):
    # Pour l'affichage (GET)
    trajet_details = TrajetSerializer(source='trajet', read_only=True)
    
    # Pour l'écriture (POST) - on reçoit directement l'ID du trajet
    trajet = serializers.PrimaryKeyRelatedField(
        queryset=Trajet.objects.all(),
        write_only=True
    )
    
    gare_embarquement_details = GareSerializer(source='gare_embarquement', read_only=True)
    gare_embarquement = serializers.PrimaryKeyRelatedField(
        queryset=Gare.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    
    gare_descente_details = GareSerializer(source='gare_descente', read_only=True)
    gare_descente = serializers.PrimaryKeyRelatedField(
        queryset=Gare.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    
    # Champs formatés
    date_reservation_formatee = serializers.SerializerMethodField()
    
    class Meta:
        model = Billet
        fields = [
            'id', 
            'utilisateur', 
            'trajet',              # ← Pour l'écriture (ID)
            'trajet_details',       # ← Pour la lecture (détails)
            'date_voyage',
            'gare_embarquement', 'gare_embarquement_details',
            'gare_descente', 'gare_descente_details',
            'nombre_passagers',  
            'date_reservation', 
            'date_reservation_formatee',
            'statut', 
            'prix_total', 
            'qr_code'
            
        ]
        read_only_fields = [
            'id', 
            'utilisateur', 
            'date_reservation', 
            'qr_code',
            'date_reservation_formatee',
            'prix_total',
            'trajet_details',
            'gare_embarquement_details',
            'gare_descente_details'
        ]
    
    def get_date_reservation_formatee(self, obj):
        if obj.date_reservation:
            return obj.date_reservation.isoformat()
        return None
    
    def validate_nombre_passagers(self, value):
        """Validation du nombre de passagers"""
        if value < 1:
            raise serializers.ValidationError("Le nombre de passagers doit être au moins 1")
        if value > 10:
            raise serializers.ValidationError("Le nombre maximum de passagers est 10")
        return value
    
    def create(self, validated_data):
        print("="*50)
        print("🔍 CRÉATION BILLET DANS SERIALIZER")
        print(f"📦 validated_data reçu: {validated_data}")
        print("="*50)
        
        request = self.context.get('request')
        
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Vous devez être connecté pour créer un billet.")
        
        validated_data['utilisateur'] = request.user
        
        # Calculer le prix_total basé sur le nombre de passagers
        trajet = validated_data.get('trajet')
        nombre_passagers = validated_data.get('nombre_passagers', 1)
        
        if trajet:
            validated_data['prix_total'] = trajet.prix * nombre_passagers
        
        # Définir un statut par défaut si non fourni
        if 'statut' not in validated_data:
            validated_data['statut'] = 'réservé'
        
        # Vérifier si date_voyage est présent
        if 'date_voyage' in validated_data:
            print(f"✅ date_voyage trouvée: {validated_data['date_voyage']}")
        else:
            print("❌ date_voyage ABSENTE de validated_data")
        
        billet = Billet.objects.create(**validated_data)
        print(f"✅ Billet créé avec id: {billet.id}, date_voyage: {billet.date_voyage}")
        return billet
    
    def update(self, instance, validated_data):
        """Gérer la mise à jour, notamment recalculer le prix si nombre_passagers change"""
        if 'nombre_passagers' in validated_data:
            nombre_passagers = validated_data.get('nombre_passagers')
            instance.prix_total = instance.trajet.prix * nombre_passagers
        
        return super().update(instance, validated_data)
    
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True}
        }

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return data

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà.")
        return value

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user