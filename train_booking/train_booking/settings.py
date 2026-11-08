"""
Django settings for train_booking project.
"""

from pathlib import Path
import os
import sys

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-@8(kx7(3e&0(pbacke2bif&c@hpa^#i4dln3_=4yt*dhzuo^w8'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'core.apps.CoreConfig',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    #'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
]

ROOT_URLCONF = 'train_booking.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'train_booking.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files (for QR codes)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# CORS settings
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Session settings
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 1209600  # 2 weeks

CSRF_TRUSTED_ORIGINS = [
    "https://localhost:3000",
    "http://localhost:3000",
]

# ========== CONFIGURATION GPT4ALL ==========

# Configuration du modèle GPT4All - TinyLlama (rapide et léger)
GPT4ALL_MODEL = "TinyLlama-1.1B-Chat-v0.4-Q4_K_M.gguf"  # ~636 MB
GPT4ALL_MODEL_PATH = os.path.join(BASE_DIR, 'models/')

# Optimisation CPU pour GPT4All
os.environ["OMP_NUM_THREADS"] = "4"  # Augmenté à 4 threads pour plus de rapidité
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["GGML_OPENMP"] = "1"  # Utiliser OpenMP
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"  # Forcer CPU seulement

# Paramètres du modèle - Optimisés pour la rapidité
GPT4ALL_MAX_TOKENS = 100  # Réduit pour des réponses plus rapides
GPT4ALL_TEMPERATURE = 0.7
GPT4ALL_TOP_K = 40
GPT4ALL_TOP_P = 0.9
GPT4ALL_REPEAT_PENALTY = 1.1

# ========== CONFIGURATION LOGGING SANS ÉMOJIS ==========

# Configurer l'encodage de la console pour Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'no_emoji': {
            'format': '%(levelname)s %(asctime)s %(module)s - %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'no_emoji',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/debug.log'),
            'formatter': 'no_emoji',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# ========== CRÉATION DES DOSSIERS NÉCESSAIRES ==========

# Créer les dossiers nécessaires s'ils n'existent pas
os.makedirs(GPT4ALL_MODEL_PATH, exist_ok=True)
os.makedirs(MEDIA_ROOT, exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)

# ========== VÉRIFICATIONS AU DÉMARRAGE ==========

print("\n" + "="*60)
print("🔍 VOYAGEURX - VÉRIFICATION DE LA CONFIGURATION")
print("="*60)

# Vérifier le dossier models
print(f"\n📁 Dossier models: {GPT4ALL_MODEL_PATH}")
print(f"📁 Existe: {os.path.exists(GPT4ALL_MODEL_PATH)}")

if os.path.exists(GPT4ALL_MODEL_PATH):
    # Lister les fichiers .gguf
    gguf_files = [f for f in os.listdir(GPT4ALL_MODEL_PATH) if f.endswith('.gguf')]
    print(f"📊 Modèles trouvés ({len(gguf_files)}):")
    for f in gguf_files:
        file_path = os.path.join(GPT4ALL_MODEL_PATH, f)
        size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"   - {f} ({size_mb:.1f} MB)")
        
        # Vérifier si c'est le modèle configuré
        if f == GPT4ALL_MODEL:
            print(f"     ✅ Modèle actif: {f}")
else:
    print(f"⚠️ Le dossier models n'existe pas encore")

print("\n" + "="*60)
print("✅ VÉRIFICATION TERMINÉE")
print("="*60 + "\n")