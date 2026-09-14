use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

pub fn id() -> String {
    Uuid::new_v4().to_string()
}
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
pub fn hash(source: &str) -> String {
    format!("{:x}", Sha256::digest(source.as_bytes()))
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Section {
    pub id: String,
    pub name: String,
    pub body: String,
    pub accent: String,
    pub permission: String,
    pub archived: bool,
    pub start: usize,
    pub body_start: usize,
    pub end: usize,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Proposal {
    pub id: String,
    pub section_id: String,
    pub agent: String,
    pub reason: String,
    pub baseline: String,
    pub operation: Value,
    pub created_at: u64,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Revision {
    pub id: String,
    pub source: String,
    pub timestamp: u64,
    pub reason: String,
    #[serde(default)]
    pub sections: Vec<Section>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Connection {
    pub id: String,
    pub agent: String,
    pub transport: String,
    pub last_seen: u64,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: String,
    pub path: PathBuf,
    pub source: String,
    pub revision: String,
    pub listed: bool,
    pub missing: bool,
    pub sections: Vec<Section>,
    pub proposals: Vec<Proposal>,
    pub history: Vec<Revision>,
    pub activity: Vec<Value>,
    pub connections: Vec<Connection>,
    pub analysis: Option<Value>,
    pub spend: f64,
}
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    #[serde(default)]
    pub custom_agents: Vec<CustomAgent>,
    pub documents: Vec<Document>,
    pub active_id: Option<String>,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default)]
    pub version: u32,
    #[serde(skip_deserializing)]
    pub mcp_error: Option<String>,
    #[serde(skip)]
    pub directory: PathBuf,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CustomAgent {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
}

fn merge_proposal_body(base: &str, current: &str, proposed: &str) -> Option<String> {
    if current == base || current == proposed { return Some(proposed.into()); }
    if proposed == base { return Some(current.into()); }
    let base: Vec<char> = base.chars().collect();
    let current: Vec<char> = current.chars().collect();
    let proposed: Vec<char> = proposed.chars().collect();
    let edits = |text: &[char]| {
        let start = base.iter().zip(text).take_while(|(a, b)| a == b).count();
        let suffix = base[start..].iter().rev().zip(text[start..].iter().rev())
            .take_while(|(a, b)| a == b).count();
        let a = &base[start..base.len() - suffix];
        let b = &text[start..text.len() - suffix];
        // Bound memory for large replacements; ambiguous large edits remain conflicts.
        if (a.len() + 1).saturating_mul(b.len() + 1) > 4_000_000 {
            return vec![(start, base.len() - suffix, b.to_vec())];
        }
        let width = b.len() + 1;
        let mut lengths = vec![0u32; (a.len() + 1) * width];
        for i in (0..a.len()).rev() {
            for j in (0..b.len()).rev() {
                lengths[i * width + j] = if a[i] == b[j] {
                    lengths[(i + 1) * width + j + 1] + 1
                } else {
                    lengths[(i + 1) * width + j].max(lengths[i * width + j + 1])
                };
            }
        }
        let (mut i, mut j) = (0, 0);
        let mut result = Vec::new();
        while i < a.len() || j < b.len() {
            if i < a.len() && j < b.len() && a[i] == b[j] {
                i += 1; j += 1;
                continue;
            }
            let from = i;
            let mut replacement = Vec::new();
            while i < a.len() || j < b.len() {
                if i < a.len() && j < b.len() && a[i] == b[j] { break; }
                if j < b.len() && (i == a.len() || lengths[i * width + j + 1] > lengths[(i + 1) * width + j]) {
                    replacement.push(b[j]); j += 1;
                } else { i += 1; }
            }
            result.push((start + from, start + i, replacement));
        }
        result
    };
    let mut combined = edits(&current);
    for agent in edits(&proposed) {
        if combined.contains(&agent) { continue; }
        for user in &combined {
            let overlaps = user.0 < agent.1 && agent.0 < user.1;
            let same_insertion = user.0 == user.1 && agent.0 == agent.1 && user.0 == agent.0;
            if overlaps || same_insertion { return None; }
        }
        combined.push(agent);
    }
    combined.sort_by_key(|edit| (edit.0, edit.1));
    let mut merged = base;
    for (start, end, replacement) in combined.into_iter().rev() {
        merged.splice(start..end, replacement);
    }
    Some(merged.into_iter().collect())
}

fn rebase_proposals(doc: &mut Document, previous_revision: &str) -> bool {
    let mut changed = false;
    doc.proposals.retain(|proposal| {
        let keep = proposal.baseline == previous_revision || proposal.baseline == doc.revision;
        changed |= !keep;
        keep
    });
    for proposal in &mut doc.proposals {
        if proposal.baseline == doc.revision { continue; }
        let Some(revision) = doc.history.iter().rev().find(|r| hash(&r.source) == proposal.baseline) else { continue; };
        let base = revision.sections.iter().find(|s| s.id == proposal.section_id);
        let current = doc.sections.iter().find(|s| s.id == proposal.section_id && !s.archived);
        let safe = match (base, current, proposal.operation["kind"].as_str()) {
            (_, _, Some("create")) => true,
            (Some(_), Some(_), Some("reorder")) =>
                revision.sections.iter().filter(|s| !s.archived).map(|s| &s.id).eq(
                    doc.sections.iter().filter(|s| !s.archived).map(|s| &s.id)),
            (Some(base), Some(current), Some("body")) => {
                if let Some(body) = proposal.operation["body"].as_str()
                    .and_then(|body| merge_proposal_body(&base.body, &current.body, body)) {
                    proposal.operation["body"] = json!(body);
                    if proposal.operation.get("expectedBody").is_some() {
                        proposal.operation["expectedBody"] = json!(current.body);
                    }
                    true
                } else { false }
            }
            (Some(base), Some(current), Some("rename")) => base.name == current.name,
            (Some(base), Some(current), Some("accent")) => base.accent == current.accent,
            (Some(base), Some(current), Some("delete" | "archive")) =>
                base.body == current.body && base.name == current.name && base.accent == current.accent,
            _ => false,
        };
        if safe {
            proposal.baseline = doc.revision.clone();
            proposal.operation.as_object_mut().map(|op| op.remove("baseline"));
            changed = true;
        }
    }
    doc.proposals.retain(|proposal| {
        let keep = proposal.baseline == doc.revision;
        changed |= !keep;
        keep
    });
    changed
}

impl Workspace {
    pub fn edit_agent(
        &mut self,
        agent_id: &str,
        name: &str,
        icon: Option<&str>,
    ) -> Result<(), String> {
        let index = self
            .custom_agents
            .iter()
            .position(|a| a.id == agent_id)
            .ok_or("Agent not found.")?;
        let mut candidate = self.clone();
        candidate.custom_agents.remove(index);
        candidate.add_agent(name, icon)?;
        let mut updated = candidate.custom_agents.pop().ok_or("Agent not found.")?;
        updated.id = agent_id.into();
        self.custom_agents[index] = updated;
        Ok(())
    }

    pub fn remove_agent(&mut self, agent_id: &str) -> Result<(), String> {
        let index = self
            .custom_agents
            .iter()
            .position(|a| a.id == agent_id)
            .ok_or("Agent not found.")?;
        self.custom_agents.remove(index);
        let identity = format!("custom:{agent_id}");
        for document in &mut self.documents {
            document
                .connections
                .retain(|connection| connection.agent != identity);
        }
        Ok(())
    }

    pub fn add_agent(&mut self, name: &str, icon: Option<&str>) -> Result<(), String> {
        let name = name.trim();
        if name.is_empty() || name.chars().count() > 80 || name.chars().any(char::is_control) {
            return Err("Enter an agent name of 1 to 80 characters.".into());
        }
        if self.custom_agents.len() >= 64 {
            return Err("You can save up to 64 agents.".into());
        }
        if self
            .custom_agents
            .iter()
            .any(|a| a.name.to_lowercase() == name.to_lowercase())
        {
            return Err("An agent with this name already exists.".into());
        }
        if let Some(icon) = icon {
            if icon.len() > 128 * 1024
                || !icon.starts_with("data:image/png;base64,iVBORw0KGgo")
                || !icon[22..]
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"+/=".contains(&b))
            {
                return Err("Choose a PNG icon smaller than 128 KB.".into());
            }
        }
        self.custom_agents.push(CustomAgent {
            id: id(),
            name: name.into(),
            icon: icon.map(Into::into),
        });
        Ok(())
    }
}
fn default_model() -> String {
    "openai/gpt-4.1-mini".into()
}
fn atomic(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Missing storage directory")?;
    let mut file = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    file.write_all(contents).map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    file.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn parse(source: &str, previous: &[Section]) -> Vec<Section> {
    let mut result: Vec<Section> = Vec::new();
    let mut offset = 0;
    let mut fence: Option<(char, usize)> = None;
    let mut frontmatter = false;
    let mut used = std::collections::HashSet::new();
    for (index, line) in source.split_inclusive('\n').enumerate() {
        let text = line.trim_end_matches(['\r', '\n']);
        let trimmed = text.trim_start();
        if index == 0 && text.trim_start_matches('\u{feff}') == "---" {
            frontmatter = true;
        } else if frontmatter {
            if text == "---" || text == "..." {
                frontmatter = false;
            }
        } else if let Some((character, length)) = fence {
            if trimmed.chars().take_while(|c| *c == character).count() >= length
                && trimmed.trim_matches(character).trim().is_empty()
            {
                fence = None;
            }
        } else if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            let character = trimmed.chars().next().unwrap();
            fence = Some((
                character,
                trimmed.chars().take_while(|c| *c == character).count(),
            ));
        } else if text.len() - trimmed.len() <= 3 && trimmed.starts_with("## ") {
            if let Some(last) = result.last_mut() {
                last.end = offset;
                last.body = source[last.body_start..offset].to_string();
            }
            let heading = trimmed[3..].trim();
            let without_closing = heading.trim_end_matches('#');
            let name = if without_closing.ends_with([' ', '\t']) {
                without_closing.trim_end()
            } else {
                heading
            }
            .to_string();
            let old = previous
                .iter()
                .find(|s| !s.archived && s.name == name && !used.contains(&s.id));
            let section_id = old.map(|s| s.id.clone()).unwrap_or_else(id);
            used.insert(section_id.clone());
            result.push(Section {
                id: section_id,
                name,
                body: String::new(),
                accent: "mono".into(),
                permission: old
                    .map(|s| s.permission.clone())
                    .unwrap_or("propose".into()),
                archived: false,
                start: offset,
                body_start: offset + line.len(),
                end: source.len(),
            });
        }
        offset += line.len();
    }
    if let Some(last) = result.last_mut() {
        last.body = source[last.body_start..].to_string();
    }
    for section in &mut result {
        if let Some(value) = section
            .body
            .split("<!-- creed:accent=")
            .nth(1)
            .and_then(|s| s.split(" -->").next())
        {
            if value.len() < 32 {
                section.accent = value.into();
            }
        }
    }
    result.extend(previous.iter().filter(|s| s.archived).cloned());
    result
}

impl Workspace {
    pub fn load(directory: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&directory, fs::Permissions::from_mode(0o700))
                .map_err(|e| e.to_string())?;
        }
        let path = directory.join("workspace.json");
        let mut state: Self = if path.exists() {
            serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
                .map_err(|e| format!("Could not read local state: {e}"))?
        } else {
            Self {
                model: default_model(),
                version: 1,
                ..Self::default()
            }
        };
        state.directory = directory;
        if state.version != 1 {
            return Err("This workspace was created by a different Creed version. Update Creed before opening it.".into());
        }
        for doc in &mut state.documents {
            doc.connections.clear();
            doc.sections = parse(&doc.source, &doc.sections);
        }
        state.refresh()?;
        Ok(state)
    }
    pub fn persist(&self) -> Result<(), String> {
        atomic(
            &self.directory.join("workspace.json"),
            &serde_json::to_vec(self).map_err(|e| e.to_string())?,
        )
    }
    pub fn document(&self, id: &str) -> Result<&Document, String> {
        self.documents
            .iter()
            .find(|d| d.id == id && d.listed)
            .ok_or("This Creed is not open.".into())
    }
    pub fn document_mut(&mut self, id: &str) -> Result<&mut Document, String> {
        self.documents
            .iter_mut()
            .find(|d| d.id == id && d.listed)
            .ok_or("This Creed is not open.".into())
    }
    pub fn refresh(&mut self) -> Result<(), String> {
        let mut changed = false;
        for doc in self.documents.iter_mut().filter(|d| d.listed) {
            let previous_revision = doc.revision.clone();
            match fs::read_to_string(&doc.path) {
                Ok(source) => {
                    if doc.missing {
                        changed = true;
                    }
                    doc.missing = false;
                    if hash(&source) != doc.revision {
                        doc.history.push(Revision {
                            id: id(),
                            source: doc.source.clone(),
                            timestamp: now(),
                            reason: "Before external edit".into(),
                            sections: doc.sections.clone(),
                        });
                        doc.sections = parse(&source, &doc.sections);
                        doc.source = source;
                        doc.revision = hash(&doc.source);
                        changed = true;
                    }
                }
                Err(_) => {
                    if !doc.missing {
                        changed = true;
                    }
                    doc.missing = true;
                }
            }
            changed |= rebase_proposals(doc, &previous_revision);
        }
        let active_is_available = self.active_id.as_ref().is_some_and(|id| {
            self.documents
                .iter()
                .any(|doc| doc.id == *id && doc.listed && !doc.missing)
        });
        if !active_is_available {
            let next_active = self
                .documents
                .iter()
                .find(|doc| doc.listed && !doc.missing)
                .map(|doc| doc.id.clone());
            if self.active_id != next_active {
                self.active_id = next_active;
                changed = true;
            }
        }
        if changed {
            self.persist()?;
        }
        Ok(())
    }
    pub fn open(&mut self, path: &Path) -> Result<String, String> {
        let path = fs::canonicalize(path).map_err(|e| e.to_string())?;
        let source = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let document_id = if let Some(doc) = self.documents.iter_mut().find(|d| d.path == path) {
            doc.listed = true;
            doc.missing = false;
            doc.sections = parse(&source, &doc.sections);
            doc.revision = hash(&source);
            doc.source = source;
            doc.id.clone()
        } else {
            let document_id = id();
            self.documents.push(Document {
                id: document_id.clone(),
                path,
                revision: hash(&source),
                sections: parse(&source, &[]),
                source,
                listed: true,
                missing: false,
                proposals: vec![],
                history: vec![],
                activity: vec![],
                connections: vec![],
                analysis: None,
                spend: 0.,
            });
            document_id
        };
        self.active_id = Some(document_id.clone());
        self.persist()?;
        Ok(document_id)
    }
    pub fn write(
        &mut self,
        document_id: &str,
        baseline: &str,
        source: String,
        reason: &str,
    ) -> Result<(), String> {
        let doc = self.document(document_id)?.clone();
        let current =
            fs::read_to_string(&doc.path).map_err(|_| "Locate the file before saving.")?;
        if hash(&current) != baseline {
            return Err(
                "The file changed outside Creed. Your edits are preserved; review both versions."
                    .into(),
            );
        }
        if current == source {
            return Ok(());
        }
        let recovery = self.directory.join("recovery");
        fs::create_dir_all(&recovery).map_err(|e| e.to_string())?;
        atomic(
            &recovery.join(format!("{}-{}.md", doc.id, hash(&current))),
            current.as_bytes(),
        )?;
        let mut writer = crate::files::Documents::default();
        let snapshot = writer.open(&doc.path)?;
        writer.save(snapshot.id, baseline, &source)?;
        let doc = self.document_mut(document_id)?;
        doc.history.push(Revision {
            id: id(),
            source: current,
            timestamp: now(),
            reason: reason.into(),
            sections: doc.sections.clone(),
        });
        doc.sections = parse(&source, &doc.sections);
        doc.revision = hash(&source);
        doc.source = source;
        doc.missing = false;
        rebase_proposals(doc, baseline);
        doc.activity
            .push(json!({"id":id(),"timestamp":now(),"reason":reason}));
        self.persist()
    }
    pub fn operate(
        &mut self,
        document_id: &str,
        operation: &Value,
        agent: Option<&str>,
    ) -> Result<Value, String> {
        let doc = self.document(document_id)?.clone();
        let kind = operation["kind"].as_str().ok_or("Missing operation kind")?;
        let section_id = operation["sectionId"].as_str().unwrap_or("");
        let section = doc.sections.iter().find(|s| s.id == section_id);
        if kind == "create" && !section_id.is_empty() && section.is_some() {
            return Err("Section identity already exists.".into());
        }
        if matches!(kind, "create" | "body")
            && !parse(operation["body"].as_str().unwrap_or(""), &[]).is_empty()
        {
            return Err("A section body cannot contain another level-two section. Use a subsection heading or create a separate section.".into());
        }
        if agent.is_some() && section.is_some_and(|s| s.archived) {
            return Err("This section is archived.".into());
        }
        if section.is_some_and(|s| s.archived) && kind != "restore" {
            if kind == "delete" {
                self.document_mut(document_id)?
                    .sections
                    .retain(|s| s.id != section_id);
                self.persist()?;
                return Ok(json!({"status":"saved"}));
            }
            return Err("Restore this section before editing it.".into());
        }
        if kind == "restore" && section.is_some_and(|s| !s.archived) {
            return Err("This section is already in the file.".into());
        }
        if let Some(expected) = operation["expectedBody"].as_str() {
            if section.ok_or("Section not found")?.body != expected {
                return Err("This section changed. Your draft is preserved; compare it with the file before saving.".into());
            }
        }
        if agent.is_some()
            && kind != "create"
            && matches!(
                section.ok_or("Section not found")?.permission.as_str(),
                "read-only" | "hidden"
            )
        {
            return Err("This section is read-only.".into());
        }
        if agent.is_some()
            && (kind == "create" || section.is_some_and(|s| s.permission != "direct"))
        {
            let proposal = Proposal {
                id: id(),
                section_id: section_id.into(),
                agent: agent.unwrap().into(),
                reason: operation["reason"]
                    .as_str()
                    .unwrap_or("Suggested improvement")
                    .into(),
                baseline: doc.revision,
                operation: operation.clone(),
                created_at: now(),
            };
            let response = json!({"proposalId":proposal.id,"status":"pending"});
            self.document_mut(document_id)?.proposals.push(proposal);
            self.persist()?;
            return Ok(response);
        }
        let newline = if doc.source.contains("\r\n") {
            "\r\n"
        } else {
            "\n"
        };
        let mut source = doc.source.clone();
        let field = |name: &str| {
            operation[name]
                .as_str()
                .ok_or_else(|| format!("Missing {name}"))
        };
        match kind {
            "create" => {
                let name = field("name")?;
                if name.trim().is_empty() || name.contains(['\n', '\r']) {
                    return Err("Choose a section name on one line.".into());
                }
                source.push_str(&format!(
                    "{newline}{newline}## {name}{newline}{newline}{}{newline}",
                    operation["body"].as_str().unwrap_or("")
                ));
            }
            "body" => {
                let s = section.ok_or("Section not found")?;
                let body = field("body")?.replace("\r\n", "\n").replace('\n', newline);
                let marker = if s.accent == "mono" || s.accent == "custom" {
                    String::new()
                } else {
                    format!("<!-- creed:accent={} -->{newline}{newline}", s.accent)
                };
                source.replace_range(
                    s.body_start..s.end,
                    &format!("{newline}{marker}{}{newline}{newline}", body.trim()),
                );
            }
            "rename" => {
                let s = section.ok_or("Section not found")?;
                let name = field("name")?;
                if name.trim().is_empty() || name.contains(['\n', '\r']) {
                    return Err("Choose a section name on one line.".into());
                }
                source.replace_range(s.start..s.body_start, &format!("## {name}{newline}"));
                self.document_mut(document_id)?
                    .sections
                    .iter_mut()
                    .find(|x| x.id == s.id)
                    .unwrap()
                    .name = name.into();
            }
            "delete" | "archive" => {
                let s = section.ok_or("Section not found")?;
                source.replace_range(s.start..s.end, "");
                if kind == "archive" {
                    self.document_mut(document_id)?
                        .sections
                        .iter_mut()
                        .find(|x| x.id == s.id)
                        .unwrap()
                        .archived = true;
                }
            }
            "restore" => {
                let s = section.ok_or("Section not found")?;
                source.push_str(&format!("{newline}## {}{newline}{}", s.name, s.body));
                self.document_mut(document_id)?
                    .sections
                    .iter_mut()
                    .find(|x| x.id == s.id)
                    .unwrap()
                    .archived = false;
            }
            "permissions" => {
                if agent.is_some() {
                    return Err("Agents cannot change permissions.".into());
                }
                let permission = field("permission")?;
                if !["read-only", "propose", "direct"].contains(&permission) {
                    return Err("Invalid permission".into());
                }
                for section in self.document_mut(document_id)?.sections.iter_mut() {
                    if !section.archived && section.permission != "hidden" {
                        section.permission = permission.into();
                    }
                }
                self.persist()?;
                return Ok(json!({"status":"saved"}));
            }
            "permission" => {
                if agent.is_some() {
                    return Err("Agents cannot change permissions.".into());
                }
                let permission = field("permission")?;
                if !["hidden", "read-only", "propose", "direct"].contains(&permission) {
                    return Err("Invalid permission".into());
                }
                self.document_mut(document_id)?
                    .sections
                    .iter_mut()
                    .find(|s| s.id == section_id)
                    .ok_or("Section not found")?
                    .permission = permission.into();
                self.persist()?;
                return Ok(json!({"status":"saved"}));
            }
            "accent" => {
                let s = section.ok_or("Section not found")?;
                let accent = field("accent")?;
                if !accent.chars().all(|c| c.is_ascii_alphabetic() || c == '-') {
                    return Err("Invalid accent".into());
                }
                let body = s
                    .body
                    .lines()
                    .filter(|l| !l.trim().starts_with("<!-- creed:accent="))
                    .collect::<Vec<_>>()
                    .join(newline);
                let marker = if accent == "mono" || accent == "custom" {
                    String::new()
                } else {
                    format!("<!-- creed:accent={accent} -->{newline}")
                };
                source.replace_range(
                    s.body_start..s.end,
                    &format!("{newline}{marker}{}{newline}{newline}", body.trim()),
                );
            }
            "reorder" => {
                let s = section.ok_or("Section not found")?;
                let target = doc
                    .sections
                    .iter()
                    .find(|s| s.id == operation["beforeId"].as_str().unwrap_or(""));
                if target.is_none() && operation["beforeId"].as_str() != Some("") {
                    return Err("Target not found".into());
                }
                if target.is_none_or(|target| s.id != target.id) {
                    let mut chunk = source[s.start..s.end].to_string();
                    if !chunk.ends_with('\n') {
                        chunk.push_str(newline);
                    }
                    source.replace_range(s.start..s.end, "");
                    let index = if let Some(target) = target {
                        if target.start > s.start {
                            target.start - (s.end - s.start)
                        } else {
                            target.start
                        }
                    } else {
                        source.len()
                    };
                    if index == source.len() && !source.ends_with('\n') {
                        source.push_str(newline);
                        source.push_str(&chunk);
                    } else {
                        source.insert_str(index, &chunk);
                    }
                }
            }
            _ => return Err("Unknown document operation".into()),
        }
        let baseline = operation["baseline"].as_str().unwrap_or(&doc.revision);
        self.write(
            document_id,
            baseline,
            source,
            agent.unwrap_or("Edited in Creed"),
        )?;
        if kind == "create" && !section_id.is_empty() {
            let previous_ids: Vec<String> =
                doc.sections.iter().map(|item| item.id.clone()).collect();
            let doc = self.document_mut(document_id)?;
            if let Some(created) = doc
                .sections
                .iter_mut()
                .find(|item| !item.archived && !previous_ids.contains(&item.id))
            {
                created.id = section_id.into();
            }
            self.persist()?;
        }
        let current = self.document_mut(document_id)?;
        if current.activity.len() > doc.activity.len() {
            let after = current.sections.iter().find(|item| item.id == section_id);
            let before = doc.sections.iter().find(|item| item.id == section_id);
            let event = json!({"id":id(),"timestamp":now(),"reason":"Edited in Creed","status":"direct","agent":agent,"sectionId":section_id,"sectionName":after.or(before).map(|s|s.name.as_str()).unwrap_or("Creed"),"accent":after.or(before).map(|s|s.accent.as_str()).unwrap_or("stack"),"beforeText":before.map(|s|s.body.as_str()).unwrap_or(""),"afterText":after.map(|s|s.body.as_str()).unwrap_or("")});
            *current.activity.last_mut().unwrap() = event;
            self.persist()?;
        }
        Ok(json!({"status":"saved"}))
    }
    pub fn propose(
        &mut self,
        document_id: &str,
        baseline: &str,
        operation: &Value,
        agent: &str,
    ) -> Result<String, String> {
        let doc = self.document(document_id)?.clone();
        if doc.revision != baseline {
            return Err(
                "The file changed during this request. Try again against the current file.".into(),
            );
        }
        let kind = operation["kind"].as_str().unwrap_or("");
        if !["body", "create", "rename", "delete", "accent", "reorder"].contains(&kind) {
            return Err("This operation cannot be proposed.".into());
        }
        let section_id = operation["sectionId"].as_str().unwrap_or("");
        if kind != "create"
            && !doc.sections.iter().any(|s| {
                s.id == section_id
                    && !s.archived
                    && !matches!(s.permission.as_str(), "hidden" | "read-only")
            })
        {
            return Err("This section does not permit agent proposals.".into());
        }
        let directory = tempfile::tempdir().map_err(|e| e.to_string())?;
        let mut simulation = self.clone();
        simulation.directory = directory.path().into();
        let path = directory.path().join("validate.md");
        fs::write(&path, &doc.source).map_err(|e| e.to_string())?;
        simulation.document_mut(document_id)?.path = path;
        simulation.operate(document_id, operation, None)?;
        let proposal_id = id();
        self.document_mut(document_id)?.proposals.push(Proposal {
            id: proposal_id.clone(),
            section_id: section_id.into(),
            agent: agent.into(),
            reason: operation["reason"]
                .as_str()
                .unwrap_or("Suggested improvement")
                .into(),
            baseline: baseline.into(),
            operation: operation.clone(),
            created_at: now(),
        });
        self.persist()?;
        Ok(proposal_id)
    }

    pub fn review_many(
        &mut self,
        document_id: &str,
        proposal_ids: &[String],
    ) -> Result<(), String> {
        let before = self.document(document_id)?.clone();
        let mut targets = std::collections::HashSet::new();
        let mut selected = Vec::new();
        for proposal_id in proposal_ids {
            let proposal = before
                .proposals
                .iter()
                .find(|p| &p.id == proposal_id)
                .ok_or("Proposal not found")?;
            if proposal.baseline != before.revision {
                return Err("A selected proposal is stale. Review the current file first.".into());
            }
            if !proposal.section_id.is_empty() && !targets.insert(proposal.section_id.clone()) {
                return Err("Choose one proposal per section before accepting a batch.".into());
            }
            selected.push(proposal.clone());
        }
        if selected.is_empty() {
            return Ok(());
        }
        let directory = tempfile::tempdir().map_err(|e| e.to_string())?;
        let mut simulation = self.clone();
        simulation.directory = directory.path().into();
        let path = directory.path().join("review.md");
        fs::write(&path, &before.source).map_err(|e| e.to_string())?;
        simulation.document_mut(document_id)?.path = path;
        for proposal in &selected {
            simulation.operate(document_id, &proposal.operation, None)?;
        }
        let result = simulation.document(document_id)?.clone();
        self.write(
            document_id,
            &before.revision,
            result.source,
            "Accepted proposals",
        )?;
        let doc = self.document_mut(document_id)?;
        doc.sections = result.sections;
        doc.proposals.retain(|p| !proposal_ids.contains(&p.id));
        if doc.activity.len() > before.activity.len() {
            doc.activity.pop();
        }
        for proposal in selected {
            doc.activity
                .push(review_activity(&before, doc, &proposal, true));
        }
        self.persist()
    }

    pub fn review(
        &mut self,
        document_id: &str,
        proposal_id: &str,
        accept: bool,
    ) -> Result<(), String> {
        let before = self.document(document_id)?.clone();
        let proposal = before
            .proposals
            .iter()
            .find(|p| p.id == proposal_id)
            .ok_or("Proposal not found")?;
        if accept {
            if proposal.baseline != before.revision {
                return Err(
                    "This proposal is stale. Ask the agent to propose against the current file."
                        .into(),
                );
            }
            self.operate(document_id, &proposal.operation, None)?;
        }
        let doc = self.document_mut(document_id)?;
        doc.proposals.retain(|p| p.id != proposal_id);
        if accept && doc.activity.len() > before.activity.len() {
            doc.activity.pop();
        }
        let event = review_activity(&before, doc, proposal, accept);
        doc.activity.push(event);
        self.persist()
    }
}

fn review_activity(
    before: &Document,
    after: &Document,
    proposal: &Proposal,
    accept: bool,
) -> Value {
    let section = before.sections.iter().find(|s| s.id == proposal.section_id);
    let current = after.sections.iter().find(|s| s.id == proposal.section_id);
    json!({"id":id(),"timestamp":now(),"reason":if accept{"Accepted proposal"}else{"Rejected proposal"},"status":if accept{"accepted"}else{"rejected"},"agent":proposal.agent,"proposalId":proposal.id,"sectionId":proposal.section_id,"sectionName":section.map(|s|s.name.as_str()).unwrap_or_else(||proposal.operation["name"].as_str().unwrap_or("Section")),"accent":section.map(|s|s.accent.as_str()).unwrap_or("stack"),"beforeText":section.map(|s|s.body.as_str()).unwrap_or(""),"afterText":if accept{current.map(|s|s.body.as_str()).unwrap_or("")}else{proposal.operation["body"].as_str().unwrap_or("")},"detail":proposal.reason})
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn proposals_follow_unrelated_and_non_overlapping_edits() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("creed.md");
        fs::write(&path, "## Identity\n\nAlpha\nMiddle\nOmega\n\n## Goals\n\nGoal\n").unwrap();
        let mut w = Workspace::load(dir.path().join("state")).unwrap();
        let id = w.open(&path).unwrap();
        let before = w.document(&id).unwrap().clone();
        let target = &before.sections[0];
        let proposed = target.body.replace("Alpha", "Agent");
        let p = w.propose(&id, &before.revision, &json!({"kind":"body", "sectionId":target.id, "body":proposed}), "Test").unwrap();
        fs::write(&path, before.source.replace("Goal\n", "External goal\n")).unwrap();
        w.refresh().unwrap();
        assert_eq!(w.document(&id).unwrap().proposals[0].baseline, w.document(&id).unwrap().revision);
        w.operate(&id, &json!({"kind":"body", "sectionId":before.sections[1].id, "body":"Different goal"}), None).unwrap();
        let doc = w.document(&id).unwrap();
        assert_eq!(doc.proposals[0].baseline, doc.revision);
        let body = doc.sections[0].body.replace("Omega", "User");
        w.operate(&id, &json!({"kind":"body", "sectionId":target.id, "body":body}), None).unwrap();
        let doc = w.document(&id).unwrap();
        assert_eq!(doc.proposals[0].baseline, doc.revision);
        assert!(doc.proposals[0].operation["body"].as_str().unwrap().contains("User"));
        w.review(&id, &p, true).unwrap();
        let source = &w.document(&id).unwrap().source;
        assert!(source.contains("Agent") && source.contains("User") && source.contains("Different goal"));
    }

    #[test]
    fn proposal_merge_preserves_unicode_and_refuses_overlap() {
        assert_eq!(merge_proposal_body("α middle ω", "α middle user", "agent middle ω"), Some("agent middle user".into()));
        assert_eq!(merge_proposal_body("Hello", "User", "Agent"), None);
        assert_eq!(merge_proposal_body("abc", "aXbc", "aYbc"), None);
        assert_eq!(merge_proposal_body("α middle ω", "α! middle ω!", "α MIDDLE ω"), Some("α! MIDDLE ω!".into()));
        assert_eq!(merge_proposal_body("abc", "aXbc", "ac"), Some("aXc".into()));
        assert_eq!(merge_proposal_body("abc", "aXbc", "aXbc!"), Some("aXbc!".into()));
    }

    #[test]
    fn old_stale_proposals_do_not_reappear_on_refresh() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("creed.md");
        fs::write(&path, "## Identity\n\nHello\n").unwrap();
        let mut w = Workspace::load(dir.path().join("state")).unwrap();
        let id = w.open(&path).unwrap();
        let section = w.document(&id).unwrap().sections[0].id.clone();
        w.operate(&id, &json!({"kind":"body","sectionId":section,"body":"New"}), Some("Test")).unwrap();
        w.document_mut(&id).unwrap().proposals[0].baseline = "old-revision".into();
        w.refresh().unwrap();
        assert!(w.document(&id).unwrap().proposals.is_empty());
        w.refresh().unwrap();
        assert!(w.document(&id).unwrap().proposals.is_empty());
        assert_eq!(fs::read_to_string(path).unwrap(), "## Identity\n\nHello\n");
    }

    #[test]
    fn editing_agents_preserves_identity_and_rejects_invalid_changes() {
        let mut workspace = Workspace::default();
        let icon = "data:image/png;base64,iVBORw0KGgo=";
        workspace.add_agent("First", Some(icon)).unwrap();
        workspace.add_agent("Second", Some(icon)).unwrap();
        let id = workspace.custom_agents[0].id.clone();
        assert!(workspace.edit_agent(&id, "Second", Some(icon)).is_err());
        assert_eq!(workspace.custom_agents[0].name, "First");
        workspace.edit_agent(&id, "Renamed", Some(icon)).unwrap();
        assert_eq!(workspace.custom_agents[0].id, id);
        assert_eq!(workspace.custom_agents[0].name, "Renamed");
        workspace.remove_agent(&id).unwrap();
        assert_eq!(workspace.custom_agents.len(), 1);
        assert!(workspace.remove_agent(&id).is_err());
    }

    #[test]
    fn untagged_markdown_is_mono_even_after_an_external_color_removal() {
        let colored = parse("## Identity\n\n<!-- creed:accent=stack -->\n\nText\n", &[]);
        assert_eq!(colored[0].accent, "stack");
        let plain = parse("## Identity\n\nText\n", &colored);
        assert_eq!(plain[0].accent, "mono");
        assert_eq!(plain[0].id, colored[0].id);
    }

    #[test]
    fn reopening_untagged_markdown_does_not_keep_a_cached_blue_accent() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        let source = "## Identity\n\nText\n";
        fs::write(&file, source).unwrap();
        let state_path = directory.path().join("state");
        let mut workspace = Workspace::load(state_path.clone()).unwrap();
        let document_id = workspace.open(&file).unwrap();
        workspace.document_mut(&document_id).unwrap().sections[0].accent = "stack".into();
        workspace.persist().unwrap();
        let reopened = Workspace::load(state_path).unwrap();
        assert_eq!(
            reopened.document(&document_id).unwrap().sections[0].accent,
            "mono"
        );
        assert_eq!(fs::read_to_string(file).unwrap(), source);
    }

    #[test]
    fn mono_removes_the_marker_and_subsequent_edits_keep_it_absent() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        fs::write(
            &file,
            "## Identity\n\n<!-- creed:accent=stack -->\n\nText\n",
        )
        .unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let document_id = workspace.open(&file).unwrap();
        let section_id = workspace.document(&document_id).unwrap().sections[0]
            .id
            .clone();
        workspace
            .operate(
                &document_id,
                &json!({"kind":"accent","sectionId":section_id,"accent":"mono"}),
                None,
            )
            .unwrap();
        assert_eq!(
            workspace.document(&document_id).unwrap().sections[0].accent,
            "mono"
        );
        assert!(!fs::read_to_string(&file).unwrap().contains("creed:accent"));
        workspace
            .operate(
                &document_id,
                &json!({"kind":"body","sectionId":section_id,"body":"Edited"}),
                None,
            )
            .unwrap();
        assert!(!fs::read_to_string(&file).unwrap().contains("creed:accent"));
        assert!(fs::read_to_string(&file).unwrap().contains("Edited"));
    }
    #[test]
    fn batch_proposals_write_once_and_keep_section_history() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        fs::write(&file, "## First\n\nOne\n\n## Second\n\nTwo\n").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let document_id = workspace.open(&file).unwrap();
        let before = workspace.document(&document_id).unwrap().clone();
        let proposals: Vec<String> = before.sections.iter().map(|section| workspace.propose(&document_id, &before.revision, &json!({"kind":"body","sectionId":section.id,"body":format!("Updated {}", section.name)}), "Test agent").unwrap()).collect();
        assert_eq!(fs::read_to_string(&file).unwrap(), before.source);
        workspace.review_many(&document_id, &proposals).unwrap();
        let after = workspace.document(&document_id).unwrap();
        assert!(after.proposals.is_empty());
        assert_eq!(after.history.len(), 1);
        assert_eq!(after.history[0].sections[0].body, before.sections[0].body);
        assert_eq!(
            after
                .activity
                .iter()
                .filter(|entry| entry["status"] == "accepted")
                .count(),
            2
        );
        assert!(after.source.contains("Updated First"));
        assert!(after.source.contains("Updated Second"));
    }

    #[test]
    fn accepting_noop_proposal_does_not_remove_prior_activity() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        fs::write(&file, "## Identity\n\nText\n\n").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let document_id = workspace.open(&file).unwrap();
        let before = workspace.document(&document_id).unwrap().clone();
        workspace
            .document_mut(&document_id)
            .unwrap()
            .activity
            .push(json!({"id":"keep","reason":"Earlier event"}));
        let proposal = workspace.propose(&document_id, &before.revision, &json!({"kind":"reorder","sectionId":before.sections[0].id,"beforeId":before.sections[0].id}), "Test agent").unwrap();
        workspace.review(&document_id, &proposal, true).unwrap();
        assert!(workspace
            .document(&document_id)
            .unwrap()
            .activity
            .iter()
            .any(|entry| entry["id"] == "keep"));
    }

    #[test]
    fn hidden_sections_reject_agent_writes_and_proposals() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        fs::write(&file, "## Identity\n\nPrivate\n").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let document_id = workspace.open(&file).unwrap();
        let before = workspace.document(&document_id).unwrap().clone();
        let section_id = &before.sections[0].id;
        workspace
            .operate(
                &document_id,
                &json!({"kind":"permission","sectionId":section_id,"permission":"hidden"}),
                None,
            )
            .unwrap();
        let operation = json!({"kind":"body","sectionId":section_id,"body":"No"});
        assert!(workspace
            .operate(&document_id, &operation, Some("Agent"))
            .is_err());
        assert!(workspace
            .propose(&document_id, &before.revision, &operation, "Agent")
            .is_err());
        assert_eq!(fs::read_to_string(file).unwrap(), before.source);
    }
    #[test]
    fn section_lifecycle_preserves_identity_and_markdown_boundaries() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        fs::write(&file, "## First\n\nOne\n\n## C#\n\nTwo").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let document = workspace.open(&file).unwrap();
        let sections = workspace.document(&document).unwrap().sections.clone();
        assert_eq!(sections[1].name, "C#");
        workspace
            .operate(
                &document,
                &json!({"kind":"reorder","sectionId":sections[1].id,"beforeId":sections[0].id}),
                None,
            )
            .unwrap();
        assert_eq!(workspace.document(&document).unwrap().sections.len(), 2);
        assert_eq!(
            workspace.document(&document).unwrap().sections[0].id,
            sections[1].id
        );
        workspace
            .operate(
                &document,
                &json!({"kind":"rename","sectionId":sections[0].id,"name":"Identity"}),
                None,
            )
            .unwrap();
        assert!(workspace
            .document(&document)
            .unwrap()
            .sections
            .iter()
            .any(|s| s.id == sections[0].id && s.name == "Identity"));
        workspace
            .operate(
                &document,
                &json!({"kind":"archive","sectionId":sections[0].id}),
                None,
            )
            .unwrap();
        assert!(!fs::read_to_string(&file).unwrap().contains("One"));
        workspace
            .operate(
                &document,
                &json!({"kind":"restore","sectionId":sections[0].id}),
                None,
            )
            .unwrap();
        assert_eq!(
            workspace
                .document(&document)
                .unwrap()
                .sections
                .iter()
                .filter(|s| s.id == sections[0].id)
                .count(),
            1
        );
        assert!(fs::read_to_string(&file).unwrap().contains("One"));
    }
    #[test]
    fn archive_delete_and_duplicate_names_preserve_live_content() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        fs::write(
            &file,
            "## Identity\n\nKeep this\n\n## Goals\n\nArchived body\n",
        )
        .unwrap();
        let mut w = Workspace::load(directory.path().join("state")).unwrap();
        let d = w.open(&file).unwrap();
        let archived = w.document(&d).unwrap().sections[1].id.clone();
        w.operate(&d, &json!({"kind":"archive","sectionId":archived}), None)
            .unwrap();
        let live_source = fs::read_to_string(&file).unwrap();
        w = Workspace::load(directory.path().join("state")).unwrap();
        assert!(w
            .document(&d)
            .unwrap()
            .sections
            .iter()
            .any(|s| s.id == archived && s.archived));
        assert!(w
            .operate(&d, &json!({"kind":"archive","sectionId":archived}), None)
            .is_err());
        w.operate(
            &d,
            &json!({"kind":"create","name":"Goals","body":"New goals"}),
            None,
        )
        .unwrap();
        assert_eq!(
            w.document(&d)
                .unwrap()
                .sections
                .iter()
                .filter(|s| s.id == archived)
                .count(),
            1
        );
        w.operate(&d, &json!({"kind":"restore","sectionId":archived}), None)
            .unwrap();
        let doc = w.document(&d).unwrap();
        assert_eq!(doc.sections.iter().filter(|s| s.name == "Goals").count(), 2);
        assert!(doc
            .sections
            .iter()
            .any(|s| s.id == archived && s.body.contains("Archived body")));
        assert!(w
            .operate(&d, &json!({"kind":"restore","sectionId":archived}), None)
            .is_err());
        w.operate(&d, &json!({"kind":"archive","sectionId":archived}), None)
            .unwrap();
        let before_delete = fs::read_to_string(&file).unwrap();
        w.operate(&d, &json!({"kind":"delete","sectionId":archived}), None)
            .unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), before_delete);
        assert!(before_delete.starts_with(&live_source));
        w = Workspace::load(directory.path().join("state")).unwrap();
        w.refresh().unwrap();
        assert!(!w
            .document(&d)
            .unwrap()
            .sections
            .iter()
            .any(|s| s.id == archived));
        assert!(w.document(&d).unwrap().source.contains("New goals"));
    }

    #[test]
    fn stale_section_drafts_and_nested_sections_are_rejected() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("profile.md");
        fs::write(&file, "## Identity\n\nOriginal\n").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let document = workspace.open(&file).unwrap();
        let section = workspace.document(&document).unwrap().sections[0].clone();
        fs::write(&file, "## Identity\n\nExternal\n").unwrap();
        workspace.refresh().unwrap();
        assert!(workspace.operate(&document, &json!({"kind":"body","sectionId":section.id,"body":"Draft","expectedBody":section.body}), None).is_err());
        assert!(workspace
            .operate(
                &document,
                &json!({"kind":"body","sectionId":section.id,"body":"## Injected\nContent"}),
                None
            )
            .is_err());
        assert!(fs::read_to_string(&file).unwrap().contains("External"));
        fs::remove_file(&file).unwrap();
        workspace.refresh().unwrap();
        assert!(workspace.document(&document).unwrap().missing);
        assert_eq!(workspace.active_id, None);
        assert!(!file.exists());
    }

    #[test]
    fn refresh_switches_from_a_missing_active_creed_to_an_available_one() {
        let directory = tempfile::tempdir().unwrap();
        let first_file = directory.path().join("first.md");
        let second_file = directory.path().join("second.md");
        fs::write(&first_file, "## Identity\n\nFirst\n").unwrap();
        fs::write(&second_file, "## Identity\n\nSecond\n").unwrap();
        let mut workspace = Workspace::load(directory.path().join("state")).unwrap();
        let first = workspace.open(&first_file).unwrap();
        let second = workspace.open(&second_file).unwrap();
        workspace.active_id = Some(first.clone());

        fs::remove_file(&first_file).unwrap();
        workspace.refresh().unwrap();

        assert!(workspace.document(&first).unwrap().missing);
        assert_eq!(workspace.active_id.as_deref(), Some(second.as_str()));
    }
    #[test]
    fn permissions_and_stale_proposals() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("creed.md");
        fs::write(&path, "## Identity\n\nHello\n").unwrap();
        let mut w = Workspace::load(dir.path().join("state")).unwrap();
        let d = w.open(&path).unwrap();
        let s = w.document(&d).unwrap().sections[0].id.clone();
        let result = w
            .operate(
                &d,
                &json!({"kind":"body","sectionId":s,"body":"New"}),
                Some("Test"),
            )
            .unwrap();
        assert_eq!(result["status"], "pending");
        assert!(fs::read_to_string(&path).unwrap().contains("Hello"));
        let p = w.document(&d).unwrap().proposals[0].id.clone();
        fs::write(&path, "## Identity\n\nExternal\n").unwrap();
        w.refresh().unwrap();
        assert!(w.review(&d, &p, true).is_err());
        assert!(w.document(&d).unwrap().proposals.is_empty());
        assert_eq!(fs::read_to_string(&path).unwrap(), "## Identity\n\nExternal\n");
        w.operate(
            &d,
            &json!({"kind":"permission","sectionId":s,"permission":"read-only"}),
            None,
        )
        .unwrap();
        assert!(w
            .operate(
                &d,
                &json!({"kind":"body","sectionId":s,"body":"No"}),
                Some("Test")
            )
            .is_err());
    }
    #[test]
    fn bulk_permissions_preserve_hidden_and_archived_sections() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("creed.md");
        fs::write(
            &path,
            "## One\n\nHello\n\n## Two\n\nHello\n\n## Three\n\nHello\n",
        )
        .unwrap();
        let mut w = Workspace::load(dir.path().join("state")).unwrap();
        let d = w.open(&path).unwrap();
        w.document_mut(&d).unwrap().sections[1].permission = "hidden".into();
        w.document_mut(&d).unwrap().sections[2].archived = true;
        let op = json!({"kind":"permissions","permission":"read-only"});
        assert!(w.operate(&d, &op, Some("Agent")).is_err());
        w.operate(&d, &op, None).unwrap();
        let sections = &w.document(&d).unwrap().sections;
        assert_eq!(sections[0].permission, "read-only");
        assert_eq!(sections[1].permission, "hidden");
        assert_eq!(sections[2].permission, "propose");
        assert!(w
            .operate(
                &d,
                &json!({"kind":"permissions","permission":"hidden"}),
                None
            )
            .is_err());
    }
    #[test]
    fn parse_preserves_fences_and_duplicates() {
        let source = "---\n## metadata\n---\n## A\n```\n## hidden\n```\n## A\ntext\n";
        let sections = parse(source, &[]);
        assert_eq!(sections.len(), 2);
        assert_ne!(sections[0].id, sections[1].id);
        assert_eq!(parse(source, &sections)[0].id, sections[0].id);
    }
}
