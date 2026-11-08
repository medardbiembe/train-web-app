from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    # ViewSets
    GareViewSet,
    TrainViewSet,
    TrajetViewSet,
    BilletViewSet,
    EscaleViewSet,
    
    # API Views
    login_view,
    logout_view, 
    current_user_view,
    get_gares,
    search_trajets,
    chatbot_reply,
    generate_billet_pdf,
    export_billets_pdf,
    
    # QR Code et test
    get_qr_code,
    generate_qr_code,
    test_qr_generation,
    test_pdf,
    
    # Compatibilité
    CompatLoginView,
    get_current_user_legacy,
    
    # Register
    register_view,  # ← Déplacé ici pour éviter l'import séparé
)

router = DefaultRouter()
router.register(r'gares', GareViewSet)
router.register(r'trains', TrainViewSet)
router.register(r'trajets', TrajetViewSet)
router.register(r'billets', BilletViewSet)
router.register(r'escales', EscaleViewSet)

urlpatterns = [
    # ========== AUTHENTIFICATION ==========
    path('api/auth/register/', register_view, name='api_register'),
    path('api/auth/login/', login_view, name='api_login'),
    path('api/auth/logout/', logout_view, name='api_logout'), 
    path('api/auth/me/', current_user_view, name='current_user'),
    
    # JWT Tokens
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ========== RECHERCHE ET DONNÉES ==========
    path('api/search/trajets/', search_trajets, name='search_trajets'),
    path('api/gares-list/', get_gares, name='get_gares'),
    
    # ========== CHATBOT ==========
    path('api/chatbot/', chatbot_reply, name='chatbot'),
    
    # ========== PDF ==========
    path('api/billets/<int:billet_id>/pdf/', generate_billet_pdf, name='generate_billet_pdf'),
    path('api/billets/export-pdf/', export_billets_pdf, name='export_billets_pdf'),
    
    # ========== QR CODE ==========
    path('api/billets/<int:billet_id>/qr-code/', get_qr_code, name='get_qr_code'),
    path('api/billets/<int:billet_id>/generate-qr/', generate_qr_code, name='generate_qr_code'),
    path('api/test-qr-generation/', test_qr_generation, name='test_qr_generation'),
    
    # ========== TEST ==========
    path('api/test-pdf/', test_pdf, name='test_pdf'),
    
    # ========== COMPATIBILITÉ LEGACY ==========
    path('api/login/', CompatLoginView.as_view(), name='compat_login'),
    path('api/users/me/', get_current_user_legacy, name='compat_current_user'),
    
    # ========== ROUTES DU ROUTER ==========
    path('api/', include(router.urls)),
]