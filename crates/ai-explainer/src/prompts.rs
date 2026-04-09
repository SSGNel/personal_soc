use shared_types::models::{AiContext, SignerStatus, PathCategory};

pub fn build_system_prompt() -> String {
    r#"You are a Windows security assistant embedded in a personal security monitoring tool.
Your role is to explain process behavior clearly and help users make informed decisions.

Guidelines:
- Write in plain text only. No markdown, no ## headers, no ** bold, no bullet points with dashes.
- Use short labeled sections like "What it is:", "Why it may be suspicious:", "Evidence:", "Next step:" on their own lines.
- Explain findings in plain English, avoiding excessive jargon.
- Be honest about uncertainty: use "appears to", "may indicate", "based on available evidence".
- Do NOT claim certainty about whether something is definitively malware.
- Keep responses concise and actionable — 4 to 6 sentences total.
- Never suggest killing system-critical processes (svchost, lsass, winlogon) without strong caveats.

You receive structured telemetry, not raw system access. Work with what you have."#.to_string()
}

pub fn build_process_context_prompt(ctx: &AiContext, question: &str) -> String {
    let signer_str = match &ctx.signer_status {
        SignerStatus::Signed => "digitally signed",
        SignerStatus::Unsigned => "unsigned (no valid signature)",
        SignerStatus::InvalidSignature => "has an invalid/tampered signature",
        SignerStatus::Unknown => "signature status unknown",
    };

    let path_str = match &ctx.path_category {
        PathCategory::System => "system directory (Windows/System32)",
        PathCategory::ProgramFiles => "Program Files",
        PathCategory::UserWritable => "user-writable location",
        PathCategory::Temp => "Temp directory",
        PathCategory::Downloads => "Downloads folder",
        PathCategory::AppData => "AppData directory",
        PathCategory::Unknown => "unknown location",
    };

    let rules_str = if ctx.triggered_rules.is_empty() {
        "No suspicious rules triggered.".to_string()
    } else {
        ctx.triggered_rules.iter()
            .map(|r| format!("- [{}] {}", r.rule_key, r.explanation))
            .collect::<Vec<_>>()
            .join("\n")
    };

    format!(
        r#"Process Telemetry:
- Name: {}
- Path: {} (categorized as: {})
- Signature: {}
- Hash: {}
- Parent Process: {}
- Command Line: {}
- Risk Score: {}/100
- Recent CPU: {:.1}%
- Recent Memory: {:.0} MB
- Startup Linked: {}
- Network Active: {}

Triggered Security Rules:
{}

User Question: {}

Please analyze this process and answer the user's question."#,
        ctx.process_name,
        ctx.exe_path.as_deref().unwrap_or("unknown"),
        path_str,
        signer_str,
        ctx.file_hash.as_deref().unwrap_or("not computed"),
        ctx.parent_process_name.as_deref().unwrap_or("unknown"),
        ctx.command_line.as_deref().unwrap_or("not available"),
        ctx.risk_score,
        ctx.recent_cpu_avg,
        ctx.recent_memory_mb,
        if ctx.startup_linked { "yes" } else { "no" },
        if ctx.network_active { "yes" } else { "no" },
        rules_str,
        question,
    )
}

/// System prompt for the general PC assistant (not process-specific).
pub fn build_general_system_prompt() -> String {
    r#"You are an AI security and performance assistant built into Threat-Guard, a Windows desktop monitoring tool.
You have access to real-time telemetry about the user's PC: running processes, security alerts, startup entries, and system resource usage.

Guidelines:
- Write in plain text only. No markdown, no ## headers, no ** bold, no bullet lists with dashes.
- Use short labeled sections like "Assessment:", "Possible Causes:", "Recommendation:", "What I see:" on their own lines.
- Speak plainly — the user may not be a security expert. Avoid jargon.
- Be honest about uncertainty. Use "appears to", "may indicate", "based on available data".
- Never claim certainty about whether something is definitely malware.
- Keep responses focused and actionable — 5 to 10 sentences total.
- If asked about high CPU or memory, reference the actual process data provided.
- If asked about startup entries, evaluate their signature and path specifically.
- If the system looks healthy, say so clearly and reassure the user.
- You can answer general PC questions (performance, security, startup) using the telemetry provided.

You receive a snapshot of system telemetry. Work with what is provided."#.to_string()
}

/// Builds the user-turn prompt with full system context and the user's question.
pub fn build_system_context_prompt(context: &str, question: &str) -> String {
    format!(
        "Current System Snapshot:\n{}\n\nUser Question: {}\n\nAnalyze the data above and answer the question.",
        context, question
    )
}

pub fn build_summary_prompt(alert_count: u32, high_count: u32, process_summary: &str) -> String {
    format!(
        r#"Security Summary Request:
- Total alerts today: {}
- High severity alerts: {}
- Process activity summary: {}

Please provide a brief plain-English summary of today's security activity and any recommended actions."#,
        alert_count, high_count, process_summary
    )
}
