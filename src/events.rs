use crate::parser::{ICalendarParser, StandardizedEvent};
use anyhow::Result;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use serde_yaml::Value;
use std::{fs::File, io::Write};

#[derive(Debug, Serialize, Deserialize)]
pub struct Event {
  pub href: String,
  pub etag: String,
  pub data: String,
}

pub struct EventsManager;

impl EventsManager {
  pub fn new() -> Self {
    Self
  }

  pub fn parse_caldav_response(&self, xml_response: &str) -> Result<Vec<Event>> {
    let mut events = vec![];
    let mut reader = Reader::from_str(xml_response);

    use quick_xml::events::Event as XmlEvent;
    let mut current_href = String::new();
    let mut current_etag = String::new();
    let mut current_data = String::new();

    loop {
      match reader.read_event() {
        Ok(XmlEvent::Start(ref e)) if e.name().as_ref() == b"D:response" => {
          current_href.clear();
          current_etag.clear();
          current_data.clear();
        }
        Ok(XmlEvent::End(ref e)) if e.name().as_ref() == b"D:response" => {
          if !current_href.is_empty() {
            events.push(Event {
              href: current_href.clone(),
              etag: current_etag.clone(),
              data: current_data.clone(),
            });
          }
        }
        Ok(XmlEvent::Start(ref e)) if e.name().as_ref() == b"D:href" => {
          if let Ok(XmlEvent::Text(e)) = reader.read_event() {
            current_href = std::str::from_utf8(e.as_ref())?.to_string();
          }
        }
        Ok(XmlEvent::Start(ref e)) if e.name().as_ref() == b"D:getetag" => {
          if let Ok(XmlEvent::Text(e)) = reader.read_event() {
            current_etag = std::str::from_utf8(e.as_ref())?.to_string();
          }
        }
        Ok(XmlEvent::Start(ref e)) if e.name().as_ref().ends_with(b"calendar-data") => {
          if let Ok(XmlEvent::Text(e)) = reader.read_event() {
            current_data = std::str::from_utf8(e.as_ref())?.to_string();
          }
        }
        Ok(XmlEvent::Eof) => break,
        _ => {}
      }
    }

    println!("Parsed {} events", events.len());

    Ok(events)
  }

  pub fn save_events(&self, events: &[Event]) -> Result<()> {
    let mut f = File::create("./.mem/events.yaml")?;
    f.write_all(serde_yaml::to_string(&events)?.as_bytes())?;
    println!("Saved {} events to .mem/events.yaml", events.len());
    Ok(())
  }

  pub fn convert_to_standardized_format(&self, events: &[Event]) -> Result<Vec<StandardizedEvent>> {
    let mut standardized_events = vec![];
    let parser = ICalendarParser::new();

    // In dev mode, select every 10th event (take 1, skip 9, repeat)
    for (i, event) in events.iter().enumerate() {
      if i % 100 == 0 {
        let standardized_event = parser.parse(&event.data);
        standardized_events.push(standardized_event);
        return Ok(standardized_events);
      }
    }

    Ok(standardized_events)
  }

  pub fn save_standardized_events(&self, events: &[StandardizedEvent]) -> Result<()> {
    let mut f = File::create("./.mem/standardized_events.yaml")?;
    f.write_all(serde_yaml::to_string(&events)?.as_bytes())?;
    println!(
      "Saved {} standardized events to .mem/standardized_events.yaml",
      events.len()
    );
    Ok(())
  }
}
