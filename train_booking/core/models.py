from django.db import models
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from io import BytesIO
import qrcode
import hashlib
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from PIL import Image
import os
import json

# 🚉 Gare
class Gare(models.Model):
    nom = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    ville = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.nom} ({self.code})"


# 🚆 Train
class Train(models.Model):
    numero = models.CharField(max_length=10, unique=True, default="TGV000")
    type = models.CharField(max_length=50, default="TGV")
    capacite = models.PositiveIntegerField(default=300)

    def __str__(self):
        return f"{self.type} {self.numero}"

    def places_disponibles(self, trajet):
        billets_reservés = Billet.objects.filter(trajet=trajet, statut='réservé').count()
        return self.capacite - billets_reservés


# 🛤️ Trajet
class Trajet(models.Model):
    gare_depart = models.ForeignKey(Gare, related_name='departures', on_delete=models.CASCADE)
    gare_arrivee = models.ForeignKey(Gare, related_name='arrivals', on_delete=models.CASCADE)
    train = models.ForeignKey(Train, on_delete=models.CASCADE)
    heure_depart = models.DateTimeField()
    heure_arrivee = models.DateTimeField()
    prix = models.DecimalField(max_digits=6, decimal_places=2)

    def __str__(self):
        return f"{self.gare_depart} → {self.gare_arrivee} ({self.heure_depart.strftime('%H:%M')})"

    def duree(self):
        delta = self.heure_arrivee - self.heure_depart
        heures = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        return f"{heures}h{minutes:02d}"

    def places_restantes(self):
        return self.train.places_disponibles(self)


# 🎫 Billet (MODIFIÉ AVEC DATE_VOYAGE)
class Billet(models.Model):
    STATUT_CHOICES = [
        ('réservé', 'Réservé'),
        ('annulé', 'Annulé'),
        ('en_attente', 'En attente'),
    ]
    
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE)
    trajet = models.ForeignKey(Trajet, on_delete=models.CASCADE)
    nombre_passagers = models.PositiveIntegerField(default=1)
    date_reservation = models.DateTimeField(auto_now_add=True)
    date_voyage = models.DateField(null=True, blank=True)  # ← NOUVEAU CHAMP : date choisie par l'utilisateur
    statut = models.CharField(
        max_length=20, 
        choices=STATUT_CHOICES, 
        default='réservé'
    )
    prix_total = models.DecimalField(
        max_digits=10,
        decimal_places=2, 
        default=0.00
    )
    qr_code = models.ImageField(
        upload_to='qr_codes/', 
        blank=True, 
        null=True
    )
    
    # Champs pour les gares d'embarquement et descente
    gare_embarquement = models.ForeignKey(
        Gare, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='billets_embarquement'
    )
    gare_descente = models.ForeignKey(
        Gare, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='billets_descente'
    )

    def __str__(self):
        date_str = f" - {self.date_voyage.strftime('%d/%m/%Y')}" if self.date_voyage else ""
        return f"Billet #{self.id} - {self.utilisateur.username} ({self.nombre_passagers} passagers){date_str}"

    def calculer_prix(self, classe='standard', reduction=False):
        """Calcule le prix total basé sur le nombre de passagers"""
        base = self.trajet.prix * self.nombre_passagers
        if classe == 'premium':
            base *= 1.5
        if reduction:
            base *= 0.8
        return round(base, 2)

    def generer_signature(self):
        data = f"{self.id}{self.utilisateur.username}{self.trajet.id}{self.date_reservation.isoformat()}{self.nombre_passagers}"
        if self.date_voyage:
            data += self.date_voyage.isoformat()
        return hashlib.sha256(data.encode()).hexdigest()

    def generer_qr_code(self):
        qr_data = {
            "billet_id": self.id,
            "passager": self.utilisateur.username,
            "trajet_id": self.trajet.id,
            "nombre_passagers": self.nombre_passagers,
            "date_voyage": self.date_voyage.isoformat() if self.date_voyage else None,
            "date_reservation": self.date_reservation.isoformat(),
            "signature": self.generer_signature()
        }
        qr = qrcode.make(json.dumps(qr_data))
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        filename = f"billet_{self.id}_qr.png"
        self.qr_code.save(filename, ContentFile(buffer.getvalue()), save=False)

    def est_valide(self):
        return self.statut == 'réservé' and self.trajet.heure_depart > timezone.now()

    def generer_pdf(self):
        filename = f"billet_{self.id}.pdf"
        filepath = os.path.join("billets_pdf", filename)
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)

        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 800, f"Billet #{self.id}")
        c.setFont("Helvetica", 12)
        c.drawString(100, 780, f"Passager : {self.utilisateur.username}")
        c.drawString(100, 760, f"Nombre de passagers : {self.nombre_passagers}")
        
        # Afficher la date du voyage si elle existe
        if self.date_voyage:
            c.drawString(100, 740, f"Date du voyage : {self.date_voyage.strftime('%d/%m/%Y')}")
        
        c.drawString(100, 720, f"Trajet : {self.trajet.gare_depart.nom} → {self.trajet.gare_arrivee.nom}")
        c.drawString(100, 700, f"Départ : {self.trajet.heure_depart.strftime('%H:%M')}")
        c.drawString(100, 680, f"Arrivée : {self.trajet.heure_arrivee.strftime('%H:%M')}")
        
        # Ajouter les gares d'embarquement/descente si spécifiées
        y_position = 660
        if self.gare_embarquement:
            c.drawString(100, y_position, f"Embarquement : {self.gare_embarquement.nom}")
            y_position -= 20
        if self.gare_descente:
            c.drawString(100, y_position, f"Descente : {self.gare_descente.nom}")
            y_position -= 20
        
        c.drawString(100, y_position, f"Prix : {self.prix_total} €")
        y_position -= 20
        c.drawString(100, y_position, f"Statut : {self.statut}")

        if self.qr_code and default_storage.exists(self.qr_code.name):
            qr_path = default_storage.path(self.qr_code.name)
            qr_img = Image.open(qr_path).resize((150, 150))
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            c.drawInlineImage(qr_buffer, 400, 700)

        c.showPage()
        c.save()

        pdf_file = ContentFile(buffer.getvalue())
        default_storage.save(filepath, pdf_file)
        return filepath

    def save(self, *args, **kwargs):
        # Calcul automatique du prix si non défini
        if (self.prix_total == 0 or self.prix_total is None) and self.trajet:
            self.prix_total = self.trajet.prix * self.nombre_passagers
        
        is_new = self.pk is None  # Vérifier si c'est une nouvelle création
        
        super().save(*args, **kwargs)
        
        # Générer QR code seulement pour les nouvelles créations
        if is_new and not self.qr_code:
            self.generer_qr_code()
            super().save(*args, **kwargs)


# 👤 Profil utilisateur
class ProfilUtilisateur(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    telephone = models.CharField(max_length=20, blank=True)
    preferences = models.TextField(blank=True)

    def __str__(self):
        return f"Profil de {self.user.username}"


# Ajouter un modèle Escale
class Escale(models.Model):
    trajet = models.ForeignKey(
        'Trajet',
        on_delete=models.CASCADE,
        related_name='escales'
    )
    gare = models.ForeignKey(
        'Gare',
        on_delete=models.CASCADE
    )
    heure_arrivee = models.DateTimeField()
    heure_depart = models.DateTimeField()
    duree_arret = models.IntegerField(help_text="Durée en minutes")
    ordre = models.IntegerField(default=1, help_text="Ordre de l'escale (1 pour la première)")
    
    class Meta:
        ordering = ['trajet', 'ordre']
        unique_together = ['trajet', 'ordre']
    
    def __str__(self):
        return f"Escale {self.ordre}: {self.gare.nom} ({self.heure_arrivee})"