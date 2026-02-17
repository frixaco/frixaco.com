use std::{collections::HashMap, sync::Arc};

use axum::{
    Router,
    extract::{OriginalUri, State},
    http::{StatusCode, header::CONTENT_TYPE},
    response::{Html, IntoResponse},
    routing::get,
};
use comrak::{Options, markdown_to_html};
use include_dir::{Dir, include_dir};

static BLOG_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/src/sheets/posts");

struct AppState {
    home_html: String,
    blog_html: String,
    more_html: String,
    blog_posts_html: HashMap<String, String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let home_html = markdown_to_html(include_str!("./sheets/home.md"), &Options::default());
    let blog_html = markdown_to_html(include_str!("./sheets/blog.md"), &Options::default());
    let more_html = markdown_to_html(include_str!("./sheets/more.md"), &Options::default());
    let mut blog_posts_html: HashMap<String, String> = HashMap::new();
    for file in BLOG_DIR.files() {
        let slug = file.path().file_stem().unwrap().to_str().unwrap();
        let content = file.contents_utf8().unwrap();
        let html = markdown_to_html(content, &Options::default());
        blog_posts_html.insert(slug.to_string(), html);
    }

    let app_state = Arc::new(AppState {
        home_html,
        blog_html,
        more_html,
        blog_posts_html,
    });

    let app = Router::new()
        .route("/", get(index))
        .route("/index.html", get(index))
        .route("/home", get(home))
        .route("/blog", get(blog))
        .route("/blog/{*rest}", get(index))
        .route("/posts/{*rest}", get(blog))
        .route("/more", get(more))
        .route("/styles.css", get(styles))
        .route("/pdf", get(resume))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    let _ = axum::serve(listener, app).await;
}

async fn home(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let html = state.home_html.clone();
    Html(html)
}

async fn blog(
    State(state): State<Arc<AppState>>,
    OriginalUri(uri): OriginalUri,
) -> Result<Html<String>, (StatusCode, String)> {
    let path = uri.path();
    println!("{}", path);
    match path {
        "/blog" | "/blog/" => Ok(Html(state.blog_html.clone())),
        _ => {
            let slug = path.trim_start_matches("/posts/").trim_end_matches(".md");
            match state.blog_posts_html.get(slug) {
                Some(html) => Ok(Html(html.clone())),
                None => Err((StatusCode::NOT_FOUND, format!("Post not found: {slug}"))),
            }
        }
    }
}

async fn more(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let html = state.more_html.clone();
    Html(html)
}

async fn index() -> Html<&'static str> {
    Html(include_str!("./index.html"))
}

async fn styles() -> impl IntoResponse {
    (
        [(CONTENT_TYPE, "text/css; charset=utf-8")],
        include_str!("./styles.css"),
    )
}

async fn resume() -> impl IntoResponse {
    (
        [(CONTENT_TYPE, "application/pdf")],
        include_bytes!("./RESUME_SDE_RESUME_RUSTAM_ASHURMATOV.pdf"),
    )
}
