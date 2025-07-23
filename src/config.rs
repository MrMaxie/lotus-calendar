use dotenvy::dotenv;
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
  pub caldav_provider: String,
  pub google_client_id: String,
  pub google_client_secret: String,
  pub google_email: String,
}

impl AppConfig {
  pub fn from_env() -> anyhow::Result<Self> {
    dotenv().ok();
    let config = envy::from_env::<AppConfig>()?;
    Ok(config)
  }
}
