"""
Configuration for the fake news detection backend.

Model path is configurable via the FAKE_NEWS_MODEL_DIR environment variable so the
checkpoint location never needs to be hardcoded in inference code.
"""
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_MODEL_DIR = PROJECT_ROOT / "fake_news_final_package" / "deberta_model"
MODEL_DIR = Path(os.environ.get("FAKE_NEWS_MODEL_DIR", str(DEFAULT_MODEL_DIR)))

MAX_LENGTH = 256  # matches the max token length used during training/evaluation (MODEL_NOTES.md)

# --- Label mapping -----------------------------------------------------------------
#
# The checkpoint's config.json does NOT contain a verified id2label mapping (it only has
# the generic LABEL_0 / LABEL_1 placeholders), and no training notebook or raw dataset
# split was available in this project to confirm the mapping from source.
#
# The official WELFake dataset documentation (Zenodo record 4561253) states:
#     label 0 = fake, label 1 = real
#
# However, behavioral testing of THIS ACTUAL checkpoint (see LABEL_MAPPING_VERIFICATION.md
# for the full methodology and results: 20 unambiguous synthetic headlines, 10 fake-style and
# 10 real-style) showed the OPPOSITE pattern with very high confidence:
#     - 9/10 fabricated/conspiratorial-style samples  -> predicted class 1
#     - 10/10 factual/wire-style samples               -> predicted class 0
#
# This strongly suggests the training notebook relabeled the column (a common step when
# combining WELFake with datasets that use the opposite convention) so that, for THIS
# checkpoint specifically: 0 = Real, 1 = Fake.
#
# This mapping is applied below because it reflects the model's actual learned behavior,
# which is what the application serves. It is documented as "empirically verified against
# the deployed checkpoint" rather than "confirmed against the original training code",
# because the original notebook/raw splits were not available to inspect directly.
ID2LABEL = {0: "Real", 1: "Fake"}
LABEL_MAPPING_METHOD = "empirical_behavioral_test"
LABEL_MAPPING_VERIFIED = True
LABEL_MAPPING_NOTE = (
    "Mapping (0=Real, 1=Fake) was inferred by running the deployed checkpoint on 20 "
    "unambiguous synthetic headlines (10 fabricated/conspiratorial, 10 factual wire-style) "
    "and observing a consistent, high-confidence pattern. This is the OPPOSITE of the "
    "official WELFake dataset card (0=fake, 1=real), which suggests label relabeling "
    "happened during training preprocessing. See LABEL_MAPPING_VERIFICATION.md."
)

# --- SHAP explanation limits --------------------------------------------------------
SHAP_MAX_CHARS = 700          # truncate article text before explaining to keep latency bounded
SHAP_MAX_EVALS = 120          # PartitionExplainer budget; ~15-30s on CPU for this length
