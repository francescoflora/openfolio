use crate::models::{PdfExportPayload, SceneDoc};
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

    // Check if we should render a Title Page: default to true unless explicitly set to false
    let has_title_page = payload.has_title_page.unwrap_or(true);

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

pub const TIMES_ROMAN_WIDTHS: [u16; 95] = [250, 333, 408, 500, 500, 833, 778, 333, 333, 333, 500, 564, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444, 921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500, 333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541];
pub const TIMES_BOLD_WIDTHS: [u16; 95] = [250, 333, 555, 500, 500, 1000, 833, 333, 333, 333, 500, 570, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500, 930, 722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778, 611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667, 333, 278, 333, 581, 500, 333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500, 556, 556, 444, 389, 333, 556, 500, 722, 500, 500, 444, 394, 220, 394, 520];
pub const HELVETICA_WIDTHS: [u16; 95] = [278, 278, 355, 556, 556, 889, 667, 222, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 222, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
pub const HELVETICA_BOLD_WIDTHS: [u16; 95] = [278, 333, 474, 556, 556, 889, 722, 278, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 278, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum FontKind {
    TimesRoman,
    TimesBold,
    Helvetica,
    HelveticaBold,
    Courier,
}

pub fn char_advance_units(ch: char, kind: FontKind) -> u16 {
    if kind == FontKind::Courier {
        return 600;
    }

    let ascii_char = match ch {
        'à' | 'á' | 'â' | 'ä' | 'ã' | 'å' => 'a',
        'è' | 'é' | 'ê' | 'ë' => 'e',
        'ì' | 'í' | 'î' | 'ï' => 'i',
        'ò' | 'ó' | 'ô' | 'ö' | 'õ' => 'o',
        'ù' | 'ú' | 'û' | 'ü' => 'u',
        'À' | 'Á' | 'Â' | 'Ä' | 'Ã' | 'Å' => 'A',
        'È' | 'É' | 'Ê' | 'Ë' => 'E',
        'Ì' | 'Í' | 'Î' | 'Ï' => 'I',
        'Ò' | 'Ó' | 'Ô' | 'Ö' | 'Õ' => 'O',
        'Ù' | 'Ú' | 'Û' | 'Ü' => 'U',
        'ç' => 'c',
        'Ç' => 'C',
        'ñ' => 'n',
        'Ñ' => 'N',
        '’' | '‘' | '‚' => '\'',
        '“' | '”' | '„' => '"',
        _ => ch,
    };

    let code = ascii_char as u32;
    if (32..=126).contains(&code) {
        let idx = (code - 32) as usize;
        return match kind {
            FontKind::TimesRoman => TIMES_ROMAN_WIDTHS[idx],
            FontKind::TimesBold => TIMES_BOLD_WIDTHS[idx],
            FontKind::Helvetica => HELVETICA_WIDTHS[idx],
            FontKind::HelveticaBold => HELVETICA_BOLD_WIDTHS[idx],
            FontKind::Courier => 600,
        };
    }

    match ch {
        '«' | '»' | '–' => 500,
        '—' | '…' => 1000,
        _ => 500,
    }
}

pub fn measure_text_width_pt(text: &str, kind: FontKind, font_size_pt: f32) -> f32 {
    let units: u32 = text.chars().map(|c| char_advance_units(c, kind) as u32).sum();
    (units as f32) * (font_size_pt / 1000.0)
}

pub fn measure_text_width_mm(text: &str, kind: FontKind, font_size_pt: f32) -> f32 {
    measure_text_width_pt(text, kind, font_size_pt) * (25.4 / 72.0)
}

fn wrap_paragraph(
    text: &str,
    first_line_w: f32,
    other_lines_w: f32,
    kind: FontKind,
    font_size_pt: f32,
) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return Vec::new();
    }

    let mut lines = Vec::new();
    let mut cur_line = String::new();
    let mut is_first = true;

    for word in words {
        let target_w = if is_first { first_line_w } else { other_lines_w };

        if !cur_line.is_empty() {
            let mut candidate = cur_line.clone();
            candidate.push(' ');
            candidate.push_str(word);
            let w = measure_text_width_mm(&candidate, kind, font_size_pt);
            if w <= target_w {
                cur_line = candidate;
                continue;
            } else {
                lines.push(cur_line);
                cur_line = String::new();
                is_first = false;
            }
        }

        let target_w = if is_first { first_line_w } else { other_lines_w };
        let word_w = measure_text_width_mm(word, kind, font_size_pt);

        if word_w <= target_w {
            cur_line.push_str(word);
        } else {
            // Word is too long to fit on a line by itself: break it character by character.
            for ch in word.chars() {
                let current_target_w = if is_first { first_line_w } else { other_lines_w };
                if !cur_line.is_empty() {
                    let mut candidate = cur_line.clone();
                    candidate.push(ch);
                    if measure_text_width_mm(&candidate, kind, font_size_pt) > current_target_w {
                        lines.push(cur_line);
                        cur_line = String::new();
                        is_first = false;
                    }
                }
                cur_line.push(ch);
            }
        }
    }

    if !cur_line.is_empty() {
        lines.push(cur_line);
    }

    lines
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
    let (font_title, font_body, font_kind_title, font_kind_body) = if !is_novel || ff.contains("courier") || ff.contains("mono") {
        (
            PdfFontHandle::Builtin(BuiltinFont::CourierBold),
            PdfFontHandle::Builtin(BuiltinFont::Courier),
            FontKind::Courier,
            FontKind::Courier,
        )
    } else if ff.contains("sans") || ff.contains("helvetica") || ff.contains("inter") || ff.contains("outfit") {
        (
            PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
            PdfFontHandle::Builtin(BuiltinFont::Helvetica),
            FontKind::HelveticaBold,
            FontKind::Helvetica,
        )
    } else {
        (
            PdfFontHandle::Builtin(BuiltinFont::TimesBold),
            PdfFontHandle::Builtin(BuiltinFont::TimesRoman),
            FontKind::TimesBold,
            FontKind::TimesRoman,
        )
    };

    // Title centered vertically roughly at 60% of page height
    let title_y = page_h * 0.60;
    let title_text = if payload.title.trim().is_empty() {
        let is_en = payload.language.as_deref().map(|l| l.eq_ignore_ascii_case("en")).unwrap_or(false);
        if is_en { "UNTITLED".to_string() } else { "SENZA TITOLO".to_string() }
    } else {
        payload.title.to_uppercase()
    };

    let title_font_pt = 22.0;
    let title_w = measure_text_width_mm(&title_text, font_kind_title, title_font_pt);
    let title_x = ((page_w - title_w) / 2.0).max(0.0);

    ops.push(Op::StartTextSection);
    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(title_x), Mm(title_y)),
    });
    ops.push(Op::SetFont {
        font: font_title,
        size: Pt(title_font_pt),
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
            let is_en = payload
                .language
                .as_deref()
                .map(|l| l.eq_ignore_ascii_case("en"))
                .unwrap_or(false);
            let by_text = if is_novel {
                if is_en { format!("by {}", author) } else { format!("di {}", author) }
            } else {
                if is_en { format!("written by\n\n{}", author) } else { format!("scritto da\n\n{}", author) }
            };

            let mut cur_y = by_y;
            for line in by_text.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let author_font_pt = 12.0;
                    let w = measure_text_width_mm(trimmed, font_kind_body, author_font_pt);
                    let author_x = ((page_w - w) / 2.0).max(0.0);
                    ops.push(Op::StartTextSection);
                    ops.push(Op::SetTextCursor {
                        pos: Point::new(Mm(author_x), Mm(cur_y)),
                    });
                    ops.push(Op::SetFont {
                        font: font_body.clone(),
                        size: Pt(author_font_pt),
                    });
                    ops.push(Op::ShowText {
                        items: vec![TextItem::Text(trimmed.to_string())],
                    });
                    ops.push(Op::EndTextSection);
                }
                cur_y -= 6.0;
            }
        }

    // Contact
    if let Some(ref contact) = payload.contact
        && !contact.trim().is_empty() {
            let mut cur_y = 45.0; // 45mm from bottom
            for line in contact.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let contact_font_pt = 10.0;
                    let contact_x = if is_novel {
                        let w = measure_text_width_mm(trimmed, font_kind_body, contact_font_pt);
                        ((page_w - w) / 2.0).max(0.0)
                    } else {
                        25.4 // standard screenplay: bottom-left
                    };
                    ops.push(Op::StartTextSection);
                    ops.push(Op::SetTextCursor {
                        pos: Point::new(Mm(contact_x), Mm(cur_y)),
                    });
                    ops.push(Op::SetFont {
                        font: font_body.clone(),
                        size: Pt(contact_font_pt),
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

pub fn is_section_scene(scene: &SceneDoc) -> bool {
    if scene.r#type == "section_heading" || scene.r#type == "part_heading" {
        return true;
    }
    let mut has_text = false;
    for node in &scene.content {
        let text = node.text_content();
        if text.trim().is_empty() {
            continue;
        }
        has_text = true;
        let t = node.r#type.as_deref().unwrap_or("");
        let is_part = t == "part_heading"
            || node
                .attrs
                .as_ref()
                .and_then(|a| a.get("is_part"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
        let is_sec = t == "section_heading"
            || node
                .attrs
                .as_ref()
                .and_then(|a| a.get("is_section"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
        if !is_part && !is_sec {
            return false;
        }
    }
    has_text
}

fn add_page_footer(
    ops: &mut Vec<Op>,
    page_num: usize,
    page_w: f32,
    font: PdfFontHandle,
    font_kind: FontKind,
) {
    ops.push(Op::StartTextSection);
    let num_str = format!("{}", page_num);
    let text_w = measure_text_width_mm(&num_str, font_kind, 10.0);
    let footer_x = (page_w - text_w) / 2.0;
    let footer_y = 12.7;
    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(footer_x), Mm(footer_y)),
    });
    ops.push(Op::SetFont {
        font,
        size: Pt(10.0),
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
        items: vec![TextItem::Text(num_str)],
    });
    ops.push(Op::EndTextSection);
}

fn start_new_page(cur_ops: &mut Vec<Op>, cur_y: &mut f32, page_h: f32, top_margin: f32) {
    cur_ops.push(Op::SaveGraphicsState);
    *cur_y = page_h - top_margin;
}

fn finish_current_page(
    cur_ops: &mut Vec<Op>,
    pdf_pages: &mut Vec<PdfPage>,
    page_w: f32,
    page_h: f32,
    is_cur_page_section: bool,
    show_page_numbers: bool,
    has_seen_scene: &mut bool,
    page_num_counter: &mut usize,
    font_num: &PdfFontHandle,
    font_kind: FontKind,
) {
    if !is_cur_page_section {
        *has_seen_scene = true;
        *page_num_counter += 1;
        if show_page_numbers {
            add_page_footer(cur_ops, *page_num_counter, page_w, font_num.clone(), font_kind);
        }
    } else if *has_seen_scene {
        *page_num_counter += 1;
    }
    cur_ops.push(Op::RestoreGraphicsState);
    pdf_pages.push(PdfPage::new(Mm(page_w), Mm(page_h), std::mem::take(cur_ops)));
}

fn render_screenplay_pages(
    payload: &PdfExportPayload,
    page_w: f32,
    page_h: f32,
) -> Vec<PdfPage> {
    if payload.scenes.is_empty() {
        return Vec::new();
    }

    let top_margin = MM_PER_INCH; // 1 inch = 25.4 mm
    let bottom_margin = MM_PER_INCH; // 1 inch
    let left_margin = 1.5 * MM_PER_INCH; // 1.5 inches = 38.1 mm
    let line_height_mm = 4.233; // 1/6th inch = 12pt line spacing

    let ff = payload.font_family.as_deref().unwrap_or("courier").to_lowercase();
    let (font_regular, font_bold, font_italic, font_kind_regular, font_kind_bold) = if ff.contains("sans") || ff.contains("helvetica") || ff.contains("inter") || ff.contains("outfit") {
        (
            PdfFontHandle::Builtin(BuiltinFont::Helvetica),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaOblique),
            FontKind::Helvetica,
            FontKind::HelveticaBold,
        )
    } else if ff.contains("times") || ff.contains("garamond") || ff.contains("serif") {
        (
            PdfFontHandle::Builtin(BuiltinFont::TimesRoman),
            PdfFontHandle::Builtin(BuiltinFont::TimesBold),
            PdfFontHandle::Builtin(BuiltinFont::TimesItalic),
            FontKind::TimesRoman,
            FontKind::TimesBold,
        )
    } else {
        (
            PdfFontHandle::Builtin(BuiltinFont::Courier),
            PdfFontHandle::Builtin(BuiltinFont::CourierBold),
            PdfFontHandle::Builtin(BuiltinFont::CourierOblique),
            FontKind::Courier,
            FontKind::Courier,
        )
    };

    let font_size = payload.font_size_pt.unwrap_or(12.0);

    let mut pdf_pages = Vec::new();
    let mut cur_ops: Vec<Op> = Vec::new();
    let mut cur_y = page_h - top_margin;
    let mut page_num_counter: usize = 0;
    let mut has_seen_scene = false;
    let mut cur_scene_is_section = false;

    let show_page_numbers = payload.page_numbers.unwrap_or(true);
    let font_num = font_regular.clone();

    start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);

    for (s_idx, scene) in payload.scenes.iter().enumerate() {
        let is_sec = is_section_scene(scene);

        // Scene break: each scene starts on a new page
        if s_idx > 0 {
            finish_current_page(
                &mut cur_ops,
                &mut pdf_pages,
                page_w,
                page_h,
                cur_scene_is_section,
                show_page_numbers,
                &mut has_seen_scene,
                &mut page_num_counter,
                &font_num,
                font_kind_regular,
            );
            start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
        }
        cur_scene_is_section = is_sec;

        if is_sec {
            cur_y = page_h * 0.52;
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

            // Add leading space before element (if not standalone section heading)
            if !is_sec {
                let min_lines = if el_type == "character" || el_type == "parenthetical" || el_type == "scene_heading" {
                    (lines.len() as f32).max(2.0)
                } else {
                    1.0
                };
                let needed_space = (extra_before_lines as f32 + min_lines) * line_height_mm;
                if cur_y - needed_space < bottom_margin {
                    finish_current_page(
                        &mut cur_ops,
                        &mut pdf_pages,
                        page_w,
                        page_h,
                        cur_scene_is_section,
                        show_page_numbers,
                        &mut has_seen_scene,
                        &mut page_num_counter,
                        &font_num,
                        font_kind_regular,
                    );
                    start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
                } else {
                    cur_y -= extra_before_lines as f32 * line_height_mm;
                }
            }

            let is_section_heading = el_type == "section_heading" || el_type == "heading";
            let default_elem_x = left_margin + (left_offset_in * MM_PER_INCH);

            for line in lines {
                if cur_y - line_height_mm < bottom_margin {
                    finish_current_page(
                        &mut cur_ops,
                        &mut pdf_pages,
                        page_w,
                        page_h,
                        cur_scene_is_section,
                        show_page_numbers,
                        &mut has_seen_scene,
                        &mut page_num_counter,
                        &font_num,
                        font_kind_regular,
                    );
                    start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
                }

                let x = if is_section_heading {
                    let text_w = measure_text_width_mm(&line, font_kind_bold, font_size);
                    ((page_w - text_w) / 2.0).max(0.0)
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
        finish_current_page(
            &mut cur_ops,
            &mut pdf_pages,
            page_w,
            page_h,
            cur_scene_is_section,
            show_page_numbers,
            &mut has_seen_scene,
            &mut page_num_counter,
            &font_num,
            font_kind_regular,
        );
    }

    pdf_pages
}

fn render_novel_pages(
    payload: &PdfExportPayload,
    page_w: f32,
    page_h: f32,
) -> Vec<PdfPage> {
    if payload.scenes.is_empty() {
        return Vec::new();
    }

    let top_margin = MM_PER_INCH;
    let bottom_margin = MM_PER_INCH;
    let left_margin = MM_PER_INCH;
    let right_margin = MM_PER_INCH;
    let printable_w = page_w - left_margin - right_margin;

    let font_size = payload.font_size_pt.unwrap_or(12.0);
    let line_height_mm = font_size * 0.3528 * 1.5; // 1.5 line height

    let ff = payload.font_family.as_deref().unwrap_or("serif").to_lowercase();
    let (font_regular, font_bold, font_italic, font_kind_regular, font_kind_bold) = if ff.contains("courier") || ff.contains("mono") {
        (
            PdfFontHandle::Builtin(BuiltinFont::Courier),
            PdfFontHandle::Builtin(BuiltinFont::CourierBold),
            PdfFontHandle::Builtin(BuiltinFont::CourierOblique),
            FontKind::Courier,
            FontKind::Courier,
        )
    } else if ff.contains("sans") || ff.contains("helvetica") || ff.contains("inter") || ff.contains("outfit") {
        (
            PdfFontHandle::Builtin(BuiltinFont::Helvetica),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
            PdfFontHandle::Builtin(BuiltinFont::HelveticaOblique),
            FontKind::Helvetica,
            FontKind::HelveticaBold,
        )
    } else {
        (
            PdfFontHandle::Builtin(BuiltinFont::TimesRoman),
            PdfFontHandle::Builtin(BuiltinFont::TimesBold),
            PdfFontHandle::Builtin(BuiltinFont::TimesItalic),
            FontKind::TimesRoman,
            FontKind::TimesBold,
        )
    };

    let mut pdf_pages = Vec::new();
    let mut cur_ops: Vec<Op> = Vec::new();
    let mut cur_y = page_h - top_margin;
    let mut page_num_counter: usize = 0;
    let mut has_seen_scene = false;
    let mut cur_scene_is_section = false;

    let show_page_numbers = payload.page_numbers.unwrap_or(true);
    let font_num = font_regular.clone();

    start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);

    for (s_idx, scene) in payload.scenes.iter().enumerate() {
        let is_sec = is_section_scene(scene);
        if s_idx > 0 {
            finish_current_page(
                &mut cur_ops,
                &mut pdf_pages,
                page_w,
                page_h,
                cur_scene_is_section,
                show_page_numbers,
                &mut has_seen_scene,
                &mut page_num_counter,
                &font_num,
                font_kind_regular,
            );
            start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
        }
        cur_scene_is_section = is_sec;

        for node in &scene.content {
            let el_type = node.r#type.as_deref().unwrap_or("paragraph");
            let text = node.text_content();
            if text.trim().is_empty() {
                continue;
            }

            let is_part = el_type == "part_heading"
                || node
                    .attrs
                    .as_ref()
                    .and_then(|a| a.get("is_part"))
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

            if is_part {
                let part_text = text.to_uppercase();
                let heading_font_pt = font_size + 6.0;
                let part_lines = wrap_paragraph(&part_text, printable_w, printable_w, font_kind_bold, heading_font_pt);

                // Position vertically in upper-middle of page (~52% height)
                cur_y = page_h * 0.52;

                for line in part_lines {
                    let text_w = measure_text_width_mm(&line, font_kind_bold, heading_font_pt);
                    let x = ((page_w - text_w) / 2.0).max(0.0);

                    cur_ops.push(Op::StartTextSection);
                    cur_ops.push(Op::SetTextCursor {
                        pos: Point::new(Mm(x), Mm(cur_y)),
                    });
                    cur_ops.push(Op::SetFont {
                        font: font_bold.clone(),
                        size: Pt(heading_font_pt),
                    });
                    cur_ops.push(Op::ShowText {
                        items: vec![TextItem::Text(line)],
                    });
                    cur_ops.push(Op::EndTextSection);

                    cur_y -= line_height_mm * 1.5;
                }
                continue;
            }

            let is_heading = el_type == "heading" || el_type == "section_heading";
            if is_heading {
                let heading_font_pt = font_size + 4.0;
                let heading_lines = wrap_paragraph(&text, printable_w, printable_w, font_kind_bold, heading_font_pt);
                let extra_top = line_height_mm * 1.8;

                if cur_y - (extra_top + (heading_lines.len() as f32 + 2.0) * line_height_mm) < bottom_margin {
                    finish_current_page(
                        &mut cur_ops,
                        &mut pdf_pages,
                        page_w,
                        page_h,
                        cur_scene_is_section,
                        show_page_numbers,
                        &mut has_seen_scene,
                        &mut page_num_counter,
                        &font_num,
                        font_kind_regular,
                    );
                    start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
                } else {
                    cur_y -= extra_top;
                }

                for line in heading_lines {
                    if cur_y - line_height_mm < bottom_margin {
                        finish_current_page(
                            &mut cur_ops,
                            &mut pdf_pages,
                            page_w,
                            page_h,
                            cur_scene_is_section,
                            show_page_numbers,
                            &mut has_seen_scene,
                            &mut page_num_counter,
                            &font_num,
                            font_kind_regular,
                        );
                        start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
                    }

                    let text_w = measure_text_width_mm(&line, font_kind_bold, heading_font_pt);
                    let x = ((page_w - text_w) / 2.0).max(0.0);

                    cur_ops.push(Op::StartTextSection);
                    cur_ops.push(Op::SetTextCursor {
                        pos: Point::new(Mm(x), Mm(cur_y)),
                    });
                    cur_ops.push(Op::SetFont {
                        font: font_bold.clone(),
                        size: Pt(heading_font_pt),
                    });
                    cur_ops.push(Op::ShowText {
                        items: vec![TextItem::Text(line)],
                    });
                    cur_ops.push(Op::EndTextSection);

                    cur_y -= line_height_mm;
                }
                cur_y -= line_height_mm * 0.5;
                continue;
            }

            let is_quote = el_type == "blockquote";
            let (font, font_kind, font_size_pt, first_line_w, other_lines_w, start_x_first, start_x_other) = if is_quote {
                let quote_w = printable_w - 25.4;
                (&font_italic, font_kind_regular, font_size, quote_w, quote_w, left_margin + 12.7, left_margin + 12.7)
            } else {
                let ind = if payload.indent.unwrap_or(true) { 10.0 } else { 0.0 };
                (&font_regular, font_kind_regular, font_size, printable_w - ind, printable_w, left_margin + ind, left_margin)
            };

            let justify = payload.justify.unwrap_or(true);

            for paragraph in text.lines() {
                let p_trimmed = paragraph.trim();
                if p_trimmed.is_empty() {
                    continue;
                }

                let p_lines = wrap_paragraph(p_trimmed, first_line_w, other_lines_w, font_kind, font_size_pt);
                if p_lines.is_empty() {
                    continue;
                }

                let extra_top = line_height_mm * 0.35;
                if cur_y - (extra_top + line_height_mm) < bottom_margin {
                    finish_current_page(
                        &mut cur_ops,
                        &mut pdf_pages,
                        page_w,
                        page_h,
                        cur_scene_is_section,
                        show_page_numbers,
                        &mut has_seen_scene,
                        &mut page_num_counter,
                        &font_num,
                        font_kind_regular,
                    );
                    start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
                } else {
                    cur_y -= extra_top;
                }

                let total_p_lines = p_lines.len();
                for (line_idx, line) in p_lines.into_iter().enumerate() {
                    if cur_y - line_height_mm < bottom_margin {
                        finish_current_page(
                            &mut cur_ops,
                            &mut pdf_pages,
                            page_w,
                            page_h,
                            cur_scene_is_section,
                            show_page_numbers,
                            &mut has_seen_scene,
                            &mut page_num_counter,
                            &font_num,
                            font_kind_regular,
                        );
                        start_new_page(&mut cur_ops, &mut cur_y, page_h, top_margin);
                    }

                    let is_first_line = line_idx == 0;
                    let is_last_line = line_idx + 1 == total_p_lines;
                    let line_target_w = if is_first_line { first_line_w } else { other_lines_w };
                    let line_x = if is_first_line { start_x_first } else { start_x_other };

                    let num_spaces = line.chars().filter(|c| *c == ' ').count();
                    let natural_w = measure_text_width_mm(&line, font_kind, font_size_pt);
                    let should_justify = justify && !is_last_line && num_spaces > 0 && natural_w < line_target_w;

                    let extra_pt = if should_justify {
                        let extra_mm = line_target_w - natural_w;
                        let per_space_mm = extra_mm / (num_spaces as f32);
                        let pt = per_space_mm * (72.0 / 25.4);
                        if pt <= 12.0 {
                            pt
                        } else {
                            0.0
                        }
                    } else {
                        0.0
                    };

                    cur_ops.push(Op::StartTextSection);
                    cur_ops.push(Op::SetTextCursor {
                        pos: Point::new(Mm(line_x), Mm(cur_y)),
                    });
                    cur_ops.push(Op::SetFont {
                        font: font.clone(),
                        size: Pt(font_size_pt),
                    });
                    if extra_pt > 0.001 {
                        cur_ops.push(Op::SetWordSpacing { pt: Pt(extra_pt) });
                    }
                    cur_ops.push(Op::ShowText {
                        items: vec![TextItem::Text(line)],
                    });
                    if extra_pt > 0.001 {
                        cur_ops.push(Op::SetWordSpacing { pt: Pt(0.0) });
                    }
                    cur_ops.push(Op::EndTextSection);

                    cur_y -= line_height_mm;
                }
            }
        }
    }

    if !cur_ops.is_empty() {
        finish_current_page(
            &mut cur_ops,
            &mut pdf_pages,
            page_w,
            page_h,
            cur_scene_is_section,
            show_page_numbers,
            &mut has_seen_scene,
            &mut page_num_counter,
            &font_num,
            font_kind_regular,
        );
    }

    pdf_pages
}

fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    let max_chars = max_chars.max(1);
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
            if !cur_line.is_empty() {
                if cur_chars + 1 + w_chars <= max_chars {
                    cur_line.push(' ');
                    cur_line.push_str(word);
                    cur_chars += 1 + w_chars;
                    continue;
                } else {
                    lines.push(cur_line);
                    cur_line = String::new();
                    cur_chars = 0;
                }
            }

            if w_chars <= max_chars {
                cur_line.push_str(word);
                cur_chars = w_chars;
            } else {
                for ch in word.chars() {
                    if cur_chars >= max_chars && !cur_line.is_empty() {
                        lines.push(cur_line);
                        cur_line = String::new();
                        cur_chars = 0;
                    }
                    cur_line.push(ch);
                    cur_chars += 1;
                }
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
            language: None,
            font_family: None,
            font_size_pt: None,
            justify: None,
            indent: None,
            has_title_page: None,
            page_numbers: None,
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
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: Some(true),
            indent: Some(true),
            has_title_page: None,
            page_numbers: None,
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
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(false),
            page_numbers: None,
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

    #[test]
    fn test_generate_pdf_screenplay_multi_scene_breaks_page() {
        let payload = PdfExportPayload {
            title: "Screenplay Multi".to_string(),
            mode: "screenplay".to_string(),
            author: None,
            contact: None,
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(false),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("scene_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("INT. PRIMA - GIORNO".to_string()),
                        },
                        JsonContent {
                            r#type: Some("action".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Prima scena corta.".to_string()),
                        },
                    ],
                },
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("scene_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("EXT. SECONDA - NOTTE".to_string()),
                        },
                        JsonContent {
                            r#type: Some("action".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Seconda scena su nuova pagina.".to_string()),
                        },
                    ],
                },
            ],
        };

        let pages = render_screenplay_pages(&payload, 215.9, 279.4);
        assert_eq!(pages.len(), 2, "Expected 2 pages for 2 scenes in screenplay mode");
    }

    #[test]
    fn test_generate_pdf_novel_multi_scene_breaks_page() {
        let payload = PdfExportPayload {
            title: "Novel Multi".to_string(),
            mode: "novel".to_string(),
            author: None,
            contact: None,
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(false),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("paragraph".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Paragrafo scena 1.".to_string()),
                        },
                    ],
                },
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("paragraph".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Paragrafo scena 2.".to_string()),
                        },
                    ],
                },
            ],
        };

        let pages = render_novel_pages(&payload, 215.9, 279.4);
        assert_eq!(pages.len(), 2, "Expected 2 pages for 2 scenes in novel mode");
    }

    #[test]
    fn test_page_number_footer_on_content_pages_and_not_title_page() {
        let payload = PdfExportPayload {
            title: "Test Project".to_string(),
            mode: "screenplay".to_string(),
            author: Some("Author".to_string()),
            contact: Some("contact@example.com".to_string()),
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(true),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("scene_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("INT. ROOM - DAY".to_string()),
                        },
                    ],
                },
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("scene_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("EXT. STREET - NIGHT".to_string()),
                        },
                    ],
                },
            ],
        };

        let title_ops = render_title_page(&payload, 215.9, 279.4, false);
        let title_has_page_num = title_ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1" || t == "2",
                _ => false,
            }),
            _ => false,
        });
        assert!(!title_has_page_num, "Title page must not have a page number footer");

        let screenplay_pages = render_screenplay_pages(&payload, 215.9, 279.4);
        assert_eq!(screenplay_pages.len(), 2);

        let p1_has_1 = screenplay_pages[0].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1",
                _ => false,
            }),
            _ => false,
        });
        let p2_has_2 = screenplay_pages[1].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "2",
                _ => false,
            }),
            _ => false,
        });
        assert!(p1_has_1, "Screenplay page 1 must have page number footer '1'");
        assert!(p2_has_2, "Screenplay page 2 must have page number footer '2'");

        let novel_pages = render_novel_pages(&payload, 215.9, 279.4);
        assert_eq!(novel_pages.len(), 2);

        let novel_p1_has_1 = novel_pages[0].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1",
                _ => false,
            }),
            _ => false,
        });
        let novel_p2_has_2 = novel_pages[1].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "2",
                _ => false,
            }),
            _ => false,
        });
        assert!(novel_p1_has_1, "Novel page 1 must have page number footer '1'");
        assert!(novel_p2_has_2, "Novel page 2 must have page number footer '2'");
    }

    #[test]
    fn test_novel_part_heading_on_single_page_followed_by_chapter() {
        let payload = PdfExportPayload {
            title: "Il Romanzo".to_string(),
            mode: "novel".to_string(),
            author: Some("Autore".to_string()),
            contact: None,
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(true),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("part_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Parte prima".to_string()),
                        },
                    ],
                },
                SceneDoc {
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
                            text: Some("Il testo del capitolo inizia qui.".to_string()),
                        },
                    ],
                },
            ],
        };

        // Title page = 1 page, Novel content = 2 pages (Part on page 1, Chapter on page 2)
        let novel_pages = render_novel_pages(&payload, 215.9, 279.4);
        assert_eq!(novel_pages.len(), 2, "Part heading and chapter must be on separate pages");

        let p1_has_part = novel_pages[0].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t.contains("PARTE PRIMA"),
                _ => false,
            }),
            _ => false,
        });
        let p2_has_chapter = novel_pages[1].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t.contains("Capitolo 1"),
                _ => false,
            }),
            _ => false,
        });
        assert!(p1_has_part, "Page 1 must contain the part heading");
        assert!(p2_has_chapter, "Page 2 must contain the chapter heading");

        let p1_has_page_num = novel_pages[0].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1" || t == "2",
                _ => false,
            }),
            _ => false,
        });
        assert!(!p1_has_page_num, "Part heading page must NOT have a page number footer");

        let p2_has_page_1 = novel_pages[1].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1",
                _ => false,
            }),
            _ => false,
        });
        assert!(p2_has_page_1, "Chapter page following the part heading must start with page number footer '1'");
    }

    #[test]
    fn test_screenplay_page_numbers_start_from_scene_not_section() {
        let payload = PdfExportPayload {
            title: "Il Copione".to_string(),
            mode: "screenplay".to_string(),
            author: Some("Sceneggiatore".to_string()),
            contact: None,
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(true),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("section_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("ATTO I".to_string()),
                        },
                    ],
                },
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("scene_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("INT. SALA - GIORNO".to_string()),
                        },
                        JsonContent {
                            r#type: Some("action".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Marco entra e si siede.".to_string()),
                        },
                    ],
                },
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("scene_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("EXT. GIARDINO - NOTTE".to_string()),
                        },
                    ],
                },
            ],
        };

        let sp_pages = render_screenplay_pages(&payload, 215.9, 279.4);
        assert_eq!(sp_pages.len(), 3, "Screenplay must have 3 content pages (Section, Scene 1, Scene 2)");

        let p1_has_num = sp_pages[0].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1" || t == "2" || t == "3",
                _ => false,
            }),
            _ => false,
        });
        assert!(!p1_has_num, "Screenplay section heading page must NOT have a page number footer");

        let p2_has_1 = sp_pages[1].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1",
                _ => false,
            }),
            _ => false,
        });
        assert!(p2_has_1, "First scene must start with page number footer '1'");

        let p3_has_2 = sp_pages[2].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "2",
                _ => false,
            }),
            _ => false,
        });
        assert!(p3_has_2, "Second scene must have page number footer '2'");
    }

    #[test]
    fn test_default_title_page_generated_for_default_title() {
        let payload = PdfExportPayload {
            title: "Senza titolo".to_string(),
            mode: "novel".to_string(),
            author: None,
            contact: None,
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: None, // should default to true!
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("paragraph".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Testo del libro.".to_string()),
                        },
                    ],
                },
            ],
        };

        let bytes = generate_pdf(&payload).expect("Failed to generate PDF with default title");
        assert!(!bytes.is_empty());
    }

    #[test]
    fn test_pdf_export_page_numbers_disabled() {
        let payload = PdfExportPayload {
            title: "No Page Numbers".to_string(),
            mode: "novel".to_string(),
            author: None,
            contact: None,
            language: None,
            font_family: None,
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(false),
            page_numbers: Some(false),
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("paragraph".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Testo senza numerazione di pagina.".to_string()),
                        },
                    ],
                },
            ],
        };

        let pages = render_novel_pages(&payload, 215.9, 279.4);
        assert_eq!(pages.len(), 1);

        let has_num_1 = pages[0].ops.iter().any(|op| match op {
            Op::ShowText { items } => items.iter().any(|item| match item {
                TextItem::Text(t) => t == "1",
                _ => false,
            }),
            _ => false,
        });
        assert!(!has_num_1, "Page must not have page number footer when page_numbers is false");
    }

    #[test]
    fn test_title_page_centering_novel_and_screenplay() {
        let payload_novel = PdfExportPayload {
            title: "Il Grande Viaggio".to_string(),
            mode: "novel".to_string(),
            author: Some("Mario Rossi".to_string()),
            contact: Some("mario@example.com".to_string()),
            language: None,
            font_family: Some("serif".to_string()),
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(true),
            page_numbers: None,
            page_size: Some("a4".to_string()),
            scenes: vec![],
        };

        let page_w = 210.0;
        let page_h = 297.0;
        let title_ops = render_title_page(&payload_novel, page_w, page_h, true);

        let title_w = measure_text_width_mm("IL GRANDE VIAGGIO", FontKind::TimesBold, 22.0);
        let expected_title_x = (page_w - title_w) / 2.0;

        let author_w = measure_text_width_mm("di Mario Rossi", FontKind::TimesRoman, 12.0);
        let expected_author_x = (page_w - author_w) / 2.0;

        let contact_w = measure_text_width_mm("mario@example.com", FontKind::TimesRoman, 10.0);
        let expected_contact_x = (page_w - contact_w) / 2.0;

        let mut found_title_x = None;
        let mut found_author_x = None;
        let mut found_contact_x = None;

        let mut last_cursor_x_mm = None;
        for op in &title_ops {
            match op {
                Op::SetTextCursor { pos } => {
                    last_cursor_x_mm = Some(pos.x.0 * (25.4 / 72.0));
                }
                Op::ShowText { items } => {
                    for item in items {
                        if let TextItem::Text(t) = item {
                            if t.contains("IL GRANDE VIAGGIO") {
                                found_title_x = last_cursor_x_mm;
                            } else if t.contains("di Mario Rossi") {
                                found_author_x = last_cursor_x_mm;
                            } else if t.contains("mario@example.com") {
                                found_contact_x = last_cursor_x_mm;
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        assert!(found_title_x.is_some(), "Title cursor must be found");
        assert!(found_author_x.is_some(), "Author cursor must be found");
        assert!(found_contact_x.is_some(), "Contact cursor must be found");

        let t_x = found_title_x.unwrap();
        let a_x = found_author_x.unwrap();
        let c_x = found_contact_x.unwrap();

        assert!((t_x - expected_title_x).abs() < 0.1, "Novel title must be centered: got {}, expected {}", t_x, expected_title_x);
        assert!((a_x - expected_author_x).abs() < 0.1, "Novel author must be centered: got {}, expected {}", a_x, expected_author_x);
        assert!((c_x - expected_contact_x).abs() < 0.1, "Novel contact must be centered: got {}, expected {}", c_x, expected_contact_x);

        // Screenplay title page centering
        let payload_screenplay = PdfExportPayload {
            title: "Il Copione Perfetto".to_string(),
            mode: "screenplay".to_string(),
            author: Some("Jane Doe".to_string()),
            contact: Some("jane@example.com".to_string()),
            language: None,
            font_family: Some("courier".to_string()),
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(true),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![],
        };

        let sp_w = 215.9;
        let sp_h = 279.4;
        let sp_title_ops = render_title_page(&payload_screenplay, sp_w, sp_h, false);

        let sp_title_w = measure_text_width_mm("IL COPIONE PERFETTO", FontKind::Courier, 22.0);
        let expected_sp_title_x = (sp_w - sp_title_w) / 2.0;

        let sp_author_w = measure_text_width_mm("Jane Doe", FontKind::Courier, 12.0);
        let expected_sp_author_x = (sp_w - sp_author_w) / 2.0;

        let mut found_sp_title_x = None;
        let mut found_sp_author_x = None;

        let mut last_sp_cursor_x_mm = None;
        for op in &sp_title_ops {
            match op {
                Op::SetTextCursor { pos } => {
                    last_sp_cursor_x_mm = Some(pos.x.0 * (25.4 / 72.0));
                }
                Op::ShowText { items } => {
                    for item in items {
                        if let TextItem::Text(t) = item {
                            if t.contains("IL COPIONE PERFETTO") {
                                found_sp_title_x = last_sp_cursor_x_mm;
                            } else if t.contains("Jane Doe") {
                                found_sp_author_x = last_sp_cursor_x_mm;
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        assert!(found_sp_title_x.is_some(), "Screenplay title must be found");
        assert!(found_sp_author_x.is_some(), "Screenplay author must be found");
        let sp_t_x = found_sp_title_x.unwrap();
        let sp_a_x = found_sp_author_x.unwrap();
        assert!((sp_t_x - expected_sp_title_x).abs() < 0.1, "Screenplay title must be centered: got {}, expected {}", sp_t_x, expected_sp_title_x);
        assert!((sp_a_x - expected_sp_author_x).abs() < 0.1, "Screenplay author must be centered: got {}, expected {}", sp_a_x, expected_sp_author_x);
    }

    #[test]
    fn test_novel_headings_and_part_centering() {
        let payload = PdfExportPayload {
            title: "Romanzo".to_string(),
            mode: "novel".to_string(),
            author: None,
            contact: None,
            language: None,
            font_family: Some("serif".to_string()),
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(false),
            page_numbers: None,
            page_size: Some("a4".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("part_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("Parte prima".to_string()),
                        },
                    ],
                },
                SceneDoc {
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
                            text: Some("Testo del capitolo.".to_string()),
                        },
                    ],
                },
            ],
        };

        let page_w = 210.0;
        let pages = render_novel_pages(&payload, page_w, 297.0);
        assert_eq!(pages.len(), 2);

        // Page 1: "PARTE PRIMA"
        let part_w = measure_text_width_mm("PARTE PRIMA", FontKind::TimesBold, 18.0);
        let expected_part_x = (page_w - part_w) / 2.0;

        let mut found_part_x = None;
        let mut last_p0_cursor_x_mm = None;
        for op in &pages[0].ops {
            match op {
                Op::SetTextCursor { pos } => {
                    last_p0_cursor_x_mm = Some(pos.x.0 * (25.4 / 72.0));
                }
                Op::ShowText { items } => {
                    for item in items {
                        if let TextItem::Text(t) = item {
                            if t.contains("PARTE PRIMA") {
                                found_part_x = last_p0_cursor_x_mm;
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        assert!(found_part_x.is_some(), "Part heading must be found");
        let px = found_part_x.unwrap();
        assert!((px - expected_part_x).abs() < 0.1, "Part heading must be centered: got {}, expected {}", px, expected_part_x);

        // Page 2: "Capitolo 1"
        let chap_w = measure_text_width_mm("Capitolo 1", FontKind::TimesBold, 16.0);
        let expected_chap_x = (page_w - chap_w) / 2.0;

        let mut found_chap_x = None;
        let mut last_p1_cursor_x_mm = None;
        for op in &pages[1].ops {
            match op {
                Op::SetTextCursor { pos } => {
                    last_p1_cursor_x_mm = Some(pos.x.0 * (25.4 / 72.0));
                }
                Op::ShowText { items } => {
                    for item in items {
                        if let TextItem::Text(t) = item {
                            if t.contains("Capitolo 1") {
                                found_chap_x = last_p1_cursor_x_mm;
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        assert!(found_chap_x.is_some(), "Chapter heading must be found");
        let cx = found_chap_x.unwrap();
        assert!((cx - expected_chap_x).abs() < 0.1, "Chapter heading must be centered: got {}, expected {}", cx, expected_chap_x);
    }

    #[test]
    fn test_screenplay_section_heading_centering() {
        let payload = PdfExportPayload {
            title: "Screenplay Section".to_string(),
            mode: "screenplay".to_string(),
            author: None,
            contact: None,
            language: None,
            font_family: Some("courier".to_string()),
            font_size_pt: Some(12.0),
            justify: None,
            indent: None,
            has_title_page: Some(false),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("section_heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("ATTO I".to_string()),
                        },
                    ],
                },
            ],
        };

        let page_w = 215.9;
        let pages = render_screenplay_pages(&payload, page_w, 279.4);
        assert_eq!(pages.len(), 1);

        let sec_w = measure_text_width_mm("ATTO I", FontKind::Courier, 12.0);
        let expected_sec_x = (page_w - sec_w) / 2.0;

        let mut found_sec_x = None;
        let mut last_sp_sec_cursor_x_mm = None;
        for op in &pages[0].ops {
            match op {
                Op::SetTextCursor { pos } => {
                    last_sp_sec_cursor_x_mm = Some(pos.x.0 * (25.4 / 72.0));
                }
                Op::ShowText { items } => {
                    for item in items {
                        if let TextItem::Text(t) = item {
                            if t.contains("ATTO I") {
                                found_sec_x = last_sp_sec_cursor_x_mm;
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        assert!(found_sec_x.is_some(), "Screenplay section heading must be found");
        let sx = found_sec_x.unwrap();
        assert!((sx - expected_sec_x).abs() < 0.1, "Screenplay section heading must be centered: got {}, expected {}", sx, expected_sec_x);
    }

    #[test]
    fn test_novel_body_justification_word_spacing() {
        let long_para = "Questo è un paragrafo lungo che deve necessariamente estendersi su più righe per verificare la giustificazione del testo nel file PDF esportato da OpenFolio. Ogni riga precedente all'ultima deve presentare uno spaziamento espanso per riempire l'intera larghezza della pagina stampabile.";

        let payload_justified = PdfExportPayload {
            title: "Giustificato".to_string(),
            mode: "novel".to_string(),
            author: None,
            contact: None,
            language: None,
            font_family: Some("serif".to_string()),
            font_size_pt: Some(12.0),
            justify: Some(true),
            indent: Some(true),
            has_title_page: Some(false),
            page_numbers: None,
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("paragraph".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some(long_para.to_string()),
                        },
                    ],
                },
            ],
        };

        let pages_justified = render_novel_pages(&payload_justified, 215.9, 279.4);
        assert_eq!(pages_justified.len(), 1);

        // Find SetWordSpacing operations with pt > 0.001
        let has_word_spacing = pages_justified[0].ops.iter().any(|op| match op {
            Op::SetWordSpacing { pt } => pt.0 > 0.001,
            _ => false,
        });
        assert!(has_word_spacing, "Justified novel text must emit SetWordSpacing with pt > 0");

        // When justify is explicitly false, no positive SetWordSpacing should be emitted
        let mut payload_ragged = payload_justified.clone();
        payload_ragged.justify = Some(false);
        let pages_ragged = render_novel_pages(&payload_ragged, 215.9, 279.4);
        let has_ragged_spacing = pages_ragged[0].ops.iter().any(|op| match op {
            Op::SetWordSpacing { pt } => pt.0 > 0.001,
            _ => false,
        });
        assert!(!has_ragged_spacing, "Ragged novel text must NOT emit positive SetWordSpacing");
    }

    #[test]
    fn test_wrap_paragraph_breaks_unbroken_long_words() {
        // A single very long string without spaces (similar to user report)
        let long_word = "sdfadfadfasdfasdfasdlfsalfasdlfasdlfbdslahfbalsfbalsdhfbalsjdhbfalsjhbfasljdhfblasjdbflasjdbfljsdabflsjdahflfsadjhfasdljhfasdlhfsdasdlhbfsdajlhbdsdljahbfsdhsahfsdhbflasjdbbfljasdhbflasjdhfbsadylhsfaljdfbalsdjhfbdflasjdbflasjdbfasjhbdffjlashbdfjlashbdbfljashbdbfylahsbflsahfljbbfajlhsffajhshfjas";
        let target_w = 100.0; // 100 mm
        let lines = wrap_paragraph(long_word, target_w, target_w, FontKind::TimesRoman, 12.0);

        // Must be broken into multiple lines
        assert!(lines.len() > 1, "Expected long unbroken word to wrap across multiple lines, got {}", lines.len());

        // Every line must fit within target_w
        for (i, line) in lines.iter().enumerate() {
            let w = measure_text_width_mm(line, FontKind::TimesRoman, 12.0);
            assert!(
                w <= target_w + 0.1,
                "Line {} ('{}') width ({:.2}mm) exceeds target ({:.2}mm)",
                i,
                line,
                w,
                target_w
            );
        }

        // Concatenating all lines must restore the original string
        let reconstructed = lines.concat();
        assert_eq!(reconstructed, long_word);
    }

    #[test]
    fn test_wrap_text_breaks_unbroken_long_words() {
        let long_word = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let max_chars = 20;
        let lines = wrap_text(long_word, max_chars);

        assert_eq!(lines.len(), 4);
        assert_eq!(lines[0].len(), 20);
        assert_eq!(lines[1].len(), 20);
        assert_eq!(lines[2].len(), 20);
        assert_eq!(lines[3].len(), 2);
        assert_eq!(lines.concat(), long_word);
    }

    #[test]
    fn test_generate_pdf_with_unbroken_long_word() {
        let long_word = "sdfadfadfasdfasdfasdlfsalfasdlfasdlfbdslahfbalsfbalsdhfbalsjdhbfalsjhbfasljdhfblasjdbflasjdbfljsdabflsjdahflfsadjhfasdljhfasdlhfsdasdlhbfsdajlhbdsdljahbfsdhsahfsdhbflasjdbbfljasdhb";
        let payload = PdfExportPayload {
            title: "Test Long Word".to_string(),
            mode: "novel".to_string(),
            author: None,
            contact: None,
            language: Some("it".to_string()),
            font_family: Some("serif".to_string()),
            font_size_pt: Some(12.0),
            justify: Some(true),
            indent: Some(true),
            has_title_page: Some(false),
            page_numbers: Some(true),
            page_size: Some("letter".to_string()),
            scenes: vec![
                SceneDoc {
                    r#type: "doc".to_string(),
                    content: vec![
                        JsonContent {
                            r#type: Some("heading".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some("CAPITOLO 1".to_string()),
                        },
                        JsonContent {
                            r#type: Some("paragraph".to_string()),
                            attrs: None,
                            content: None,
                            marks: None,
                            text: Some(long_word.to_string()),
                        },
                    ],
                },
            ],
        };

        let result = generate_pdf(&payload);
        assert!(result.is_ok(), "PDF generation must succeed with unbroken long word");
        let bytes = result.unwrap();
        assert!(!bytes.is_empty(), "PDF bytes must not be empty");
    }
}

