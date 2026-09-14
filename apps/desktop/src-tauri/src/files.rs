use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
};

#[derive(Debug, Serialize)]
pub struct Snapshot {
    pub id: u64,
    pub path: PathBuf,
    pub source: String,
    pub revision: String,
}

#[derive(Default)]
pub struct Documents {
    paths: HashMap<u64, PathBuf>,
    next_id: u64,
}

fn revision(source: &str) -> String {
    format!("{:x}", Sha256::digest(source.as_bytes()))
}

pub fn rename_file(path: &Path, name: &str) -> Result<PathBuf, String> {
    let name = name.trim();
    let stem = if name.to_ascii_lowercase().ends_with(".md") {
        &name[..name.len() - 3]
    } else {
        name
    };
    if stem.is_empty()
        || stem.contains(['/', '\\', '\0', '\n', '\r'])
        || stem == "."
        || stem == ".."
    {
        return Err("Choose a valid file name.".into());
    }
    let target = path.with_file_name(format!("{stem}.md"));
    if target == path {
        return Ok(target);
    }
    if target.exists() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            let before = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
            let after = fs::symlink_metadata(&target).map_err(|e| e.to_string())?;
            let case_only = path
                .file_name()
                .unwrap()
                .to_string_lossy()
                .eq_ignore_ascii_case(&target.file_name().unwrap().to_string_lossy());
            if case_only && before.ino() == after.ino() && before.dev() == after.dev() {
                fs::rename(path, &target).map_err(|e| e.to_string())?;
                return Ok(target);
            }
        }
        return Err("A file with that name already exists.".into());
    }
    // Creating a link fails atomically if another file appears at the destination.
    fs::hard_link(path, &target).map_err(|e| e.to_string())?;
    if let Err(error) = fs::remove_file(path) {
        let _ = fs::remove_file(&target);
        return Err(error.to_string());
    }
    Ok(target)
}

fn read(id: u64, path: &Path) -> Result<Snapshot, String> {
    let source = fs::read_to_string(path).map_err(|error| error.to_string())?;
    Ok(Snapshot {
        id,
        path: path.to_owned(),
        revision: revision(&source),
        source,
    })
}

impl Documents {
    pub fn open(&mut self, path: &Path) -> Result<Snapshot, String> {
        let path = fs::canonicalize(path).map_err(|error| error.to_string())?;
        if !path.is_file() {
            return Err("Choose a Markdown file.".into());
        }
        if let Some((&id, _)) = self.paths.iter().find(|(_, known)| **known == path) {
            return read(id, &path);
        }
        let id = self
            .next_id
            .checked_add(1)
            .ok_or("Document limit reached.")?;
        let snapshot = read(id, &path)?;
        self.next_id = id;
        self.paths.insert(id, path);
        Ok(snapshot)
    }

    pub fn create(&mut self, path: &Path, source: &str) -> Result<Snapshot, String> {
        let parent = path.parent().ok_or("Choose a file location.")?;
        let mut temporary =
            tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
        temporary
            .write_all(source.as_bytes())
            .map_err(|error| error.to_string())?;
        temporary
            .as_file()
            .sync_all()
            .map_err(|error| error.to_string())?;
        temporary
            .persist_noclobber(path)
            .map_err(|error| error.to_string())?;
        self.open(path)
    }

    pub fn snapshot(&self, id: u64) -> Result<Snapshot, String> {
        read(id, self.paths.get(&id).ok_or("Open the file first.")?)
    }

    pub fn save(&self, id: u64, expected: &str, source: &str) -> Result<Snapshot, String> {
        let current = self.snapshot(id)?;
        if current.revision != expected {
            return Err(
                "The file changed outside Creed. Resolve the changes before saving.".into(),
            );
        }
        if current.source == source {
            return Ok(current);
        }
        let parent = current
            .path
            .parent()
            .ok_or("The file location is unavailable.")?;
        let permissions = fs::metadata(&current.path)
            .map_err(|error| error.to_string())?
            .permissions();
        if permissions.readonly() {
            return Err("The file is read-only.".into());
        }
        let mut temporary =
            tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
        temporary
            .as_file()
            .set_permissions(permissions)
            .map_err(|error| error.to_string())?;
        temporary
            .write_all(source.as_bytes())
            .map_err(|error| error.to_string())?;
        temporary
            .as_file()
            .sync_all()
            .map_err(|error| error.to_string())?;
        if self.snapshot(id)?.revision != expected {
            return Err("The file changed while saving. Your edits have not replaced it.".into());
        }
        temporary
            .persist(&current.path)
            .map_err(|error| error.to_string())?;
        read(id, &current.path)
    }

    pub fn forget(&mut self, id: u64) -> Result<(), String> {
        self.paths.remove(&id).ok_or("The file is not open.")?;
        Ok(())
    }

    pub fn move_to_trash(&mut self, id: u64, expected: &str) -> Result<(), String> {
        let current = self.snapshot(id)?;
        if current.revision != expected {
            return Err("The file changed. Review it before deleting.".into());
        }
        trash::delete(&current.path).map_err(|error| error.to_string())?;
        self.paths.remove(&id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rename_preserves_content_and_only_rejects_real_collisions() {
        let directory = tempfile::tempdir().unwrap();
        let original = directory.path().join("creed.md");
        fs::write(&original, "unchanged").unwrap();
        let renamed = rename_file(&original, "Personal").unwrap();
        assert!(!original.exists());
        assert_eq!(renamed.file_name().unwrap(), "Personal.md");
        assert_eq!(rename_file(&renamed, "Personal.md").unwrap(), renamed);
        let lower = rename_file(&renamed, "personal").unwrap();
        let other = directory.path().join("other.md");
        fs::write(&other, "other content").unwrap();
        assert!(rename_file(&lower, "other").is_err());
        let final_path = rename_file(&lower, "Final").unwrap();
        assert_eq!(fs::read_to_string(final_path).unwrap(), "unchanged");
        assert_eq!(fs::read_to_string(other).unwrap(), "other content");
    }

    #[test]
    fn opening_and_forgetting_preserves_file() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("creed.md");
        let source = "---\r\ncustom: yes\r\n---\r\n## Identity\r\n";
        fs::write(&path, source).unwrap();
        let mut documents = Documents::default();
        let snapshot = documents.open(&path).unwrap();
        assert_eq!(snapshot.source, source);
        assert_eq!(documents.open(&path).unwrap().id, snapshot.id);
        documents.forget(snapshot.id).unwrap();
        assert_eq!(fs::read_to_string(path).unwrap(), source);
        assert!(documents.snapshot(snapshot.id).is_err());
    }

    #[test]
    fn stale_saves_and_creation_do_not_overwrite() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("creed.md");
        let mut documents = Documents::default();
        let first = documents.create(&path, "original").unwrap();
        assert!(documents.create(&path, "replacement").is_err());
        fs::write(&path, "external edit").unwrap();
        assert!(documents
            .save(first.id, &first.revision, "local edit")
            .is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "external edit");
        fs::remove_file(&path).unwrap();
        assert!(documents
            .save(first.id, &first.revision, "recreated")
            .is_err());
        assert!(!path.exists());
    }

    #[test]
    fn save_updates_revision_and_content() {
        let directory = tempfile::tempdir().unwrap();
        let mut documents = Documents::default();
        let first = documents
            .create(&directory.path().join("creed.md"), "before")
            .unwrap();
        let saved = documents.save(first.id, &first.revision, "after").unwrap();
        assert_ne!(saved.revision, first.revision);
        assert_eq!(saved.source, "after");
    }
}
