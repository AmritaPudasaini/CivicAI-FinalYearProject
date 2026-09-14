import streamlit as st
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ---------------------------------------------------
# Load model and tokenizer once, cached across reruns
# ---------------------------------------------------
@st.cache_resource
def load_model():
    model_path = "../muril_complaint_classifier_final"  # model folder is one level up
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    model.eval()
    return tokenizer, model

tokenizer, model = load_model()

# ---------------------------------------------------
# App UI
# ---------------------------------------------------
st.title("CIVICAI Complaint Classifier")
st.write("Enter a civic complaint below (Nepali, English, or romanized Nepali).")

complaint_text = st.text_area("Complaint description", height=120)

if st.button("Classify Complaint"):
    if complaint_text.strip() == "":
        st.warning("Please enter a complaint description first.")
    else:
        # Tokenize the input the same way as during training
        inputs = tokenizer(
            complaint_text,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=128,
        )

        # Run inference
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            pred_id = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][pred_id].item()

        predicted_category = model.config.id2label[pred_id]

        st.success(f"Predicted Category: **{predicted_category}**")
        st.write(f"Confidence: {confidence:.2%}")

        # Optional: show full probability breakdown across all categories
        with st.expander("See confidence for all categories"):
            for idx, prob in enumerate(probs[0]):
                st.write(f"{model.config.id2label[idx]}: {prob.item():.2%}")