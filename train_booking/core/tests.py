import os
from gpt4all import GPT4All

print("🔍 TEST DIRECT DE GPT4ALL")
print("="*50)

# Chemin CORRECT - remonte d'un niveau depuis core
current_dir = os.path.dirname(os.path.abspath(__file__))  # .../tfc/train_booking/core/
project_root = os.path.dirname(current_dir)  # .../tfc/train_booking/
models_dir = os.path.join(project_root, 'models')  # .../tfc/train_booking/models/

model_name = 'TinyLlama-1.1B-Chat-v0.4-Q4_K_M.gguf'
full_path = os.path.join(models_dir, model_name)

print(f"📁 Dossier models: {models_dir}")
print(f"📄 Modèle: {model_name}")
print(f"📌 Chemin complet: {full_path}")
print(f"✅ Fichier existe: {os.path.exists(full_path)}")

if os.path.exists(full_path):
    print(f"📊 Taille: {os.path.getsize(full_path) / (1024*1024):.1f} MB")

print("\n🚀 Tentative de chargement...")
try:
    model = GPT4All(model_name, model_path=models_dir, allow_download=False)
    print("✅ Modèle chargé avec succès!")
    
    print("\n💬 Test de génération...")
    response = model.generate("Bonjour, comment ça va?", max_tokens=50)
    print(f"Réponse: {response}")
    
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()