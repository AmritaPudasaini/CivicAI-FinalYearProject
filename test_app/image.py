import os
import streamlit as st
import torch
import torch.nn as nn
from torchvision import transforms
from torchvision.models import efficientnet_b0
from PIL import Image

# ---------------------------------------------------
# Path built from this file's location, so it works
# no matter which folder you run `streamlit run` from
# ---------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
IMAGE_MODEL_PATH = os.path.join(PROJECT_ROOT, "efficientnet_b0_civic_final.pth")

if not os.path.isfile(IMAGE_MODEL_PATH):
    st.error(f"Image model file not found:\n{IMAGE_MODEL_PATH}")
    st.stop()

# ---------------------------------------------------
# Load image model (EfficientNet-B0) once, cached across reruns
# ---------------------------------------------------
@st.cache_resource
def load_image_model():
    checkpoint = torch.load(IMAGE_MODEL_PATH, map_location="cpu")
    class_names = checkpoint["class_names"]
    img_size = checkpoint["img_size"]

    model = efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    return model, class_names, img_size

image_model, class_names, IMG_SIZE = load_image_model()

# Same preprocessing used during training (evaluation transform)
image_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ---------------------------------------------------
# App UI
# ---------------------------------------------------
st.title("CIVICAI Image Classifier")
st.write("Upload a photo of a civic issue and the model will classify it.")

uploaded_image = st.file_uploader(
    "Upload an image", type=["jpg", "jpeg", "png", "webp"]
)

if uploaded_image is not None:
    img = Image.open(uploaded_image).convert("RGB")
    st.image(img, caption="Uploaded image")

    if st.button("Classify Image"):
        img_tensor = image_transform(img).unsqueeze(0)

        with torch.no_grad():
            outputs = image_model(img_tensor)
            probs = torch.softmax(outputs, dim=-1)
            pred_id = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][pred_id].item()

        st.success(f"Predicted Category: **{class_names[pred_id]}**")
        st.write(f"Confidence: {confidence:.2%}")

        st.subheader("Confidence for all categories")
        for idx, prob in sorted(enumerate(probs[0]), key=lambda x: -x[1]):
            st.write(f"{class_names[idx]}: {prob.item():.2%}")
            st.progress(float(prob.item()))