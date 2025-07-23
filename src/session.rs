use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, fs::File, io::Write, path::Path};

const SESSION_FILE: &str = "./.mem/current_session.yaml";

#[derive(Debug, Serialize, Deserialize)]
struct SessionData {
  #[serde(flatten)]
  data: HashMap<String, serde_yaml::Value>,
}

pub struct SessionManager;

impl SessionManager {
  pub fn new() -> Self {
    Self
  }

  pub fn get<T>(&self, key: &str) -> Result<Option<T>>
  where
    T: for<'de> Deserialize<'de>,
  {
    if !Path::new(SESSION_FILE).exists() {
      return Ok(None);
    }

    let data = fs::read_to_string(SESSION_FILE)?;
    let session_data: SessionData = serde_yaml::from_str(&data)?;

    if let Some(value) = session_data.data.get(key) {
      let typed_value: T = serde_yaml::from_value(value.clone())?;
      Ok(Some(typed_value))
    } else {
      Ok(None)
    }
  }

  pub fn set<T>(&self, key: &str, value: &T) -> Result<()>
  where
    T: Serialize,
  {
    let mut session_data = if Path::new(SESSION_FILE).exists() {
      let data = fs::read_to_string(SESSION_FILE)?;
      serde_yaml::from_str(&data).unwrap_or_else(|_| SessionData {
        data: HashMap::new(),
      })
    } else {
      SessionData {
        data: HashMap::new(),
      }
    };

    let yaml_value = serde_yaml::to_value(value)?;
    session_data.data.insert(key.to_string(), yaml_value);

    fs::create_dir_all(".mem")?;
    let mut f = File::create(SESSION_FILE)?;
    f.write_all(serde_yaml::to_string(&session_data)?.as_bytes())?;

    Ok(())
  }

  pub fn remove(&self, key: &str) -> Result<()> {
    if !Path::new(SESSION_FILE).exists() {
      return Ok(());
    }

    let mut session_data = if let Ok(data) = fs::read_to_string(SESSION_FILE) {
      serde_yaml::from_str(&data).unwrap_or_else(|_| SessionData {
        data: HashMap::new(),
      })
    } else {
      SessionData {
        data: HashMap::new(),
      }
    };

    session_data.data.remove(key);

    fs::create_dir_all(".mem")?;
    let mut f = File::create(SESSION_FILE)?;
    f.write_all(serde_yaml::to_string(&session_data)?.as_bytes())?;

    Ok(())
  }
}
