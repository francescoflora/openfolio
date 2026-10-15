use crate::models::{JsonContent, JsonMark, SceneDoc};

/// Serialize a list of OpenFolio scenes to Fountain script text.
pub fn scenes_to_fountain(scenes: &[SceneDoc]) -> String {
    let mut out = String::new();

    for scene in scenes {
        for node in &scene.content {
            let ntype = node.r#type.as_deref().unwrap_or("action");
            let text = inline_text(node);

            match ntype {
                "scene_heading" | "character" | "shot" => {
                    out.push('\n');
                    out.push_str(&text.to_uppercase());
                    out.push('\n');
                }
                "transition" => {
                    out.push('\n');
                    let upper = text.to_uppercase();
                    if upper.ends_with(':') {
                        out.push_str(&upper);
                    } else {
                        out.push_str(&upper);
                        out.push(':');
                    }
                    out.push('\n');
                }
                "parenthetical" => {
                    let trimmed = text.trim();
                    if trimmed.starts_with('(') && trimmed.ends_with(')') {
                        out.push_str(trimmed);
                    } else {
                        out.push('(');
                        out.push_str(trimmed);
                        out.push(')');
                    }
                    out.push('\n');
                }
                "dialogue" => {
                    out.push_str(&text);
                    out.push('\n');
                }
                _ => {
                    // action / default
                    out.push('\n');
                    out.push_str(&text);
                    out.push('\n');
                }
            }
        }
    }

    // Clean up excessive blank lines
    let mut result = String::new();
    let mut blank_count = 0;
    for line in out.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            blank_count += 1;
            if blank_count <= 1 {
                result.push('\n');
            }
        } else {
            blank_count = 0;
            result.push_str(line);
            result.push('\n');
        }
    }

    result.trim_start().to_string()
}

fn inline_text(node: &JsonContent) -> String {
    let mut s = String::new();
    if let Some(ref text) = node.text {
        s.push_str(text);
    }
    if let Some(ref children) = node.content {
        for c in children {
            if c.r#type.as_deref() == Some("hard_break") {
                s.push('\n');
            } else {
                let inner = inline_text(c);
                let has_bold = c
                    .marks
                    .as_ref()
                    .map(|m| m.iter().any(|mk| mk.r#type == "strong"))
                    .unwrap_or(false);
                let has_em = c
                    .marks
                    .as_ref()
                    .map(|m| m.iter().any(|mk| mk.r#type == "em"))
                    .unwrap_or(false);

                if has_bold && has_em {
                    s.push_str("***");
                    s.push_str(&inner);
                    s.push_str("***");
                } else if has_bold {
                    s.push_str("**");
                    s.push_str(&inner);
                    s.push_str("**");
                } else if has_em {
                    s.push('*');
                    s.push_str(&inner);
                    s.push('*');
                } else {
                    s.push_str(&inner);
                }
            }
        }
    }
    s
}

/// Parse a Fountain text string into a list of ScriptForge SceneDocs.
/// Scenes are split on scene headings so each scene becomes a binder document.
pub fn fountain_to_scenes(text: &str) -> Vec<SceneDoc> {
    let normalized = text.replace("\r\n", "\n").replace('\r', "\n");
    let lines: Vec<&str> = normalized.lines().collect();

    let mut all_scenes: Vec<SceneDoc> = Vec::new();
    let mut current_scene_nodes: Vec<JsonContent> = Vec::new();

    let mut prev_type: Option<String> = None;
    let mut current_block: Option<JsonContent> = None;

    let flush_block = |block: &mut Option<JsonContent>, nodes: &mut Vec<JsonContent>| {
        if let Some(b) = block.take() {
            nodes.push(b);
        }
    };

    let flush_scene = |nodes: &mut Vec<JsonContent>, scenes: &mut Vec<SceneDoc>| {
        if !nodes.is_empty() {
            scenes.push(SceneDoc {
                r#type: "doc".to_string(),
                content: std::mem::take(nodes),
            });
        }
    };

    for i in 0..lines.len() {
        let raw_line = lines[i];
        let t = raw_line.trim();

        if t.is_empty() {
            flush_block(&mut current_block, &mut current_scene_nodes);
            prev_type = None;
            continue;
        }

        let next_line = lines.get(i + 1).map(|s| s.trim());
        let el_type = classify_line(t, prev_type.as_deref(), next_line);

        // If this is a scene heading, and we already have content in the current scene, start a new scene
        if el_type == "scene_heading" {
            flush_block(&mut current_block, &mut current_scene_nodes);
            flush_scene(&mut current_scene_nodes, &mut all_scenes);
        }

        let is_continuable = el_type == "action" || el_type == "dialogue";

        if let Some(ref mut cur) = current_block
            && cur.r#type.as_deref() == Some(&el_type) && is_continuable {
                // Append as hard_break + inline content
                if let Some(ref mut content) = cur.content {
                    content.push(JsonContent {
                        r#type: Some("hard_break".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: None,
                    });
                    content.extend(parse_inlines(t));
                }
                prev_type = Some(el_type);
                continue;
            }

        flush_block(&mut current_block, &mut current_scene_nodes);

        current_block = Some(JsonContent {
            r#type: Some(el_type.clone()),
            attrs: None,
            content: Some(parse_inlines(t)),
            marks: None,
            text: None,
        });

        prev_type = Some(el_type);
    }

    flush_block(&mut current_block, &mut current_scene_nodes);
    flush_scene(&mut current_scene_nodes, &mut all_scenes);

    if all_scenes.is_empty() {
        all_scenes.push(SceneDoc {
            r#type: "doc".to_string(),
            content: vec![JsonContent {
                r#type: Some("action".to_string()),
                attrs: None,
                content: None,
                marks: None,
                text: None,
            }],
        });
    }

    all_scenes
}

fn classify_line(t: &str, prev: Option<&str>, next: Option<&str>) -> String {
    let upper = t.to_uppercase();

    // Scene headings
    if t.starts_with('.') && !t.starts_with("...") {
        return "scene_heading".to_string();
    }
    if is_scene_heading(&upper) {
        return "scene_heading".to_string();
    }

    // Transitions
    if is_transition(&upper) {
        return "transition".to_string();
    }

    // Parentheticals
    if t.starts_with('(') && t.ends_with(')') {
        return "parenthetical".to_string();
    }

    // Dialogue continuation
    if let Some(p) = prev
        && (p == "character" || p == "parenthetical" || p == "dialogue") {
            return "dialogue".to_string();
        }

    // Character cue
    if is_character_cue(t, next) {
        return "character".to_string();
    }

    "action".to_string()
}

fn is_scene_heading(upper: &str) -> bool {
    let prefixes = [
        "INT. ", "EXT. ", "INT ", "EXT ", "EST. ", "EST ", "INT./EXT. ", "INT/EXT ", "I/E ", "I/E. "
    ];
    for p in &prefixes {
        if upper.starts_with(p) {
            return true;
        }
    }
    false
}

fn is_transition(upper: &str) -> bool {
    if upper.starts_with('>') && upper.ends_with('<') {
        return false;
    }
    if upper.starts_with('>') && !upper.ends_with('<') {
        return true;
    }
    upper.ends_with(" TO:")
        || upper == "FADE IN:"
        || upper == "FADE OUT."
        || upper == "CUT TO:"
        || upper == "DISSOLVE TO:"
        || upper == "SMASH CUT TO:"
}

fn is_character_cue(t: &str, next: Option<&str>) -> bool {
    if t.starts_with('@') {
        return true;
    }
    if t.chars().count() > 40 {
        return false;
    }
    if !t.chars().any(|c| c.is_alphabetic()) {
        return false;
    }
    if t != t.to_uppercase() {
        return false;
    }
    if let Some(nxt) = next {
        !nxt.trim().is_empty()
    } else {
        false
    }
}

fn parse_inlines(text: &str) -> Vec<JsonContent> {
    // Quick inline parser for bold / italic marks
    let mut nodes = Vec::new();
    let mut rest = text;

    while !rest.is_empty() {
        if let Some(start) = rest.find("**")
            && let Some(end) = rest[start + 2..].find("**") {
                let actual_end = start + 2 + end;
                if start > 0 {
                    nodes.push(make_text_node(&rest[..start], false, false));
                }
                nodes.push(make_text_node(&rest[start + 2..actual_end], true, false));
                rest = &rest[actual_end + 2..];
                continue;
            }
        if let Some(start) = rest.find('*')
            && let Some(end) = rest[start + 1..].find('*') {
                let actual_end = start + 1 + end;
                if start > 0 {
                    nodes.push(make_text_node(&rest[..start], false, false));
                }
                nodes.push(make_text_node(&rest[start + 1..actual_end], false, true));
                rest = &rest[actual_end + 1..];
                continue;
            }
        nodes.push(make_text_node(rest, false, false));
        break;
    }

    if nodes.is_empty() {
        nodes.push(make_text_node(text, false, false));
    }
    nodes
}

fn make_text_node(t: &str, bold: bool, italic: bool) -> JsonContent {
    let mut marks = Vec::new();
    if bold {
        marks.push(JsonMark {
            r#type: "strong".to_string(),
            attrs: None,
        });
    }
    if italic {
        marks.push(JsonMark {
            r#type: "em".to_string(),
            attrs: None,
        });
    }
    JsonContent {
        r#type: Some("text".to_string()),
        attrs: None,
        content: None,
        marks: if marks.is_empty() { None } else { Some(marks) },
        text: Some(t.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fountain_roundtrip() {
        let fountain_src = "INT. CAFE - DAY\n\nMARCO\n(smiling)\nHello world!\n\nCUT TO:\n\nEXT. PARK - NIGHT\n\nBirds are chirping.";
        let scenes = fountain_to_scenes(fountain_src);
        assert_eq!(scenes.len(), 2);
        assert_eq!(scenes[0].content[0].r#type.as_deref(), Some("scene_heading"));
        assert_eq!(scenes[1].content[0].r#type.as_deref(), Some("scene_heading"));

        let serialized = scenes_to_fountain(&scenes);
        assert!(serialized.contains("INT. CAFE - DAY"));
        assert!(serialized.contains("MARCO"));
        assert!(serialized.contains("(smiling)"));
        assert!(serialized.contains("Hello world!"));
        assert!(serialized.contains("EXT. PARK - NIGHT"));
    }
}
