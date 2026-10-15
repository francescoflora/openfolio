use crate::models::{JsonContent, SceneDoc};
use quick_xml::events::{BytesEnd, BytesStart, BytesText, Event};
use quick_xml::reader::Reader;
use quick_xml::writer::Writer;
use std::io::Cursor;

fn element_to_fdx(el: &str) -> &'static str {
    match el {
        "scene_heading" => "Scene Heading",
        "action" => "Action",
        "character" => "Character",
        "parenthetical" => "Parenthetical",
        "dialogue" => "Dialogue",
        "transition" => "Transition",
        "shot" => "Shot",
        _ => "Action",
    }
}

fn fdx_to_element(fdx: &str) -> &'static str {
    match fdx.to_ascii_lowercase().as_str() {
        "scene heading" => "scene_heading",
        "action" | "general" => "action",
        "character" => "character",
        "parenthetical" => "parenthetical",
        "dialogue" => "dialogue",
        "transition" => "transition",
        "shot" => "shot",
        _ => "action",
    }
}

/// Serialize scenes into a Final Draft XML (.fdx) string.
pub fn scenes_to_fdx(scenes: &[SceneDoc]) -> Result<String, String> {
    let mut buffer = Vec::new();
    let mut writer = Writer::new_with_indent(Cursor::new(&mut buffer), b' ', 2);

    // FinalDraft root
    let mut root = BytesStart::new("FinalDraft");
    root.push_attribute(("DocumentType", "Script"));
    root.push_attribute(("Template", "No"));
    root.push_attribute(("Version", "1"));
    writer.write_event(Event::Start(root)).map_err(|e| e.to_string())?;

    // Content
    writer.write_event(Event::Start(BytesStart::new("Content"))).map_err(|e| e.to_string())?;

    for doc in scenes {
        for node in &doc.content {
            let el_type = node.r#type.as_deref().unwrap_or("action");
            let fdx_type = element_to_fdx(el_type);
            let text = node.text_content();

            let mut para = BytesStart::new("Paragraph");
            para.push_attribute(("Type", fdx_type));
            writer.write_event(Event::Start(para)).map_err(|e| e.to_string())?;

            writer.write_event(Event::Start(BytesStart::new("Text"))).map_err(|e| e.to_string())?;
            writer.write_event(Event::Text(BytesText::new(&text))).map_err(|e| e.to_string())?;
            writer.write_event(Event::End(BytesEnd::new("Text"))).map_err(|e| e.to_string())?;

            writer.write_event(Event::End(BytesEnd::new("Paragraph"))).map_err(|e| e.to_string())?;
        }
    }

    writer.write_event(Event::End(BytesEnd::new("Content"))).map_err(|e| e.to_string())?;
    writer.write_event(Event::End(BytesEnd::new("FinalDraft"))).map_err(|e| e.to_string())?;

    let xml = String::from_utf8(buffer).map_err(|e| e.to_string())?;
    Ok(format!("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n{}", xml))
}

/// Parse a Final Draft XML string into ScriptForge scenes.
pub fn fdx_to_scenes(xml: &str) -> Result<Vec<SceneDoc>, String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut current_type: Option<String> = None;
    let mut current_text = String::new();
    let mut inside_title_page = false;
    let mut inside_paragraph = false;
    let mut inside_text = false;

    struct RawPara {
        r#type: String,
        text: String,
    }
    let mut raw_paras: Vec<RawPara> = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let qname = e.name();
                let name = qname.as_ref();
                if name.eq_ignore_ascii_case("TitlePage") {
                    inside_title_page = true;
                } else if !inside_title_page && name.eq_ignore_ascii_case("Paragraph") {
                    inside_paragraph = true;
                    current_text.clear();
                    let mut p_type = "Action".to_string();
                    for attr in e.attributes().flatten() {
                        let k = attr.key.as_ref();
                        if k.eq_ignore_ascii_case("Type") {
                            p_type = attr.value.as_ref().to_string();
                            break;
                        }
                    }
                    current_type = Some(p_type);
                } else if inside_paragraph && name.eq_ignore_ascii_case("Text") {
                    inside_text = true;
                }
            }
            Ok(Event::End(ref e)) => {
                let qname = e.name();
                let name = qname.as_ref();
                if name.eq_ignore_ascii_case("TitlePage") {
                    inside_title_page = false;
                } else if inside_paragraph && name.eq_ignore_ascii_case("Text") {
                    inside_text = false;
                } else if !inside_title_page && name.eq_ignore_ascii_case("Paragraph") {
                    if let Some(t) = current_type.take() {
                        raw_paras.push(RawPara {
                            r#type: fdx_to_element(&t).to_string(),
                            text: current_text.clone(),
                        });
                    }
                    inside_paragraph = false;
                }
            }
            Ok(Event::Text(ref e)) => {
                if inside_paragraph && inside_text && !inside_title_page {
                    let text = quick_xml::escape::unescape(e.as_ref()).map_err(|err| err.to_string())?;
                    current_text.push_str(&text);
                }
            }
            Ok(Event::CData(ref e)) => {
                if inside_paragraph && inside_text && !inside_title_page {
                    current_text.push_str(e.as_ref());
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parse error at position {}: {:?}", reader.buffer_position(), e)),
            _ => {}
        }
        buf.clear();
    }

    if raw_paras.is_empty() {
        return Ok(vec![SceneDoc {
            r#type: "doc".to_string(),
            content: vec![JsonContent {
                r#type: Some("action".to_string()),
                attrs: None,
                content: None,
                marks: None,
                text: None,
            }],
        }]);
    }

    let mut scenes: Vec<SceneDoc> = Vec::new();
    let mut current_scene: Vec<JsonContent> = Vec::new();

    let flush_scene = |cur: &mut Vec<JsonContent>, sc: &mut Vec<SceneDoc>| {
        if !cur.is_empty() {
            sc.push(SceneDoc {
                r#type: "doc".to_string(),
                content: std::mem::take(cur),
            });
        }
    };

    for p in raw_paras {
        if p.r#type == "scene_heading" && !current_scene.is_empty() {
            flush_scene(&mut current_scene, &mut scenes);
        }

        let content = if !p.text.is_empty() {
            Some(vec![JsonContent {
                r#type: Some("text".to_string()),
                attrs: None,
                content: None,
                marks: None,
                text: Some(p.text),
            }])
        } else {
            None
        };

        current_scene.push(JsonContent {
            r#type: Some(p.r#type),
            attrs: None,
            content,
            marks: None,
            text: None,
        });
    }

    flush_scene(&mut current_scene, &mut scenes);

    if scenes.is_empty() {
        scenes.push(SceneDoc {
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

    Ok(scenes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fdx_roundtrip() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <Paragraph Type="Scene Heading">
      <Text>INT. OFFICE - DAY</Text>
    </Paragraph>
    <Paragraph Type="Action">
      <Text>A detective sits at a cluttered desk.</Text>
    </Paragraph>
    <Paragraph Type="Character">
      <Text>JOHN</Text>
    </Paragraph>
    <Paragraph Type="Dialogue">
      <Text>Case closed.</Text>
    </Paragraph>
  </Content>
</FinalDraft>"#;

        let scenes = fdx_to_scenes(xml).expect("parse failed");
        assert_eq!(scenes.len(), 1);
        assert_eq!(scenes[0].content.len(), 4);
        assert_eq!(scenes[0].content[0].r#type.as_deref(), Some("scene_heading"));

        let serialized = scenes_to_fdx(&scenes).expect("serialize failed");
        assert!(serialized.contains("Type=\"Scene Heading\""));
        assert!(serialized.contains("INT. OFFICE - DAY"));
        assert!(serialized.contains("Case closed."));
    }
}
