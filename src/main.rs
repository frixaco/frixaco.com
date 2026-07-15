use std::{
    fs,
    io::{self, BufRead, BufReader, Write},
    net::{TcpListener, TcpStream},
    path::Path,
    thread,
};

use flate2::{Compression, write::GzEncoder};

fn main() {
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080u16);

    let addr = format!("0.0.0.0:{port}");
    let listener = TcpListener::bind(&addr).unwrap();
    println!("Listening on http://{addr}");

    for stream in listener.incoming().flatten() {
        thread::spawn(|| handle_client(stream));
    }
}

fn handle_client(mut stream: TcpStream) {
    let mut reader = BufReader::new(&stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).is_err() {
        return;
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next();
    let path = parts.next();
    if method != Some("GET") || path.is_none() {
        send_response(&mut stream, 405, "text/plain", "Method not allowed", false);
        return;
    }

    let path = path.unwrap().to_owned();
    let mut accept_encoding = String::new();
    let mut header_bytes = request_line.len();
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) | Err(_) => return,
            Ok(read) => header_bytes += read,
        }

        if header_bytes > MAX_REQUEST_HEADER_BYTES {
            drop(reader);
            send_response(
                &mut stream,
                431,
                "text/plain",
                "Request headers too large",
                false,
            );
            return;
        }
        if line == "\r\n" || line == "\n" {
            break;
        }

        let Some((name, value)) = line.split_once(':') else {
            continue;
        };
        if name.eq_ignore_ascii_case("accept-encoding") {
            if !accept_encoding.is_empty() {
                accept_encoding.push(',');
            }
            accept_encoding.push_str(value.trim());
        }
    }

    drop(reader);
    route(&mut stream, &path, accepts_gzip(&accept_encoding));
}

fn route(stream: &mut TcpStream, path: &str, accepts_gzip: bool) {
    match path {
        "/" | "/home" => {
            let md = read_file("src/sheets/home.md");
            let html = markdown_to_html(&md);
            let page = render_page(
                &html,
                "Rustam Ashurmatov",
                "Software engineer — projects, blog and more.",
                "home",
            );
            send_response(stream, 200, "text/html; charset=utf-8", &page, accepts_gzip);
        }
        "/blog" => {
            let md = read_file("src/sheets/blog.md");
            let html = markdown_to_html(&md);
            let page = render_page(
                &html,
                "Blog — Rustam Ashurmatov",
                "Blog posts about software engineering, Rust, TUI libraries and more.",
                "blog",
            );
            send_response(stream, 200, "text/html; charset=utf-8", &page, accepts_gzip);
        }
        "/more" => {
            let md = read_file("src/sheets/more.md");
            let html = markdown_to_html(&md);
            let page = render_page(
                &html,
                "More — Rustam Ashurmatov",
                "Setup, gear, interests and other things about Rustam Ashurmatov.",
                "more",
            );
            send_response(stream, 200, "text/html; charset=utf-8", &page, accepts_gzip);
        }
        "/md/home" => {
            let md = read_file("src/sheets/home.md");
            let html = markdown_to_html(&md);
            send_response(stream, 200, "text/html; charset=utf-8", &html, accepts_gzip);
        }
        "/md/blog" => {
            let md = read_file("src/sheets/blog.md");
            let html = markdown_to_html(&md);
            send_response(stream, 200, "text/html; charset=utf-8", &html, accepts_gzip);
        }
        "/md/more" => {
            let md = read_file("src/sheets/more.md");
            let html = markdown_to_html(&md);
            send_response(stream, 200, "text/html; charset=utf-8", &html, accepts_gzip);
        }
        "/pdf" => {
            if let Ok(bytes) = fs::read("src/RESUME_SDE_RESUME_RUSTAM_ASHURMATOV.pdf") {
                send_response_bytes(stream, 200, "application/pdf", &bytes);
            } else {
                send_response(stream, 404, "text/plain", "Not found", accepts_gzip);
            }
        }
        _ => {
            if let Some(slug) = path.strip_prefix("/blog/") {
                let file_path = format!("src/sheets/posts/{slug}");
                if Path::new(&file_path).exists() {
                    let md = read_file(&file_path);
                    let html = markdown_to_html(&md);
                    let page = render_page(
                        &html,
                        "Blog — Rustam Ashurmatov",
                        "A blog post by Rustam Ashurmatov.",
                        "post",
                    );
                    send_response(stream, 200, "text/html; charset=utf-8", &page, accepts_gzip);
                } else {
                    send_response(
                        stream,
                        404,
                        "text/html; charset=utf-8",
                        &render_page(
                            "<p>Not found</p>",
                            "404 — Rustam Ashurmatov",
                            "Page not found.",
                            "page",
                        ),
                        accepts_gzip,
                    );
                }
            } else if let Some(slug) = path.strip_prefix("/md/blog/") {
                let file_path = format!("src/sheets/posts/{slug}");
                if Path::new(&file_path).exists() {
                    let md = read_file(&file_path);
                    let html = markdown_to_html(&md);
                    send_response(stream, 200, "text/html; charset=utf-8", &html, accepts_gzip);
                } else {
                    send_response(stream, 404, "text/plain", "Not found", accepts_gzip);
                }
            } else {
                send_response(
                    stream,
                    404,
                    "text/html; charset=utf-8",
                    &render_page(
                        "<p>Not found</p>",
                        "404 — Rustam Ashurmatov",
                        "Page not found.",
                        "page",
                    ),
                    accepts_gzip,
                );
            }
        }
    }
}

fn read_file(path: &str) -> String {
    fs::read_to_string(path).unwrap_or_else(|_| format!("<p>Failed to read: {path}</p>"))
}

fn strip_front_matter(content: &str) -> &str {
    if !content.starts_with("---") {
        return content;
    }
    if let Some(end) = content[3..].find("---") {
        &content[end + 6..]
    } else {
        content
    }
}

fn markdown_to_html(input: &str) -> String {
    let content = strip_front_matter(input);
    let parser = pulldown_cmark::Parser::new(content);
    let mut html = String::new();
    pulldown_cmark::html::push_html(&mut html, parser);
    html
}

fn render_page(content: &str, title: &str, description: &str, route: &str) -> String {
    let template = read_file("src/index.html");
    template
        .replace("<!--CONTENT-->", content)
        .replace("<!--PAGE_TITLE-->", title)
        .replace("<!--META_DESCRIPTION-->", description)
        .replace("<!--PAGE_ROUTE-->", route)
        .replace("<!--LAST_UPDATED-->", LAST_UPDATED)
}

const MAX_REQUEST_HEADER_BYTES: usize = 16 * 1024;
const MIN_GZIP_SIZE: usize = 1024;
const LAST_UPDATED: &str = env!("LAST_UPDATED");

fn send_response(
    stream: &mut TcpStream,
    status: u16,
    content_type: &str,
    body: &str,
    accepts_gzip: bool,
) {
    let body = body.as_bytes();
    let compressed = if accepts_gzip && body.len() >= MIN_GZIP_SIZE {
        gzip_body(body).ok()
    } else {
        None
    };
    let response_body = compressed.as_deref().unwrap_or(body);
    let content_encoding = if compressed.is_some() {
        "Content-Encoding: gzip\r\n"
    } else {
        ""
    };
    let headers = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {len}\r\n{content_encoding}Vary: Accept-Encoding\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n",
        reason = reason_phrase(status),
        len = response_body.len(),
    );
    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(response_body);
}

fn send_response_bytes(stream: &mut TcpStream, status: u16, content_type: &str, body: &[u8]) {
    let headers = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {len}\r\nCache-Control: public, max-age=3600\r\nConnection: close\r\n\r\n",
        reason = reason_phrase(status),
        len = body.len(),
    );
    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(body);
}

fn accepts_gzip(header: &str) -> bool {
    let mut wildcard = None;

    for item in header.split(',') {
        let mut parts = item.split(';');
        let coding = parts.next().unwrap_or("").trim();
        let mut quality = 1.0;

        for parameter in parts {
            let Some((name, value)) = parameter.split_once('=') else {
                continue;
            };
            if name.trim().eq_ignore_ascii_case("q") {
                quality = value
                    .trim()
                    .parse::<f32>()
                    .ok()
                    .filter(|quality| (0.0..=1.0).contains(quality))
                    .unwrap_or(0.0);
            }
        }

        let accepted = quality > 0.0;
        if coding.eq_ignore_ascii_case("gzip") {
            return accepted;
        }
        if coding == "*" {
            wildcard = Some(accepted);
        }
    }

    wildcard.unwrap_or(false)
}

fn gzip_body(body: &[u8]) -> io::Result<Vec<u8>> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(body)?;
    encoder.finish()
}

fn reason_phrase(status: u16) -> &'static str {
    match status {
        200 => "OK",
        404 => "Not Found",
        405 => "Method Not Allowed",
        431 => "Request Header Fields Too Large",
        _ => "Unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::accepts_gzip;

    #[test]
    fn negotiates_gzip() {
        for (header, expected) in [
            ("", false),
            ("br", false),
            ("gzip", true),
            ("GZip; q=0.5", true),
            ("gzip;q=0", false),
            ("*;q=1", true),
            ("*;q=1,gzip;q=0", false),
            ("gzip;q=invalid", false),
        ] {
            assert_eq!(accepts_gzip(header), expected, "{header}");
        }
    }
}
