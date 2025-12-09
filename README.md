# Comment Categorization & Reply Assistant Tool

**Submitted by:** N Akash
**Tech Stack:** React, TypeScript, Google Gemini API, Tailwind CSS

## Project Overview
This tool automates the process of moderating user feedback. It utilizes Natural Language Processing (via Gemini AI) to analyze comments, classify them into 8 distinct categories, and generate appropriate responses or internal action flags.

## Problem Statement
Brands receive thousands of comments. Manually sorting "Constructive Criticism" from "Hate", or identifying "Threats" vs "Support", is time-consuming. This tool solves this by acting as an intelligent triage layer.

## Key Features
1.  **Nuanced Classification:**
    *   Distinguishes between **Constructive Criticism** (valid feedback) and **Hate/Abuse** (toxic).
    *   Identifies **Threats** for safety escalation.
2.  **Smart Actions:**
    *   Generates polite replies for positive/constructive engagement.
    *   Generates `[INTERNAL FLAG]` alerts for toxic content (instead of replying).
3.  **Batch Processing:**
    *   Upload CSV files to process 100+ comments instantly.
    *   Real-time distribution charts.
4.  **Filtering & Export:**
    *   Filter results by category (e.g., "Show only Questions").
    *   Export processed data to CSV.

## How to Run
1.  Open the application in a browser.
2.  **Single Mode:** Type a comment to see instant classification and reply suggestion.
3.  **Batch Mode:** Upload `demo_comments.csv` (included) to see the bulk processor in action.

## Category Definitions
*   **Praise:** Positive appreciation.
*   **Support:** Encouragement.
*   **Constructive Criticism:** Negative feedback with specific reasoning.
*   **Hate/Abuse:** Insults without value.
*   **Threat:** Harmful intent.
*   **Emotional:** Personal stories.
*   **Spam:** Ads/Self-promo.
*   **Question:** Inquiries.