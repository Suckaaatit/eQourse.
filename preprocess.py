import re
from typing import Iterable

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Ensure NLTK data is available
def setup_nltk() -> None:
    """
    Download required NLTK resources if they are not present.
    This should be safe to call multiple times.
    """
    try:
        nltk.data.find("corpora/wordnet")
    except LookupError:
        nltk.download("wordnet")
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt")
    try:
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords")


setup_nltk()

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))


def clean_text(text: str) -> str:
    """
    Basic text cleaning and normalization.
    Steps:
    - Lowercasing
    - Remove URLs
    - Remove non-letter characters
    - Tokenize
    - Remove stopwords
    - Lemmatize
    """
    if not isinstance(text, str):
        return ""

    # Lowercase
    text = text.lower()

    # Remove URLs
    text = re.sub(r"http\S+|www\.\S+", " ", text)

    # Keep only letters and spaces
    text = re.sub(r"[^a-z\s]", " ", text)

    # Tokenize by whitespace
    tokens = text.split()

    # Remove stopwords and lemmatize
    cleaned_tokens = [lemmatizer.lemmatize(tok) for tok in tokens if tok not in stop_words]

    return " ".join(cleaned_tokens)


def prepare_text_series(texts: Iterable[str]):
    """
    Apply clean_text to an iterable (e.g. pandas Series) of strings.
    Returns a list of cleaned strings.
    """
    return [clean_text(t) for t in texts]
