import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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