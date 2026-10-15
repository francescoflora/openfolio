use crate::models::PdfExportPayload;
use printpdf::*;

const MM_PER_INCH: f32 = 25.4;

pub fn generate_pdf(payload: &PdfExportPayload) -> Result<Vec<u8>, String> {
    let mut doc = PdfDocument::new(&payload.title);

    let is_novel = payload.mode.eq_ignore_ascii_case("novel");
    let is_a4 = payload
        .page_size
        .as_deref()
        .map(|s| s.eq_ignore_ascii_case("a4"))
        .unwrap_or(false);

    let (page_w_mm, page_h_mm) = if is_a4 {
        (210.0, 297.0) // A4
    } else {
        (215.9, 279.4) // Letter: 8.5 x 11 in
    };

    let mut pages = Vec::new();

    // Check if we should render a Title Page: only if explicitly requested, or if author/contact is present with a real custom title
    let has_title_page = payload.has_title_page.unwrap_or_else(|| {
        let title_clean = payload.title.trim();
        let is_default = title_clean.eq_ignore_ascii_case("senza titolo")
            || title_clean.eq_ignore_ascii_case("untitled")
            || title_clean.is_empty();
        let has_author = payload.author.as_ref().map(|a| !a.trim().is_empty()).unwrap_or(false);
        let has_contact = payload.contact.as_ref().map(|c| !c.trim().is_empty()).unwrap_or(false);
        (!is_default && has_author) || has_contact
    });

    if has_title_page {
        let title_ops = render_title_page(
            payload,
            page_w_mm,
            page_h_mm,
            is_novel,
        );
        pages.push(PdfPage::new(Mm(page_w_mm), Mm(page_h_mm), title_ops));
    }

    // Now render content pages
    let content_pages = if is_novel {
        render_novel_pages(payload, page_w_mm, page_h_mm)
    } else {
        render_screenplay_pages(payload, page_w_mm, page_h_mm)
    };

    pages.extend(content_pages);

    if pages.is_empty() {
        pages.push(PdfPage::new(
            Mm(page_w_mm),
            Mm(page_h_mm),
            vec![Op::SaveGraphicsState, Op::RestoreGraphicsState],
        ));
    }

    let mut warnings = Vec::new();
    let bytes = doc
        .with_pages(pages)
        .save(&PdfSaveOptions::default(), &mut warnings);

    Ok(bytes)
}

fn render_title_page(
    payload: &PdfExportPayload,
    page_w: f32,
    page_h: f32,
    is_novel: bool,
) -> Vec<Op> {
    let mut ops = Vec::new();
    ops.push(Op::SaveGraphicsState);

    let ff = payload.font_family.as_deref().unwrap_or("serif").to_lowercase();
    let (font_title, font_body) = if !is_novel || ff.contains("courier") || ff.contains("mono") {
        (
            PdfFontHandle::Builtin(BuiltinFont::CourierBold),
            PdfFontHandle::Builtin(BuiltinFont::Courier),
        )
    } else if ff.contains("sans") || ff.contains("helvetica") || ff.contains("inter") || ff.contains("outfit") {
        (
            PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
            PdfFontHandle::Builtin(BuiltinFont::Helvetica),
        )
    } else {
        (
            PdfFontHandle::Builtin(BuiltinFont::TimesBold),
            PdfFontHandle::Builtin(BuiltinFont::TimesRoman),
        )
    };

    let center_x = page_w / 2.0;

    // Title centered vertically roughly at 60% of page height
    let title_y = page_h * 0.60;
    let title_text = payload.title.to_uppercase();

    // Approx width of title
    let char_w_mm = if is_novel { 3.5 } else { 4.2 };
    let title_w = title_text.chars().count() as f32 * char_w_mm;
    let title_x = (center_x - (title_w / 2.0)).max(25.4);

    ops.push(Op::StartTextSection);
    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(title_x), Mm(title_y)),
    });
    ops.push(Op::SetFont {
        font: font_title,
        size: Pt(22.0),
    });
    ops.push(Op::SetFillColor {
        col: Color::Rgb(Rgb {
            r: 0.0,
            g: 0.0,
            b: 0.0,
            icc_profile: None,
        }),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(title_text)],
    });
    ops.push(Op::EndTextSection);

    // Author
    if let Some(ref author) = payload.author
        && !author.trim().is_empty() {
            let by_y = title_y - 20.0;
            let by_text = if is_novel {
                format!("di {}", author)
            } else {
                format!("scritto da\n\n{}", author)
            };

            let mut cur_y = by_y;
            for line in by_text.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let w = trimmed.chars().count() as f32 * 2.5;
                    let author_x = (center_x - (w / 2.0)).max(25.4);
                    ops.push(Op::StartTextSection);
                    ops.push(Op::SetTextCursor {
                        pos: Point::new(Mm(author_x), Mm(cur_y)),
                    });
                    ops.push(Op::SetFont {
                        font: font_body.clone(),
                        size: Pt(12.0),
                    });
                    ops.push(Op::ShowText {
                        items: vec![TextItem::Text(trimmed.to_string())],
                    });
                    ops.push(Op::EndTextSection);
                }
                cur_y -= 6.0;
            }
        }

    // Contact (bottom left)
    if let Some(ref contact) = payload.contact
        && !contact.trim().is_empty() {
            let mut cur_y = 45.0; // 45mm from bottom
            for line in contact.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    ops.push(Op::StartTextSection);
                    ops.push(Op::SetTextCursor {
                        pos: Point::new(Mm(25.4), Mm(cur_y)),
                    });
                    ops.push(Op::SetFont {
                        font: font_body.clone(),
                        size: Pt(10.0),
                    });
                    ops.push(Op::ShowText {
                        items: vec![TextItem::Text(trimmed.to_string())],
                    });
                    ops.push(Op::EndTextSection);
                }
                cur_y -= 4.5;
            }
        }

    ops.push(Op::RestoreGraphicsState);
    ops
}

fn render_screenplay_pages(
    payload: &PdfExportPayload,
    page_w: f32,
    page_h: f32,
) -> Vec<PdfPage> {
    let top_margin = MM_PER_INCH; // 1 inch = 25.4 mm
    let bottom_margin = MM_PER_INCH; // 1 inch
    let left_margin = 1.5 * MM_PER_INCH; // 1.5 inches = 38.1 mm
    let line_height_mm = 4.233; // 1/6th inch = 12pt line spacing

    let ff = payload.font_family.as_deref().unwrap_or("courier").to_lowercase();
    let (font_regular, font_bold, font_italic) = if ff.contains("sans") || ff.contains("helvetica") || ff.contains("inter") || ff.contains("outfit") {
        (
            PdfFontHandle::Builtin(BuiltinFont::Helvetica),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaOblique),
        )
    } else if ff.contains("times") || ff.contains("garamond") || ff.contains("serif") {
        (
            PdfFontHandle::Builtin(BuiltinFont::TimesRoman),
            PdfFontHandle::Builtin(BuiltinFont::TimesBold),
            PdfFontHandle::Builtin(BuiltinFont::TimesItalic),
        )
    } else {
        (
            PdfFontHandle::Builtin(BuiltinFont::Courier),
            PdfFontHandle::Builtin(BuiltinFont::CourierBold),
            PdfFontHandle::Builtin(BuiltinFont::CourierOblique),
        )
    };

    let font_size = payload.font_size_pt.unwrap_or(12.0);

    let mut pdf_pages = Vec::new();
    let mut cur_ops: Vec<Op> = Vec::new();
    let mut cur_y = page_h - top_margin;
    let mut page_num = 1;

    let font_num = font_regular.clone();
    let init_page = |ops: &mut Vec<Op>, p_num: usize, cur_y: &mut f32| {
        ops.push(Op::SaveGraphicsState);
        *cur_y = page_h - top_margin;
        // Running header starting on page 2
        if p_num > 1 {
            ops.push(Op::StartTextSection);
            // Right margin: 1 inch = 25.4 mm
            let header_x = page_w - MM_PER_INCH - 10.0;
            let header_y = page_h - 12.7; // 0.5 inch from top
            ops.push(Op::SetTextCursor {
                pos: Point::new(Mm(header_x), Mm(header_y)),
            });
            ops.push(Op::SetFont {
                font: font_num.clone(),
                size: Pt(12.0),
            });
            ops.push(Op::ShowText {
                items: vec![TextItem::Text(format!("{}.", p_num))],
            });
            ops.push(Op::EndTextSection);
        }
    };

    init_page(&mut cur_ops, page_num, &mut cur_y);

    for (s_idx, scene) in payload.scenes.iter().enumerate() {
        // Scene break (each scene starts on new page if multi-scene project, or flows)
        if s_idx > 0 && cur_y < page_h - top_margin - (line_height_mm * 4.0) {
            // New page on scene break
            cur_ops.push(Op::RestoreGraphicsState);
            pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), std::mem::take(&mut cur_ops)));
            page_num += 1;
            init_page(&mut cur_ops, page_num, &mut cur_y);
        }

        for node in &scene.content {
            let el_type = node.r#type.as_deref().unwrap_or("action");
            let text = node.text_content();
            if text.trim().is_empty() {
                continue;
            }

            // Determine element styling and layout
            let (font, left_offset_in, max_chars, extra_before_lines, uppercase) = match el_type {
                "section_heading" | "heading" => (&font_bold, 0.0, 60, 2, true),
                "scene_heading" => (&font_bold, 0.0, 60, 2, true),
                "action" => (&font_regular, 0.0, 60, 1, false),
                "character" => (&font_bold, 2.0, 35, 1, true),
                "parenthetical" => (&font_italic, 1.5, 32, 0, false),
                "dialogue" => (&font_regular, 1.0, 37, 0, false),
                "transition" => (&font_bold, 4.0, 20, 1, true),
                "shot" => (&font_bold, 0.0, 60, 1, true),
                _ => (&font_regular, 0.0, 60, 1, false),
            };

            let formatted_text = if uppercase {
                text.to_uppercase()
            } else if el_type == "parenthetical" {
                let t = text.trim();
                if t.starts_with('(') && t.ends_with(')') {
                    t.to_string()
                } else {
                    format!("({})", t)
                }
            } else {
                text.clone()
            };

            let lines = wrap_text(&formatted_text, max_chars);

            // Add leading space before element
            let needed_space = (extra_before_lines as f32 + lines.len() as f32) * line_height_mm;
            if cur_y - needed_space < bottom_margin {
                cur_ops.push(Op::RestoreGraphicsState);
                pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), std::mem::take(&mut cur_ops)));
                page_num += 1;
                init_page(&mut cur_ops, page_num, &mut cur_y);
            } else {
                cur_y -= extra_before_lines as f32 * line_height_mm;
            }

            let is_section_heading = el_type == "section_heading" || el_type == "heading";
            let default_elem_x = left_margin + (left_offset_in * MM_PER_INCH);

            for line in lines {
                if cur_y - line_height_mm < bottom_margin {
                    cur_ops.push(Op::RestoreGraphicsState);
                    pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), std::mem::take(&mut cur_ops)));
                    page_num += 1;
                    init_page(&mut cur_ops, page_num, &mut cur_y);
                }

                let x = if is_section_heading {
                    let text_w = line.chars().count() as f32 * 2.54;
                    ((page_w - text_w) / 2.0).max(left_margin)
                } else {
                    default_elem_x
                };

                cur_ops.push(Op::StartTextSection);
                cur_ops.push(Op::SetTextCursor {
                    pos: Point::new(Mm(x), Mm(cur_y)),
                });
                cur_ops.push(Op::SetFont {
                    font: font.clone(),
                    size: Pt(font_size),
                });
                cur_ops.push(Op::ShowText {
                    items: vec![TextItem::Text(line)],
                });
                cur_ops.push(Op::EndTextSection);

                cur_y -= line_height_mm;
            }
        }
    }

    if !cur_ops.is_empty() {
        cur_ops.push(Op::RestoreGraphicsState);
        pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), cur_ops));
    }

    pdf_pages
}

fn render_novel_pages(
    payload: &PdfExportPayload,
    page_w: f32,
    page_h: f32,
) -> Vec<PdfPage> {
    let top_margin = MM_PER_INCH;
    let bottom_margin = MM_PER_INCH;
    let left_margin = MM_PER_INCH;
    let right_margin = MM_PER_INCH;
    let printable_w = page_w - left_margin - right_margin;

    let font_size = payload.font_size_pt.unwrap_or(12.0);
    let line_height_mm = font_size * 0.3528 * 1.5; // 1.5 line height

    let ff = payload.font_family.as_deref().unwrap_or("serif").to_lowercase();
    let (font_regular, font_bold, font_italic, char_w_approx) = if ff.contains("courier") || ff.contains("mono") {
        (
            PdfFontHandle::Builtin(BuiltinFont::Courier),
            PdfFontHandle::Builtin(BuiltinFont::CourierBold),
            PdfFontHandle::Builtin(BuiltinFont::CourierOblique),
            2.54, // Courier monospace 10 cpi at 12pt
        )
    } else if ff.contains("sans") || ff.contains("helvetica") || ff.contains("inter") || ff.contains("outfit") {
        (
            PdfFontHandle::Builtin(BuiltinFont::Helvetica),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaOblique),
            1.85,
        )
    } else {
        (
            PdfFontHandle::Builtin(BuiltinFont::TimesRoman),
            PdfFontHandle::Builtin(BuiltinFont::TimesBold),
            PdfFontHandle::Builtin(BuiltinFont::TimesItalic),
            1.85,
        )
    };

    let scale = font_size / 12.0;
    let effective_char_w = char_w_approx * scale;
    let max_chars = ((printable_w / effective_char_w) as usize).max(45);

    let mut pdf_pages = Vec::new();
    let mut cur_ops: Vec<Op> = Vec::new();
    let mut cur_y = page_h - top_margin;
    let mut page_num = 1;

    let font_num = font_regular.clone();
    let init_page = |ops: &mut Vec<Op>, p_num: usize, cur_y: &mut f32| {
        ops.push(Op::SaveGraphicsState);
        *cur_y = page_h - top_margin;
        if p_num > 1 {
            ops.push(Op::StartTextSection);
            let header_x = page_w / 2.0;
            let header_y = page_h - 12.7;
            ops.push(Op::SetTextCursor {
                pos: Point::new(Mm(header_x), Mm(header_y)),
            });
            ops.push(Op::SetFont {
                font: font_num.clone(),
                size: Pt(10.0),
            });
            ops.push(Op::ShowText {
                items: vec![TextItem::Text(format!("- {} -", p_num))],
            });
            ops.push(Op::EndTextSection);
        }
    };

    init_page(&mut cur_ops, page_num, &mut cur_y);

    for (s_idx, scene) in payload.scenes.iter().enumerate() {
        if s_idx > 0 {
            cur_ops.push(Op::RestoreGraphicsState);
            pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), std::mem::take(&mut cur_ops)));
            page_num += 1;
            init_page(&mut cur_ops, page_num, &mut cur_y);
        }

        for node in &scene.content {
            let el_type = node.r#type.as_deref().unwrap_or("paragraph");
            let text = node.text_content();
            if text.trim().is_empty() {
                continue;
            }

            let is_heading = el_type == "heading" || el_type == "section_heading";
            let is_quote = el_type == "blockquote";

            let (font, size, indent_mm) = if is_heading {
                (&font_bold, Pt(font_size + 4.0), 0.0)
            } else if is_quote {
                (&font_italic, Pt(font_size), 12.7)
            } else {
                let ind = if payload.indent.unwrap_or(true) { 10.0 } else { 0.0 };
                (&font_regular, Pt(font_size), ind)
            };

            let lines = wrap_text(&text, max_chars);
            let extra_top = if is_heading { line_height_mm * 2.0 } else { line_height_mm * 0.5 };

            if cur_y - (extra_top + (lines.len() as f32 * line_height_mm)) < bottom_margin {
                cur_ops.push(Op::RestoreGraphicsState);
                pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), std::mem::take(&mut cur_ops)));
                page_num += 1;
                init_page(&mut cur_ops, page_num, &mut cur_y);
            } else {
                cur_y -= extra_top;
            }

            for (i, line) in lines.into_iter().enumerate() {
                if cur_y - line_height_mm < bottom_margin {
                    cur_ops.push(Op::RestoreGraphicsState);
                    pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), std::mem::take(&mut cur_ops)));
                    page_num += 1;
                    init_page(&mut cur_ops, page_num, &mut cur_y);
                }

                let x = if is_heading {
                    let heading_font_pt = font_size + 4.0;
                    let heading_char_w = char_w_approx * (heading_font_pt / 12.0) * 0.9;
                    let text_w = line.chars().count() as f32 * heading_char_w;
                    ((page_w - text_w) / 2.0).max(left_margin)
                } else if i == 0 {
                    left_margin + indent_mm
                } else if is_quote {
                    left_margin + 12.7
                } else {
                    left_margin
                };

                cur_ops.push(Op::StartTextSection);
                cur_ops.push(Op::SetTextCursor {
                    pos: Point::new(Mm(x), Mm(cur_y)),
                });
                cur_ops.push(Op::SetFont {
                    font: font.clone(),
                    size,
                });
                cur_ops.push(Op::ShowText {
                    items: vec![TextItem::Text(line)],
                });
                cur_ops.push(Op::EndTextSection);

                cur_y -= line_height_mm;
            }
        }
    }

    if !cur_ops.is_empty() {
        cur_ops.push(Op::RestoreGraphicsState);
        pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), cur_ops));
    }

    pdf_pages
}

fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    let mut lines = Vec::new();
    for paragraph in text.lines() {
        let words: Vec<&str> = paragraph.split_whitespace().collect();
        if words.is_empty() {
            continue;
        }
        let mut cur_line = String::new();
        let mut cur_chars = 0usize;
        for word in words {
            let w_chars = word.chars().count();
            if cur_line.is_empty() {
                cur_line.push_str(word);
                cur_chars = w_chars;
            } else if cur_chars + 1 + w_chars <= max_chars {
                cur_line.push(' ');
                cur_line.push_str(word);
                cur_chars += 1 + w_chars;
            } else {
                lines.push(cur_line);
                cur_line = word.to_string();
                cur_chars = w_chars;
            }
        }
        if !cur_line.is_empty() {
            lines.push(cur_line);
        }
    }
    if lines.is_empty() {
        lines.push(text.to_string());
    }
    lines
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{JsonContent, SceneDoc};

    #[test]
    fn test_generate_pdf_screenplay() {
        let payload = PdfExportPayload {
            title: "Test Script".to_string(),
            mode: "screenplay".to_string(),
            author: Some("Jane Doe".to_string()),
            contact: Some("jane@example.com".to_string()),
            font_family: None,
            font_size_pt: None,
            justify: None,
            indent: None,
            has_title_page: None,
            page_size: Some("letter".to_string()),
            scenes: vec![SceneDoc {
                r#type: "doc".to_string(),
                content: vec![
                    JsonContent {
                        r#type: Some("scene_heading".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("INT. ROOM - DAY".to_string()),
                    },
                    JsonContent {
                        r#type: Some("action".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("A quiet morning.".to_string()),
                    },
                    JsonContent {
                        r#type: Some("character".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("LUCAS".to_string()),
                    },
                    JsonContent {
                        r#type: Some("dialogue".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("Good morning!".to_string()),
                    },
                ],
            }],
        };

        let bytes = generate_pdf(&payload).expect("Failed to generate PDF");
        assert!(bytes.len() > 100);
        assert_eq!(&bytes[0..4], b"%PDF");
    }

    #[test]
    fn test_generate_pdf_novel() {
        let payload = PdfExportPayload {
            title: "Il Grande Viaggio".to_string(),
            mode: "novel".to_string(),
            author: Some("Mario Rossi".to_string()),
            contact: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: Some(true),
            indent: Some(true),
            has_title_page: None,
            page_size: Some("a4".to_string()),
            scenes: vec![SceneDoc {
                r#type: "doc".to_string(),
                content: vec![
                    JsonContent {
                        r#type: Some("heading".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("Capitolo 1".to_string()),
                    },
                    JsonContent {
                        r#type: Some("paragraph".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("Era una notte buia e tempestosa.".to_string()),
                    },
                ],
            }],
        };

        let bytes = generate_pdf(&payload).expect("Failed to generate Novel PDF");
        assert!(bytes.len() > 100);
        assert_eq!(&bytes[0..4], b"%PDF");
    }

    #[test]
    fn test_generate_pdf_screenplay_with_section_heading() {
        let payload = PdfExportPayload {
            title: "Il Copione".to_string(),
            mode: "screenplay".to_string(),
            author: Some("Autore".to_string()),
            contact: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(false),
            page_size: Some("letter".to_string()),
            scenes: vec![SceneDoc {
                r#type: "doc".to_string(),
                content: vec![
                    JsonContent {
                        r#type: Some("section_heading".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("ATTO I".to_string()),
                    },
                    JsonContent {
                        r#type: Some("scene_heading".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("INT. CASA - GIORNO".to_string()),
                    },
                    JsonContent {
                        r#type: Some("action".to_string()),
                        attrs: None,
                        content: None,
                        marks: None,
                        text: Some("La scena inizia qui.".to_string()),
                    },
                ],
            }],
        };

        let bytes = generate_pdf(&payload).expect("Failed to generate Screenplay with section heading PDF");
        assert!(bytes.len() > 100);
        assert_eq!(&bytes[0..4], b"%PDF");
    }
}
