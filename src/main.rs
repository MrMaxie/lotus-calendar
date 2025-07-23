mod caldav;
mod config;
mod events;
mod parser;
mod session;

use caldav::adapter::CaldavAdapter;
use caldav::google::GoogleCaldavAdapter;
use config::AppConfig;
use events::EventsManager;

fn main() -> anyhow::Result<()> {
  let config = AppConfig::from_env()?;
  let events_manager = EventsManager::new();

  match config.caldav_provider.to_uppercase().as_str() {
    "GOOGLE" => {
      let adapter = GoogleCaldavAdapter::new(config);
      let events = adapter.fetch_events()?;

      // Save original events
      events_manager.save_events(&events)?;

      // Convert to standardized format and save
      let standardized_events = events_manager.convert_to_standardized_format(&events)?;
      events_manager.save_standardized_events(&standardized_events)?;

      println!("Successfully processed {} events", events.len());
    }
    other => {
      anyhow::bail!("Nieobsługiwany provider CALDAV: {}", other);
    }
  }

  Ok(())
}
