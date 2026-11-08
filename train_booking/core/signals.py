# core/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Billet, ProfilUtilisateur
from django.contrib.auth.models import User

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        ProfilUtilisateur.objects.create(user=instance)

@receiver(post_save, sender=Billet)
def generate_qr_on_billet_creation(sender, instance, created, **kwargs):
    if created and not instance.qr_code:
        instance.generer_qr_code()
        instance.save()
