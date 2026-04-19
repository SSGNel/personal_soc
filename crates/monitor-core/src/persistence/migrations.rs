use rusqlite::Connection;
use anyhow::Result;

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;
    ")?;

    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ")?;

    let version: i64 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    )?;

    if version < 1 {
        conn.execute_batch(include_str!("../../../../database/migrations/001_initial.sql"))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (?1)", [1])?;
    }

    if version < 2 {
        conn.execute_batch(include_str!("../../../../database/migrations/002_password_manager.sql"))?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (?1)", [2])?;
    }

    Ok(())
}
