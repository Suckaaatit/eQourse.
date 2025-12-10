import os
import pickle
from collections import Counter

import pandas as pd
import streamlit as st

from preprocess import clean_text
from predict import REPLY_TEMPLATES

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")


@st.cache_resource
def load_model_and_vectorizer():
    vec_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl")
    model_path = os.path.join(MODELS_DIR, "classifier.pkl")

    with open(vec_path, "rb") as f:
        vectorizer = pickle.load(f)

    with open(model_path, "rb") as f:
        clf = pickle.load(f)

    return vectorizer, clf


def main():
    st.title("Comment Categorization & Reply Assistant Tool")

    vectorizer, clf = load_model_and_vectorizer()

    mode = st.radio("Choose input mode", ["Single comment", "Upload CSV"])

    if mode == "Single comment":
        comment = st.text_area("Enter a comment")
        if st.button("Classify"):
            cleaned = clean_text(comment)
            X_vec = vectorizer.transform([cleaned])
            label = clf.predict(X_vec)[0]
            st.write(f"**Predicted category:** {label}")
            st.write(f"**Suggested reply:** {REPLY_TEMPLATES.get(label, '')}")
    else:
        file = st.file_uploader("Upload a CSV file with a 'comment' column", type="csv")
        if file is not None:
            df = pd.read_csv(file)
            if "comment" not in df.columns:
                st.error("The uploaded file must contain a 'comment' column.")
                return

            if st.button("Classify all comments"):
                cleaned = df["comment"].astype(str).apply(clean_text).tolist()
                X_vec = vectorizer.transform(cleaned)
                preds = clf.predict(X_vec)
                df["predicted_label"] = preds
                df["suggested_reply"] = [REPLY_TEMPLATES.get(lbl, "") for lbl in preds]

                st.subheader("Sample of classified comments")
                st.dataframe(df.head())

                # Show distribution chart
                counts = Counter(preds)
                counts_series = pd.Series(counts)
                st.subheader("Category distribution")
                st.bar_chart(counts_series)

                # Allow download
                st.download_button(
                    "Download results as CSV",
                    data=df.to_csv(index=False).encode("utf-8"),
                    file_name="classified_comments.csv",
                    mime="text/csv",
                )


if __name__ == "__main__":
    main()
