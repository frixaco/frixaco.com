use std::{
    fs,
    io::{BufRead, BufReader, Write},
    net::{TcpListener, TcpStream},
    path::Path,
    thread,
};

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
    let mut line = String::new();
    if reader.read_line(&mut line).is_err() {
        return;
    }

    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 2 || parts[0] != "GET" {
        send_response(&mut stream, 405, "text/plain", "Method not allowed");
        return;
    }

    let path = parts[1];
    route(&mut stream, path);
}

fn route(stream: &mut TcpStream, path: &str) {
    let template_path = "src/index.html";

    match path {
        "/" | "/home" => {
            let md = read_file("src/sheets/home.md");
            let html = markdown_to_html(&md);
            let page = render_page(
                template_path,
                &html,
                "Rustam Ashurmatov",
                "Software engineer — projects, blog and more.",
            );
            send_response(stream, 200, "text/html; charset=utf-8", &page);
        }
        "/blog" => {
            let md = read_file("src/sheets/blog.md");
            let html = markdown_to_html(&md);
            let page = render_page(
                template_path,
                &html,
                "Blog — Rustam Ashurmatov",
                "Blog posts about software engineering, Rust, TUI libraries and more.",
            );
            send_response(stream, 200, "text/html; charset=utf-8", &page);
        }
        "/more" => {
            let md = read_file("src/sheets/more.md");
            let html = markdown_to_html(&md);
            let page = render_page(
                template_path,
                &html,
                "More — Rustam Ashurmatov",
                "Setup, gear, interests and other things about Rustam Ashurmatov.",
            );
            send_response(stream, 200, "text/html; charset=utf-8", &page);
        }
        "/md/home" => {
            let md = read_file("src/sheets/home.md");
            let html = markdown_to_html(&md);
            send_response(stream, 200, "text/html; charset=utf-8", &html);
        }
        "/md/blog" => {
            let md = read_file("src/sheets/blog.md");
            let html = markdown_to_html(&md);
            send_response(stream, 200, "text/html; charset=utf-8", &html);
        }
        "/md/more" => {
            let md = read_file("src/sheets/more.md");
            let html = markdown_to_html(&md);
            send_response(stream, 200, "text/html; charset=utf-8", &html);
        }
        "/pdf" => {
            if let Ok(bytes) = fs::read("src/RESUME_SDE_RESUME_RUSTAM_ASHURMATOV.pdf") {
                send_response_bytes(stream, 200, "application/pdf", &bytes);
            } else {
                send_response(stream, 404, "text/plain", "Not found");
            }
        }
        _ => {
            if let Some(slug) = path.strip_prefix("/blog/") {
                let file_path = format!("src/sheets/posts/{slug}");
                if Path::new(&file_path).exists() {
                    let md = read_file(&file_path);
                    let html = markdown_to_html(&md);
                    let page = render_page(
                        template_path,
                        &html,
                        "Blog — Rustam Ashurmatov",
                        "A blog post by Rustam Ashurmatov.",
                    );
                    send_response(stream, 200, "text/html; charset=utf-8", &page);
                } else {
                    send_response(
                        stream,
                        404,
                        "text/html; charset=utf-8",
                        &render_page(
                            template_path,
                            "<p>Not found</p>",
                            "404 — Rustam Ashurmatov",
                            "Page not found.",
                        ),
                    );
                }
            } else if let Some(slug) = path.strip_prefix("/md/blog/") {
                let file_path = format!("src/sheets/posts/{slug}");
                if Path::new(&file_path).exists() {
                    let md = read_file(&file_path);
                    let html = markdown_to_html(&md);
                    send_response(stream, 200, "text/html; charset=utf-8", &html);
                } else {
                    send_response(stream, 404, "text/plain", "Not found");
                }
            } else {
                send_response(
                    stream,
                    404,
                    "text/html; charset=utf-8",
                    &render_page(
                        template_path,
                        "<p>Not found</p>",
                        "404 — Rustam Ashurmatov",
                        "Page not found.",
                    ),
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

fn render_page(template_path: &str, content: &str, title: &str, description: &str) -> String {
    let template = read_file(template_path);
    template
        .replace("<!--CONTENT-->", content)
        .replace("<!--PAGE_TITLE-->", title)
        .replace("<!--META_DESCRIPTION-->", description)
        .replace("<!--LAST_UPDATED-->", "")
}

fn send_response(stream: &mut TcpStream, status: u16, content_type: &str, body: &str) {
    let headers = format!(
        "HTTP/1.1 {status} OK\r\nContent-Type: {content_type}\r\nContent-Length: {len}\r\nCache-Control: public, max-age=3600\r\nConnection: close\r\n\r\n",
        len = body.len()
    );
    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(body.as_bytes());
}

fn send_response_bytes(stream: &mut TcpStream, status: u16, content_type: &str, body: &[u8]) {
    let headers = format!(
        "HTTP/1.1 {status} OK\r\nContent-Type: {content_type}\r\nContent-Length: {len}\r\nCache-Control: public, max-age=3600\r\nConnection: close\r\n\r\n",
        len = body.len()
    );
    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(body);
}
