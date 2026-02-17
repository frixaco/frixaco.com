use std::{collections::HashMap, env, sync::Arc};

use axum::{
    Router,
    extract::{Path, State},
    http::{
        HeaderValue,
        header::{CACHE_CONTROL, CONTENT_TYPE},
    },
    response::{Html, IntoResponse, Redirect},
    routing::get,
};
use comrak::{Options, markdown_to_html};
use include_dir::{Dir, include_dir};
use tower_http::set_header::SetResponseHeaderLayer;

static BLOG_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/src/sheets/posts");

static TEMPLATE: &str = include_str!("./index.html");

struct AppState {
    home_html: String,
    blog_html: String,
    more_html: String,
    posts_html: HashMap<String, String>,
}

fn render_page(content: &str) -> Html<String> {
    Html(TEMPLATE.replace("<!--CONTENT-->", content))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let mut options = Options::default();
    options.extension.front_matter_delimiter = Some("---".into());

    let home_html = markdown_to_html(include_str!("./sheets/home.md"), &options);
    let blog_html = markdown_to_html(include_str!("./sheets/blog.md"), &options);
    let more_html = markdown_to_html(include_str!("./sheets/more.md"), &options);

    let mut posts_html: HashMap<String, String> = HashMap::new();
    for file in BLOG_DIR.files() {
        let slug = file.path().file_name().unwrap().to_str().unwrap();
        let content = file.contents_utf8().unwrap();
        posts_html.insert(slug.to_string(), markdown_to_html(content, &options));
    }

    let app_state = Arc::new(AppState {
        home_html,
        blog_html,
        more_html,
        posts_html,
    });

    let app = Router::new()
        .route("/", get(home_page))
        .route("/home", get(home_page))
        .route("/blog", get(blog_page))
        .route("/blog/{slug}", get(post_page))
        .route("/more", get(more_page))
        .route("/md/home", get(home_md))
        .route("/md/blog", get(blog_md))
        .route("/md/blog/{slug}", get(posts_md))
        .route("/md/more", get(more_md))
        .route("/pdf", get(resume))
        .with_state(app_state)
        .layer(SetResponseHeaderLayer::if_not_present(
            CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=3600"),
        ));

    let port = env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(8080);
    let bind_addr = format!("0.0.0.0:{port}");

    let listener = tokio::net::TcpListener::bind(&bind_addr).await.unwrap();
    let _ = axum::serve(listener, app).await;
}

async fn home_page(State(state): State<Arc<AppState>>) -> Html<String> {
    render_page(&state.home_html)
}
async fn blog_page(State(state): State<Arc<AppState>>) -> Html<String> {
    render_page(&state.blog_html)
}
async fn post_page(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<Html<String>, Redirect> {
    match state.posts_html.get(&slug) {
        Some(content) => Ok(render_page(content)),
        None => Err(Redirect::permanent("/")),
    }
}
async fn more_page(State(state): State<Arc<AppState>>) -> Html<String> {
    render_page(&state.more_html)
}

async fn home_md(State(state): State<Arc<AppState>>) -> Html<String> {
    Html(state.home_html.clone())
}
async fn blog_md(State(state): State<Arc<AppState>>) -> Html<String> {
    Html(state.blog_html.clone())
}
async fn posts_md(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<Html<String>, Redirect> {
    match state.posts_html.get(&slug) {
        Some(content) => Ok(Html(content.to_string())),
        None => Err(Redirect::permanent("/")),
    }
}
async fn more_md(State(state): State<Arc<AppState>>) -> Html<String> {
    Html(state.more_html.clone())
}

async fn resume() -> impl IntoResponse {
    (
        [(CONTENT_TYPE, "application/pdf")],
        include_bytes!("./RESUME_SDE_RESUME_RUSTAM_ASHURMATOV.pdf"),
    )
}
