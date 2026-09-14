use serde_json::Value;
use std::io::{self, BufRead, Write};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let document = std::env::args()
        .nth(1)
        .ok_or("Supply the Creed ID from Connections.")?;
    uuid::Uuid::parse_str(&document)?;
    let url = format!(
        "http://127.0.0.1:{}/mcp/{document}",
        creed_desktop::mcp::PORT
    );
    let client = reqwest::Client::new();
    let mut session = None;
    for line in io::stdin().lock().lines() {
        let value: Value = serde_json::from_str(&line?)?;
        let mut request = client
            .post(&url)
            .header("Accept", "application/json, text/event-stream")
            .json(&value);
        if let Some(session) = &session {
            request = request.header("mcp-session-id", session);
        }
        let response = request.send().await?.error_for_status()?;
        if let Some(header) = response.headers().get("mcp-session-id") {
            session = Some(header.to_str()?.to_owned());
        }
        let body = response.text().await?;
        if !body.is_empty() {
            writeln!(io::stdout(), "{body}")?;
            io::stdout().flush()?;
        }
    }
    Ok(())
}
