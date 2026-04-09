use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleDefinition {
    pub key: String,
    pub name: String,
    pub description: String,
    pub severity_weight: u32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleMatchResult {
    pub rule_key: String,
    pub matched: bool,
    pub evidence: serde_json::Value,
    pub explanation: String,
    pub weight: u32,
}
