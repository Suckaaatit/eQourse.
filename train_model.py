import os
import pickle

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

from preprocess import prepare_text_series


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "comments_labeled.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def main():
    # Load dataset
    df = pd.read_csv(DATA_PATH)

    # Clean text
    df["clean_comment"] = prepare_text_series(df["comment"])

    # Split into train and test
    X_train, X_test, y_train, y_test = train_test_split(
        df["clean_comment"],
        df["label"],
        test_size=0.2,
        random_state=42,
        stratify=df["label"],
    )

    # Vectorize with TF-IDF
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Train classifier
    clf = LogisticRegression(max_iter=1000)
    clf.fit(X_train_vec, y_train)

    # Evaluate
    y_pred = clf.predict(X_test_vec)
    print("Classification report:")
    print(classification_report(y_test, y_pred))

    # Optional: visualize label distribution
    label_counts = df["label"].value_counts()
    plt.figure()
    label_counts.plot(kind="bar")
    plt.title("Label distribution in dataset")
    plt.xlabel("Label")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.savefig(os.path.join(BASE_DIR, "label_distribution.png"))
    plt.close()

    # Save vectorizer and model
    vec_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl")
    model_path = os.path.join(MODELS_DIR, "classifier.pkl")

    with open(vec_path, "wb") as f:
        pickle.dump(vectorizer, f)

    with open(model_path, "wb") as f:
        pickle.dump(clf, f)

    print(f"Saved vectorizer to {vec_path}")
    print(f"Saved classifier to {model_path}")


if __name__ == "__main__":
    main()
