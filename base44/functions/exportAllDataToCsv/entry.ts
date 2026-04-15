import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const header = keys.map(escape).join(",");
  const lines = rows.map(row => keys.map(k => escape(row[k])).join(","));
  return [header, ...lines].join("\n");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const exportDate = new Date().toISOString().split("T")[0];
    const entities = [
      "Board",
      "Column",
      "Task",
      "Checklist",
      "ChecklistItem",
      "Subtask",
      "Comment",
      "Attachment",
      "ActivityLog",
      "RecurringAutomation",
      "ClientProject",
    ];

    const files = [];
    let totalRows = 0;

    for (const entityName of entities) {
      const records = await base44.asServiceRole.entities[entityName].list();
      const csv = toCSV(records);
      const blob = new Blob([csv], { type: "text/csv" });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: blob });
      files.push({ entity_name: entityName, file_uri, row_count: records.length });
      totalRows += records.length;
    }

    await base44.asServiceRole.entities.DataExport.create({
      export_date: exportDate,
      status: "success",
      files,
      total_rows_exported: totalRows,
    });

    const appUrl = Deno.env.get("APP_URL") || "https://app.base44.com";
    const dataExportsUrl = `${appUrl}/DataExports`;

    await base44.integrations.Core.SendEmail({
      to: "ben@thinkengine.co",
      subject: `Monthly Data Export Complete — ${exportDate}`,
      body: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f1f5f9;margin:0;padding:40px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">THINKENGINE CLOUD</div>
      <div style="font-size:20px;font-weight:700;color:#fff;">Monthly Data Export Complete</div>
    </td></tr>
    <tr><td style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
      <p style="font-size:15px;color:#1e293b;margin:0 0 12px;">Hi Ben,</p>
      <p style="font-size:15px;color:#475569;margin:0 0 20px;">The monthly data export for <strong>${exportDate}</strong> completed successfully.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px;">
        <tr><td style="font-size:13px;color:#64748b;padding:4px 0;"><strong style="color:#1e293b;">Total rows exported:</strong> ${totalRows.toLocaleString()}</td></tr>
        <tr><td style="font-size:13px;color:#64748b;padding:4px 0;"><strong style="color:#1e293b;">Files exported:</strong> ${files.length} entities</td></tr>
      </table>
      <div style="text-align:center;">
        <a href="${dataExportsUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;text-decoration:none;padding:13px 32px;border-radius:7px;font-weight:600;font-size:15px;">View & Download Files</a>
      </div>
    </td></tr>
    <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:16px 32px;text-align:center;">
      <div style="font-size:12px;color:#94a3b8;">ThinkEngine Cloud — Automated Monthly Export</div>
    </td></tr>
  </table>
  </td></tr></table>
</body>
</html>`,
    });

    return Response.json({ success: true, export_date: exportDate, total_rows_exported: totalRows, files_count: files.length });
  } catch (error) {
    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.DataExport.create({
      export_date: new Date().toISOString().split("T")[0],
      status: "failed",
      error_message: error.message,
      files: [],
      total_rows_exported: 0,
    });
    return Response.json({ error: error.message }, { status: 500 });
  }
});