use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonMark {
    pub r#type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attrs: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonContent {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attrs: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<JsonContent>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub marks: Option<Vec<JsonMark>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

impl JsonContent {
    pub fn text_content(&self) -> String {
        let mut out = String::new();
        if let Some(ref t) = self.text {
            out.push_str(t);
        }
        if let Some(ref children) = self.content {
            for c in children {
                if c.r#type.as_deref() == Some("hard_break") {
                    out.push('\n');
                } else {
                    out.push_str(&c.text_content());
                }
            }
        }
        out
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneDoc {
    pub r#type: String,
    #[serde(default)]
    pub content: Vec<JsonContent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfExportPayload {
    pub title: String,
    pub mode: String, // "screenplay" | "novel"
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub contact: Option<String>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub font_family: Option<String>,
    #[serde(default)]
    pub font_size_pt: Option<f32>,
    #[serde(default)]
    pub justify: Option<bool>,
    #[serde(default)]
    pub indent: Option<bool>,
    #[serde(default)]
    pub page_size: Option<String>,
    #[serde(default)]
    pub has_title_page: Option<bool>,
    #[serde(default)]
    pub page_numbers: Option<bool>,
    #[serde(default)]
    pub scenes: Vec<SceneDoc>,
}

