import argparse
import os
import pickle
from typing import List, Dict

import pandas as pd

from preprocess import clean_text

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")


REPLY_TEMPLATES = {
    "praise": "Thank you so much for your positive feedback. We are glad you enjoyed it!",
    "support": "We really appreciate your support. Your encouragement motivates us to keep creating.",
    "constructive_criticism": "Thank you for your honest feedback. We will use this to improve future content.",
    "hate_abuse": "We are sorry you feel this way. We value respectful feedback and will keep working to improve.",
    "threat": "We take your concern seriously. Please share more details so we can address this responsibly.",
    "emotional": "Thank you for sharing your feelings. It means a lot that our content resonated with you.",
    "spam_irrelevant": "Thanks for your comment. We encourage everyone to keep the conversation relevant to the topic.",
    "question_suggestion": "Thank you for your suggestion. We will definitely consider creating content on this topic.",
}


def load_model_and_vectorizer():
    vec_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl")
    model_path = os.path.join(MODELS_DIR, "classifier.pkl")

    with open(vec_path, "rb") as f:
        vectorizer = pickle.load(f)

    with open(model_path, "rb") as f:
        clf = pickle.load(f)

    return vectorizer, clf


def generate_reply(label: str) -> str:
    return REPLY_TEMPLATES.get(label, "")


def classify_comments_list(comments: List[str]) -> List[Dict[str, str]]:
    vectorizer, clf = load_model_and_vectorizer()
    cleaned = [clean_text(c) for c in comments]
    X_vec = vectorizer.transform(cleaned)
    preds = clf.predict(X_vec)

    results = []
    for original, cleaned_text, label in zip(comments, cleaned, preds):
        results.append(
            {
                "original_comment": original,
                "cleaned_comment": cleaned_text,
                "predicted_label": label,
            }
        )
    return results


def classify_and_reply(comments: List[str]) -> List[Dict[str, str]]:
    vectorizer, clf = load_model_and_vectorizer()
    cleaned = [clean_text(c) for c in comments]
    X_vec = vectorizer.transform(cleaned)
    preds = clf.predict(X_vec)

    results = []
    for original, cleaned_text, label in zip(comments, cleaned, preds):
        results.append(
            {
                "original_comment": original,
                "cleaned_comment": cleaned_text,
                "predicted_label": label,
                "suggested_reply": generate_reply(label),
            }
        )
    return results


def run_on_csv(input_path: str, output_path: str, include_replies: bool = True) -> None:
    df = pd.read_csv(input_path)
    if "comment" not in df.columns:
        raise ValueError("Input CSV must contain a 'comment' column")

    comments = df["comment"].astype(str).tolist()

    if include_replies:
        results = classify_and_reply(comments)
    else:
        results = classify_comments_list(comments)

    out_df = pd.DataFrame(results)
    out_df.to_csv(output_path, index=False)
    print(f"Saved predictions to {output_path}")


def parse_args():
    parser = argparse.ArgumentParser(description="Classify comments in a CSV file.")
    parser.add_argument(
        "--input",
        type=str,
        default=os.path.join(BASE_DIR, "data", "new_comments_example.csv"),
        help="Path to input CSV with a 'comment' column.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(BASE_DIR, "data", "new_comments_with_labels.csv"),
        help="Path to output CSV with predictions.",
    )
    parser.add_argument(
        "--no-replies",
        action="store_true",
        help="If set, suggested replies will not be included.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_on_csv(args.input, args.output, include_replies=not args.no_replies)
