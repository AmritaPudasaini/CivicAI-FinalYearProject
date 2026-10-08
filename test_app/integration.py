import os
import streamlit as st
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from torchvision import transforms
from torchvision.models import efficientnet_b0
from PIL import Image

# ---------------------------------------------------
# Paths are built from this file's location, so they work
# no matter which folder you run `streamlit run` from
# ---------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

TEXT_MODEL_PATH = os.path.join(PROJECT_ROOT, "muril_complaint_classifier_final")
IMAGE_MODEL_PATH = os.path.join(PROJECT_ROOT, "efficientnet_b0_civic_final.pth")

# Stop early with a clear message instead of a confusing Hugging Face error
if not os.path.isdir(TEXT_MODEL_PATH):
    st.error(f"Text model folder not found:\n{TEXT_MODEL_PATH}")
    st.stop()
if not os.path.isfile(IMAGE_MODEL_PATH):
    st.error(f"Image model file not found:\n{IMAGE_MODEL_PATH}")
    st.stop()

# ---------------------------------------------------
# Load text model (MuRIL) once, cached across reruns
# ---------------------------------------------------
@st.cache_resource
def load_text_model():
    tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(TEXT_MODEL_PATH)
    model.eval()
    return tokenizer, model

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

text_tokenizer, text_model = load_text_model()
image_model, image_class_names, IMG_SIZE = load_image_model()

# Same preprocessing used during training (evaluation transform)
mean = [0.485, 0.456, 0.406]
std = [0.229, 0.224, 0.225]
image_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean, std),
])

# ---------------------------------------------------
# App UI
# ---------------------------------------------------
st.title("CIVICAI Complaint Classifier")
st.write("Describe your complaint and/or upload a photo. Both will be classified.")

complaint_text = st.text_area(
    "Complaint description (Nepali, English, or romanized Nepali)", height=120
)
uploaded_image = st.file_uploader(
    "Upload a photo of the issue (optional)", type=["jpg", "jpeg", "png", "webp"]
)

if uploaded_image is not None:
    st.image(uploaded_image, caption="Uploaded image")

if st.button("Classify Complaint"):
    if complaint_text.strip() == "" and uploaded_image is None:
        st.warning("Please enter a description or upload an image.")
    else:
        col1, col2 = st.columns(2)

        # ---------------- Text classification ----------------
        with col1:
            st.subheader("Text Classification")
            if complaint_text.strip() != "":
                inputs = text_tokenizer(
                    complaint_text,
                    return_tensors="pt",
                    padding="max_length",
                    truncation=True,
                    max_length=128,
                )
                with torch.no_grad():
                    outputs = text_model(**inputs)
                    probs = torch.softmax(outputs.logits, dim=-1)
                    pred_id = torch.argmax(probs, dim=-1).item()
                    confidence = probs[0][pred_id].item()

                predicted_text_category = text_model.config.id2label[pred_id]

                st.success(f"Category: **{predicted_text_category}**")
                st.write(f"Confidence: {confidence:.2%}")
                with st.expander("See confidence for all categories"):
                    for idx, prob in enumerate(probs[0]):
                        st.write(f"{text_model.config.id2label[idx]}: {prob.item():.2%}")
            else:
                st.info("No description entered.")

        # ---------------- Image classification ----------------
        with col2:
            st.subheader("Image Classification")
            if uploaded_image is not None:
                img = Image.open(uploaded_image).convert("RGB")
                img_tensor = image_transform(img).unsqueeze(0)

                with torch.no_grad():
                    outputs = image_model(img_tensor)
                    probs = torch.softmax(outputs, dim=-1)
                    pred_id = torch.argmax(probs, dim=-1).item()
                    confidence = probs[0][pred_id].item()

                predicted_image_category = image_class_names[pred_id]

                st.success(f"Category: **{predicted_image_category}**")
                st.write(f"Confidence: {confidence:.2%}")
                with st.expander("See confidence for all categories"):
                    for idx, prob in enumerate(probs[0]):
                        st.write(f"{image_class_names[idx]}: {prob.item():.2%}")
            else:
                st.info("No image uploaded.")