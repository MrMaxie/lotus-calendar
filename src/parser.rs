use serde_yaml::Value;
use std::collections::HashMap;

pub type StandardizedEvent = Value;

pub struct ICalendarParser;

impl ICalendarParser {
  pub fn new() -> Self {
    Self
  }

  pub fn parse(&self, ical_data: &str) -> StandardizedEvent {
    let mut lines = ical_data.lines().peekable();
    let mut stack: Vec<HashMap<String, Value>> = vec![];
    let mut current: HashMap<String, Value> = HashMap::new();

    while let Some(line) = lines.next() {
      if line.trim().is_empty() {
        continue;
      }

      let line = line.trim_start();

      if let Some((raw_key, value)) = line.split_once(':') {
        let mut key_parts = raw_key.split(';');
        let main_key = key_parts.next().unwrap().to_string();
        let mut key_map = HashMap::new();

        for part in key_parts {
          if let Some((k, v)) = part.split_once('=') {
            key_map.insert(k.to_string(), Value::String(v.to_string()));
          }
        }

        key_map.insert("value".to_string(), Value::String(value.to_string()));

        match main_key.as_str() {
          "BEGIN" => {
            stack.push(current);
            current = HashMap::new();
          }
          "END" => {
            let mut parent = stack.pop().unwrap_or_default();
            let key = value;
            let entry = Value::Mapping(
              current
                .into_iter()
                .map(|(k, v)| (Value::String(k), v))
                .collect(),
            );
            match parent.get_mut(key) {
              Some(Value::Sequence(seq)) => seq.push(entry),
              Some(existing) => {
                let mut seq = vec![existing.clone(), entry];
                parent.insert(key.to_string(), Value::Sequence(seq));
              }
              None => {
                parent.insert(key.to_string(), entry);
              }
            }
            current = parent;
          }
          _ => {
            if key_map.len() == 1 {
              current.insert(main_key, key_map.remove("value").unwrap());
            } else {
              current.insert(
                main_key,
                Value::Mapping(
                  key_map
                    .into_iter()
                    .map(|(k, v)| (Value::String(k), v))
                    .collect(),
                ),
              );
            }
          }
        }
      }
    }

    Value::Mapping(
      current
        .into_iter()
        .map(|(k, v)| (Value::String(k), v))
        .collect(),
    )
  }
}
