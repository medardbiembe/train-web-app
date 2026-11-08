from django.contrib import admin
from django.utils.html import format_html
from .models import Gare, Train, Trajet, Billet, Escale

# 🔄 Admin inline simple pour les escales
class EscaleInline(admin.TabularInline):
    model = Escale
    extra = 0  # 0 formulaires vides par défaut - l'admin devra cliquer pour ajouter
    fields = ('ordre', 'gare', 'heure_arrivee', 'heure_depart', 'duree_arret')
    ordering = ('ordre',)
    
    # Message d'aide
    verbose_name = "Escales (laisser vide pour un trajet direct)"
    verbose_name_plural = "Escales (laisser vide pour un trajet direct)"

# 🛤️ Admin pour les trajets - SIMPLIFIÉ
@admin.register(Trajet)
class TrajetAdmin(admin.ModelAdmin):
    list_display = ('id', 'gare_depart', 'gare_arrivee', 'train', 
                   'heure_depart_display', 'heure_arrivee_display', 
                   'prix', 'type_trajet', 'escales_count')
    list_filter = ('gare_depart', 'gare_arrivee', 'train')
    search_fields = ('gare_depart__nom', 'gare_arrivee__nom', 'train__numero')
    
    # Inline pour les escales
    inlines = [EscaleInline]
    
    # Champs personnalisés simples
    def heure_depart_display(self, obj):
        return obj.heure_depart.strftime("%H:%M")
    heure_depart_display.short_description = "Départ"
    
    def heure_arrivee_display(self, obj):
        return obj.heure_arrivee.strftime("%H:%M")
    heure_arrivee_display.short_description = "Arrivée"
    
    def type_trajet(self, obj):
        if obj.escales.exists():
            return "🔄 Avec escales"
        else:
            return "⚡ Direct"
    type_trajet.short_description = "Type"
    
    def escales_count(self, obj):
        count = obj.escales.count()
        return f"{count} escale(s)" if count > 0 else "Direct"
    escales_count.short_description = "Escales"

# 🛑 Admin séparé pour voir/modifier toutes les escales
@admin.register(Escale)
class EscaleAdmin(admin.ModelAdmin):
    list_display = ('trajet_display', 'ordre', 'gare', 'heure_arrivee', 'heure_depart', 'duree_arret')
    list_filter = ('trajet', 'gare')
    search_fields = ('trajet__gare_depart__nom', 'trajet__gare_arrivee__nom', 'gare__nom')
    
    def trajet_display(self, obj):
        return f"{obj.trajet.gare_depart} → {obj.trajet.gare_arrivee}"
    trajet_display.short_description = "Trajet"

# 🚉 Admin pour les gares (inchangé)
@admin.register(Gare)
class GareAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code', 'ville')
    search_fields = ('nom', 'code', 'ville')

# 🚆 Admin pour les trains (inchangé)
@admin.register(Train)
class TrainAdmin(admin.ModelAdmin):
    list_display = ('numero', 'type', 'capacite')
    search_fields = ('numero', 'type')

# 🎫 Admin pour les billets (inchangé)
@admin.register(Billet)
class BilletAdmin(admin.ModelAdmin):
    list_display = ('id', 'utilisateur', 'trajet', 'statut', 'prix_total', 'date_reservation', 'afficher_qr')
    list_filter = ('statut', 'trajet')
    search_fields = ('utilisateur__username', 'trajet__gare_depart__nom', 'trajet__gare_arrivee__nom')

    def afficher_qr(self, obj):
        if obj.qr_code:
            return format_html('<img src="{}" width="100" />', obj.qr_code.url)
        return "Pas de QR"
    afficher_qr.short_description = "QR Code"