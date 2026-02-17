use std::{collections::HashMap, sync::Arc};

use axum::{
    Router,
    extract::{Path, State},
    http::header::CONTENT_TYPE,
    response::{Html, IntoResponse, Redirect},
    routing::get,
};
use comrak::{Options, markdown_to_html};
use include_dir::{Dir, include_dir};

static BLOG_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/src/sheets/posts");

struct AppState {
    home_html: String,
    blog_html: String,
    more_html: String,
    posts_html: HashMap<String, String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let home_html = markdown_to_html(include_str!("./sheets/home.md"), &Options::default());
    let blog_html = markdown_to_html(include_str!("./sheets/blog.md"), &Options::default());
    let more_html = markdown_to_html(include_str!("./sheets/more.md"), &Options::default());

    let mut posts_html: HashMap<String, String> = HashMap::new();
    for file in BLOG_DIR.files() {
        let slug = file.path().file_name().unwrap().to_str().unwrap();
        let content = file.contents_utf8().unwrap();
        posts_html.insert(slug.to_string(), content.to_string());
    }

    let app_state = Arc::new(AppState {
        home_html,
        blog_html,
        more_html,
        posts_html,
    });

    let app = Router::new()
        .route("/", get(index))
        .route("/home", get(index))
        .route("/blog", get(index))
        .route("/blog/{slug}", get(post))
        .route("/more", get(index))
        .route("/md/home", get(home_md))
        .route("/md/blog", get(blog_md))
        .route("/md/posts/{slug}", get(posts_md))
        .route("/md/more", get(more_md))
        .route("/styles.css", get(styles))
        .route("/pdf", get(resume))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    let _ = axum::serve(listener, app).await;
}

async fn index() -> Html<&'static str> {
    Html(include_str!("./index.html"))
}

async fn home(State(state): State<Arc<AppState>>,) -> impl IntoResponse {
    let html = state.home_html.clone();
    Html(html)
}
async fn home_md(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Html(state.home_html.clone())
}

async fn blog(State(state): State<Arc<AppState>>,) -> impl IntoResponse {
    let html = state.blog_html.clone();
    Html(html)
}
async fn blog_md(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Html(state.blog_html.clone())
}

async fn post(State(state): State<Arc<AppState>>, Path(slug): Path<String>) -> impl IntoResponse {
    let html = state.posts_html[&slug].clone();
    Html(html)
}
async fn posts_md(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<String, Redirect<>> {
    match state.posts_html.get(&slug) {
        Some(content) => Ok(content.to_string()),
        None => Err(Redirect::permanent("/")),
    }
}

async fn more(State(state): State<Arc<AppState>>,) -> impl IntoResponse {
    let html = state.more_html.clone();
    Html(html)
}
async fn more_md(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Html(state.more_html.clone())
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
