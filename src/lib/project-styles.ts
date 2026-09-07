export const PRESET_STYLES = ["3D-Animation", "Charcoal", "Claymation", "Concept-Sketch", "Realistic"];

// Sentinel <option> value that means "the user picked a custom style" — the
// actual text lives in a sibling form field, since a <select> can't hold
// free text itself. Shared between the field's client component and the
// createProject action so the two never drift out of sync.
export const CUSTOM_STYLE_VALUE = "__custom__";
