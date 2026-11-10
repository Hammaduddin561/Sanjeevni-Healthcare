#!/usr/bin/env python3
"""Generates docs/MODEL_CARD.md directly from backend/models/metrics.json and fairness.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
METRICS_PATH = ROOT / "backend" / "models" / "metrics.json"
FAIRNESS_PATH = ROOT / "backend" / "models" / "fairness.json"
OUT_PATH = ROOT / "docs" / "MODEL_CARD.md"


def generate_doc():
    with open(METRICS_PATH, "r", encoding="utf-8") as f:
        metrics = json.load(f)
    with open(FAIRNESS_PATH, "r", encoding="utf-8") as f:
        fairness = json.load(f)

    perf = metrics.get("performance", {})
    ds = metrics.get("dataset", {})
    cm = metrics.get("confusion_matrix", {})
    ga = fairness.get("gender_audit", {})
    aa = fairness.get("age_audit", {})

    lines = [
        "# Model Card — Sanjeevni Healthcarer",
        "",
        "> **Auto-generated from `backend/models/metrics.json` and `backend/models/fairness.json`. Do not edit metrics by hand.**",
        "",
        "## Disclaimer",
        "Sanjeevni Healthcarer is a research prototype for clinical screening support. It is not a diagnostic medical device and must never replace a qualified doctor.",
        "",
        "## Model Details & Data Source",
        f"- **Model Name**: {metrics.get('model_name', 'Sanjeevni Tabular XGBoost Ensemble')}",
        "- **Data Source**: public Kaggle diabetes benchmark dataset (`data/diabetes_dataset.csv`)",
        f"- **Dataset Records**: {ds.get('total_records', 'N/A'):,} (Train: {ds.get('train_samples', 'N/A'):,}, Test: {ds.get('test_samples', 'N/A'):,}, Positive Prevalence: {ds.get('positive_prevalence_pct', 'N/A')}%)",
        f"- **Random Seed**: {metrics.get('random_seed', 42)}",
        "",
        "## Performance Metrics (Full-Lab Model)",
        f"- **ROC-AUC**: {perf.get('roc_auc', 0):.4f}",
        f"- **Sensitivity (Recall)**: {perf.get('recall_sensitivity', 0)*100:.2f}%",
        f"- **Specificity**: {perf.get('specificity', 0)*100:.2f}%",
        f"- **Precision**: {perf.get('precision', 0)*100:.2f}%",
        f"- **F1 Score**: {perf.get('f1_score', 0):.4f}",
        f"- **Brier Score (Calibrated / Uncalibrated)**: {perf.get('brier_score_calibrated', 0):.4f} / {perf.get('brier_score_uncalibrated', 0):.4f}",
        f"- **Expected Calibration Error (Calibrated / Uncalibrated)**: {perf.get('expected_calibration_error_calibrated', 0):.4f} / {perf.get('expected_calibration_error_uncalibrated', 0):.4f}",
        f"- **Confusion Matrix (Test Set)**: TP={cm.get('true_positives', 0)}, FP={cm.get('false_positives', 0)}, TN={cm.get('true_negatives', 0)}, FN={cm.get('false_negatives', 0)}",
    ]

    if "no_lab" in metrics:
        nl = metrics["no_lab"]
        nl_perf = nl.get("performance", {})
        nl_cm = nl.get("confusion_matrix", {})
        lines.extend([
            "",
            "## Performance Metrics (No-Lab Screening Model — Without Glucose or HbA1c)",
            f"- **Features Used**: {', '.join(nl.get('features', []))}",
            f"- **ROC-AUC**: {nl_perf.get('roc_auc', 0):.4f}",
            f"- **Sensitivity (Recall)**: {nl_perf.get('recall_sensitivity', 0)*100:.2f}%",
            f"- **Specificity**: {nl_perf.get('specificity', 0)*100:.2f}%",
            f"- **Precision**: {nl_perf.get('precision', 0)*100:.2f}%",
            f"- **Brier Score (Calibrated / Uncalibrated)**: {nl_perf.get('brier_score_calibrated', 0):.4f} / {nl_perf.get('brier_score_uncalibrated', 0):.4f}",
            f"- **Expected Calibration Error (Calibrated / Uncalibrated)**: {nl_perf.get('expected_calibration_error_calibrated', 0):.4f} / {nl_perf.get('expected_calibration_error_uncalibrated', 0):.4f}",
            f"- **Confusion Matrix (Test Set)**: TP={nl_cm.get('true_positives', 0)}, FP={nl_cm.get('false_positives', 0)}, TN={nl_cm.get('true_negatives', 0)}, FN={nl_cm.get('false_negatives', 0)}",
        ])

    lines.extend([
        "",
        "## Fairness Audit (Fairlearn)",
        "",
        "### Gender Subgroups",
        f"- **Demographic Parity Difference**: {ga.get('demographic_parity_difference', 0):.4f}",
        f"- **Equalized Odds Difference**: {ga.get('equalized_odds_difference', 0):.4f}",
        f"- **Summary**: {ga.get('summary', '')}",
        "",
        "| Gender | Recall (TPR) | FPR | Selection Rate | Accuracy |",
        "|---|---|---|---|---|",
    ])
    for grp, vals in ga.get("by_group", {}).items():
        lines.append(
            f"| {grp} | {vals.get('recall_tpr', 0)*100:.1f}% | {vals.get('false_positive_rate', 0)*100:.1f}% | {vals.get('selection_rate', 0)*100:.1f}% | {vals.get('accuracy', 0)*100:.1f}% |"
        )

    lines.extend([
        "",
        "### Age Band Subgroups",
        f"- **Demographic Parity Difference**: {aa.get('demographic_parity_difference', 0):.4f}",
        f"- **Equalized Odds Difference**: {aa.get('equalized_odds_difference', 0):.4f}",
        f"- **Summary**: {aa.get('summary', '')}",
        f"- **Limitation Note**: {aa.get('limitation_note', '')}",
        "",
        "| Age Band | Recall (TPR) | FPR | Selection Rate | Accuracy |",
        "|---|---|---|---|---|",
    ])
    for band, vals in aa.get("by_group", {}).items():
        lines.append(
            f"| {band} | {vals.get('recall_tpr', 0)*100:.1f}% | {vals.get('false_positive_rate', 0)*100:.1f}% | {vals.get('selection_rate', 0)*100:.1f}% | {vals.get('accuracy', 0)*100:.1f}% |"
        )

    if "no_lab_fairness" in fairness:
        nl_f = fairness["no_lab_fairness"]
        nl_ga = nl_f.get("gender_audit", {})
        nl_aa = nl_f.get("age_audit", {})
        lines.extend([
            "",
            "### No-Lab Model Fairness Summary",
            f"- **Gender**: {nl_ga.get('summary', '')}",
            f"- **Age Bands**: {nl_aa.get('summary', '')}",
        ])

    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"✅ Generated {OUT_PATH}")


if __name__ == "__main__":
    generate_doc()
