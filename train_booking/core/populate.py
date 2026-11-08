from core.models import Gare, Train, Trajet
from datetime import datetime, timedelta
import random
from django.utils import timezone

def create_trajets():
    gares = list(Gare.objects.all())
    trains = list(Train.objects.all())

    print(f"🎯 Création de trajets avec {len(trains)} trains disponibles")
    
    # S'assurer que chaque train a au moins 1 trajet
    for train in trains:
        gare_depart, gare_arrivee = random.sample(gares, 2)
        
        heure_depart = timezone.now() + timedelta(
            days=random.randint(1, 3), 
            hours=random.randint(6, 18)
        )
        heure_arrivee = heure_depart + timedelta(hours=random.randint(2, 5))
        prix = round(random.uniform(25.0, 120.0), 2)

        Trajet.objects.create(
            gare_depart=gare_depart,
            gare_arrivee=gare_arrivee,
            train=train,
            heure_depart=heure_depart,
            heure_arrivee=heure_arrivee,
            prix=prix
        )
        print(f"  ✅ Trajet créé pour {train.numero}")

    # Ajouter des trajets supplémentaires aléatoires
    trajets_supplementaires = 7
    for i in range(trajets_supplementaires):
        gare_depart, gare_arrivee = random.sample(gares, 2)
        train = random.choice(trains)

        heure_depart = timezone.now() + timedelta(
            days=random.randint(4, 10), 
            hours=random.randint(6, 22)
        )
        heure_arrivee = heure_depart + timedelta(hours=random.randint(1, 6))
        prix = round(random.uniform(25.0, 120.0), 2)

        Trajet.objects.create(
            gare_depart=gare_depart,
            gare_arrivee=gare_arrivee,
            train=train,
            heure_depart=heure_depart,
            heure_arrivee=heure_arrivee,
            prix=prix
        )
        print(f"  ✅ Trajet supplémentaire {i+1} pour {train.numero}")

    print("🎉 Trajets diversifiés créés avec succès!")

def run():
    # Gares
    gares = [
        {"nom": "Paris Gare de Lyon", "code": "PARLY", "ville": "Paris"},
        {"nom": "Lyon Part-Dieu", "code": "LYNPD", "ville": "Lyon"},
        {"nom": "Marseille Saint-Charles", "code": "MARS", "ville": "Marseille"},
        {"nom": "Bordeaux Saint-Jean", "code": "BDX", "ville": "Bordeaux"},
        {"nom": "Lille Flandres", "code": "LIL", "ville": "Lille"},
    ]

    trains = [
        {"numero": "TGV001", "type": "TGV", "capacite": 350},
        {"numero": "TER101", "type": "TER", "capacite": 200},
        {"numero": "INT500", "type": "Intercités", "capacite": 250},
    ]

    for g in gares:
        Gare.objects.get_or_create(**g)

    for t in trains:
        Train.objects.get_or_create(**t)

    create_trajets()