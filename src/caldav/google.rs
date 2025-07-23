use anyhow::Result;
use oauth2::basic::BasicClient;
use oauth2::reqwest;
use oauth2::{
  AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge, RedirectUrl,
  Scope, TokenResponse, TokenUrl,
};
use open::that;

use crate::caldav::adapter::CaldavAdapter;
use crate::caldav::templates::CALENDAR_QUERY_XML;
use crate::config::AppConfig;
use crate::events::Event;
use crate::events::EventsManager;
use crate::session::SessionManager;

pub struct GoogleCaldavAdapter {
  pub config: AppConfig,
  session_manager: SessionManager,
  events_manager: EventsManager,
}

impl GoogleCaldavAdapter {
  pub fn new(config: AppConfig) -> Self {
    Self {
      config,
      session_manager: SessionManager::new(),
      events_manager: EventsManager::new(),
    }
  }

  fn get_or_fetch_token(&self) -> Result<String> {
    if let Some(token) = self.session_manager.get::<String>("google_access_token")? {
      return Ok(token);
    }

    let client = BasicClient::new(ClientId::new(self.config.google_client_id.clone()))
      .set_client_secret(ClientSecret::new(self.config.google_client_secret.clone()))
      .set_auth_uri(AuthUrl::new(
        "https://accounts.google.com/o/oauth2/auth".to_string(),
      )?)
      .set_token_uri(TokenUrl::new(
        "https://oauth2.googleapis.com/token".to_string(),
      )?)
      .set_redirect_uri(RedirectUrl::new("urn:ietf:wg:oauth:2.0:oob".to_string())?);

    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, _csrf_token) = client
      .authorize_url(CsrfToken::new_random)
      .add_scope(Scope::new(
        "https://www.googleapis.com/auth/calendar".to_string(),
      ))
      .set_pkce_challenge(pkce_challenge)
      .url();

    println!("Open the following URL in your browser:\n{}", auth_url);
    that(auth_url.to_string())?;

    println!("Enter the code:");
    let mut code = String::new();
    std::io::stdin().read_line(&mut code)?;
    let code = code.trim();

    let http_client = reqwest::blocking::ClientBuilder::new()
      .redirect(reqwest::redirect::Policy::none())
      .build()
      .expect("Client should build");

    let token_result = client
      .exchange_code(AuthorizationCode::new(code.to_string()))
      .set_pkce_verifier(pkce_verifier)
      .request(&http_client)?;

    let access_token = token_result.access_token().secret().to_string();
    self
      .session_manager
      .set("google_access_token", &access_token)?;

    Ok(access_token)
  }
}

impl CaldavAdapter for GoogleCaldavAdapter {
  fn fetch_events(&self) -> Result<Vec<Event>> {
    let token = self.get_or_fetch_token()?;
    let url = format!(
      "https://apidata.googleusercontent.com/caldav/v2/{}/events",
      self.config.google_email
    );

    let client = reqwest::blocking::Client::new();
    let res = client
      .request(reqwest::Method::from_bytes(b"REPORT")?, &url)
      .bearer_auth(token)
      .header("Depth", "1")
      .header("Content-Type", "application/xml")
      .body(CALENDAR_QUERY_XML)
      .send()?;

    let status = res.status();
    let text = res.text()?;

    if status == 401 {
      println!("Token expired or invalid. Clearing stored token and requiring re-authorization.");
      self.session_manager.remove("google_access_token")?;
      return self.fetch_events();
    }

    let events = self.events_manager.parse_caldav_response(&text)?;
    self.events_manager.save_events(&events)?;

    Ok(events)
  }
}
