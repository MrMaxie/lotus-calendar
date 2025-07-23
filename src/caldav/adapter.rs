use crate::events::Event;
use anyhow::Result;

pub trait CaldavAdapter {
  fn fetch_events(&self) -> Result<Vec<Event>>;
}
