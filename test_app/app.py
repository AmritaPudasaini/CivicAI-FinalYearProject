import os
import streamlit as st
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ---------------------------------------------------
# Path built from this file's location, so it works
# no matter which folder you run `streamlit run` from
# ---------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
TEXT_MODEL_PATH = os.path.join(PROJECT_ROOT, "muril_complaint_classifier_final")

# Clear message instead of a confusing Hugging Face error
if not os.path.isdir(TEXT_MODEL_PATH):
    st.error(f"Text model folder not found:\n{TEXT_MODEL_PATH}")
    st.stop()

# ---------------------------------------------------
# Load model and tokenizer once, cached across reruns
# ---------------------------------------------------
@st.cache_resource
def load_model():
    tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(TEXT_MODEL_PATH)
    model.eval()
    return tokenizer, model

tokenizer, model = load_model()

# ---------------------------------------------------
# App UI
# ---------------------------------------------------
st.title("CIVICAI Text Classifier")
st.write("Enter a civic complaint below (Nepali, English, or romanized Nepali).")

complaint_text = st.text_area("Complaint description", height=120)

if st.button("Classify Complaint"):
    if complaint_text.strip() == "":
        st.warning("Please enter a complaint description first.")
    else:
        inputs = tokenizer(
            complaint_text,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=128,
        )

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            pred_id = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][pred_id].item()

        st.success(f"Predicted Category: **{model.config.id2label[pred_id]}**")
        st.write(f"Confidence: {confidence:.2%}")

        st.subheader("Confidence for all categories")
        for idx, prob in sorted(enumerate(probs[0]), key=lambda x: -x[1]):
            st.write(f"{model.config.id2label[idx]}: {prob.item():.2%}")
            st.progress(float(prob.item()))