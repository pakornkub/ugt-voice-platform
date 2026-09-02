import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import {
  ComplaintTicket,
  ExecutiveMember,
  GatekeeperOfficer,
  HrAdminMember,
  NotificationItem,
  DepartmentGatekeeperConfig,
  GrievanceCategory,
} from '../types';
import { INITIAL_COMPLAINTS, INITIAL_GATEKEEPER_CONFIGS, INITIAL_NOTIFICATIONS } from '../mockData';
import { INITIAL_EXECUTIVES, INITIAL_HR_ADMINS } from './api';
import { safeStorage } from './safeStorage';

const SQLITE_STORAGE_KEY = 'enterprise_grievance_sqlite_bin_v1';
const SQLITE_WASM_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm';

let SQL_ENGINE: SqlJsStatic | null = null;
let sqliteDbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

/**
 * Initialize sql.js WebAssembly SQLite Database
 */
export async function getSqliteDb(): Promise<Database> {
  if (sqliteDbInstance) {
    return sqliteDbInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!SQL_ENGINE) {
      try {
        SQL_ENGINE = await initSqlJs({
          locateFile: (file) => {
            if (file.endsWith('.wasm')) {
              return SQLITE_WASM_CDN;
            }
            return file;
          },
        });
      } catch (err) {
        console.warn('Failed to load SQL.js via CDN, trying local wasm fallback...', err);
        SQL_ENGINE = await initSqlJs({
          locateFile: () => 'https://sql.js.org/dist/sql-wasm.wasm',
        });
      }
    }

    // Try restoring existing binary from localStorage
    let savedBinary: Uint8Array | null = null;
    try {
      const b64 = safeStorage.getItem(SQLITE_STORAGE_KEY);
      if (b64) {
        const binaryString = atob(b64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        savedBinary = bytes;
      }
    } catch (e) {
      console.warn('Could not read saved SQLite binary from storage:', e);
    }

    if (savedBinary) {
      try {
        sqliteDbInstance = new SQL_ENGINE.Database(savedBinary);
        // Verify tables exist
        const res = sqliteDbInstance.exec(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'"
        );
        if (res.length === 0) {
          bootstrapSchema(sqliteDbInstance);
          seedInitialData(sqliteDbInstance);
        }
      } catch (err) {
        console.error('Failed to load saved SQLite DB, recreating new schema...', err);
        sqliteDbInstance = new SQL_ENGINE.Database();
        bootstrapSchema(sqliteDbInstance);
        seedInitialData(sqliteDbInstance);
      }
    } else {
      sqliteDbInstance = new SQL_ENGINE.Database();
      bootstrapSchema(sqliteDbInstance);
      seedInitialData(sqliteDbInstance);
    }

    persistSqliteToStorage(sqliteDbInstance);
    return sqliteDbInstance;
  })();

  return initPromise;
}

/**
 * Bootstrap Full Relational Schema in SQLite
 */
function bootstrapSchema(db: Database) {
  const schemaSql = `
    -- 1. Main Tickets Table
    CREATE TABLE IF NOT EXISTS tickets (
      tracking_code TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      confidentiality TEXT DEFAULT 'confidential_restricted',
      is_direct_to_executive INTEGER DEFAULT 0,
      urgency TEXT DEFAULT 'medium',
      risk_severity TEXT DEFAULT 'medium',
      sentiment TEXT DEFAULT 'Neutral',
      status TEXT DEFAULT 'submitted',
      gatekeeper_department TEXT,
      assigned_officer_name TEXT,
      assigned_officer_email TEXT,
      location_or_unit TEXT,
      submitter_name TEXT,
      submitter_department TEXT,
      submitter_email TEXT,
      submitter_phone TEXT,
      sla_target_hours INTEGER DEFAULT 48,
      sla_status TEXT DEFAULT 'on_track',
      root_cause_category TEXT,
      root_cause_summary TEXT,
      preventive_action_plan TEXT,
      cluster_group TEXT,
      resolution_summary TEXT,
      resolved_at TEXT,
      closed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      attachments_json TEXT,
      timeline_json TEXT,
      evaluation_json TEXT,
      raw_json TEXT
    );

    -- 2. Ticket Timeline Logs Table (Normalized for JOIN and Time-series)
    CREATE TABLE IF NOT EXISTS ticket_timeline (
      id TEXT PRIMARY KEY,
      ticket_tracking_code TEXT NOT NULL,
      status TEXT,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      notes TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (ticket_tracking_code) REFERENCES tickets(tracking_code) ON DELETE CASCADE
    );

    -- 3. Ticket CSAT Evaluations Table (Normalized)
    CREATE TABLE IF NOT EXISTS ticket_evaluations (
      ticket_tracking_code TEXT PRIMARY KEY,
      overall_score INTEGER NOT NULL,
      speed_rating INTEGER DEFAULT 5,
      resolution_quality_rating INTEGER DEFAULT 5,
      service_manner_rating INTEGER DEFAULT 5,
      is_resolved_permanently INTEGER DEFAULT 1,
      feedback_comment TEXT,
      improvement_suggestions TEXT,
      evaluated_at TEXT NOT NULL,
      FOREIGN KEY (ticket_tracking_code) REFERENCES tickets(tracking_code) ON DELETE CASCADE
    );

    -- 4. Gatekeeper Officers Table
    CREATE TABLE IF NOT EXISTS gatekeeper_officers (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      is_lead INTEGER DEFAULT 0,
      updated_at TEXT
    );

    -- 5. Executives & Whistleblower Table
    CREATE TABLE IF NOT EXISTS executive_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      role_type TEXT NOT NULL,
      is_primary_whistleblower_receiver INTEGER DEFAULT 1,
      can_view_confidential_identities INTEGER DEFAULT 1,
      receive_alert_notifications INTEGER DEFAULT 1,
      assigned_committees_json TEXT,
      status TEXT DEFAULT 'active',
      updated_at TEXT
    );

    -- 6. HR Admins Table
    CREATE TABLE IF NOT EXISTS hr_admin_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      role_level TEXT NOT NULL,
      can_manage_rbac INTEGER DEFAULT 1,
      can_manage_gatekeepers INTEGER DEFAULT 1,
      can_manage_executives INTEGER DEFAULT 1,
      receive_system_alerts INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      updated_at TEXT
    );

    -- 7. Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      ticket_tracking_code TEXT,
      type TEXT DEFAULT 'info',
      timestamp TEXT NOT NULL,
      read INTEGER DEFAULT 0
    );

    -- 8. Metadata Table
    CREATE TABLE IF NOT EXISTS db_metadata (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    -- Indexes for high-speed analytical queries
    CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_sla_status ON tickets(sla_status);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
    CREATE INDEX IF NOT EXISTS idx_timeline_code ON ticket_timeline(ticket_tracking_code);
  `;

  db.run(schemaSql);
}

/**
 * Seed initial sample records into SQLite
 */
function seedInitialData(db: Database) {
  // 1. Seed tickets
  INITIAL_COMPLAINTS.forEach((ticket) => {
    insertOrUpdateTicketInSqlite(db, ticket);
  });

  // 2. Seed gatekeeper configs from Record<GrievanceCategory, DepartmentGatekeeperConfig>
  Object.entries(INITIAL_GATEKEEPER_CONFIGS).forEach(([category, config]) => {
    config.officers.forEach((off) => {
      db.run(
        `INSERT OR REPLACE INTO gatekeeper_officers (
          id, category, name, role_title, email, phone, is_lead, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          off.id,
          category,
          off.name,
          off.roleTitle,
          off.email,
          off.phone || '',
          off.isLead ? 1 : 0,
          config.updatedAt || new Date().toISOString(),
        ]
      );
    });
  });

  // 3. Seed executives
  INITIAL_EXECUTIVES.forEach((exec) => {
    db.run(
      `INSERT OR REPLACE INTO executive_members (
        id, name, position, department, email, phone, role_type,
        is_primary_whistleblower_receiver, can_view_confidential_identities, receive_alert_notifications,
        assigned_committees_json, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exec.id,
        exec.name,
        exec.position,
        exec.department,
        exec.email,
        exec.phone || '',
        exec.roleType,
        exec.isPrimaryWhistleblowerReceiver ? 1 : 0,
        exec.canViewConfidentialIdentities ? 1 : 0,
        exec.receiveAlertNotifications ? 1 : 0,
        JSON.stringify(exec.assignedCommittees || []),
        exec.status,
        exec.updatedAt,
      ]
    );
  });

  // 4. Seed HR Admins
  INITIAL_HR_ADMINS.forEach((adm) => {
    db.run(
      `INSERT OR REPLACE INTO hr_admin_members (
        id, name, position, department, email, phone, role_level,
        can_manage_rbac, can_manage_gatekeepers, can_manage_executives, receive_system_alerts,
        status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adm.id,
        adm.name,
        adm.position,
        adm.department,
        adm.email,
        adm.phone || '',
        adm.roleLevel,
        adm.canManageRbac ? 1 : 0,
        adm.canManageGatekeepers ? 1 : 0,
        adm.canManageExecutives ? 1 : 0,
        adm.receiveSystemAlerts ? 1 : 0,
        adm.status,
        adm.updatedAt,
      ]
    );
  });

  // 5. Seed Notifications
  INITIAL_NOTIFICATIONS.forEach((n) => {
    db.run(
      `INSERT OR REPLACE INTO notifications (id, title, message, ticket_tracking_code, type, timestamp, read)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.title, n.message, n.trackingCode || '', n.type, n.timestamp, n.read ? 1 : 0]
    );
  });

  // 6. DB Metadata
  db.run(
    `INSERT OR REPLACE INTO db_metadata (key, value, updated_at) VALUES ('version', '3.0.0', ?), ('initialized_at', ?, ?)`,
    [new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
  );
}

/**
 * Insert or replace a single ticket in SQLite
 */
export function insertOrUpdateTicketInSqlite(db: Database, ticket: ComplaintTicket) {
  const insertSql = `
    INSERT OR REPLACE INTO tickets (
      tracking_code, type, category, title, description, confidentiality,
      is_direct_to_executive, urgency, risk_severity, sentiment, status,
      gatekeeper_department, assigned_officer_name, assigned_officer_email,
      location_or_unit, submitter_name, submitter_department, submitter_email, submitter_phone,
      sla_target_hours, sla_status, root_cause_category, root_cause_summary,
      preventive_action_plan, cluster_group, resolution_summary, resolved_at, closed_at,
      created_at, updated_at, attachments_json, timeline_json, evaluation_json, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `;

  db.run(insertSql, [
    ticket.trackingCode,
    ticket.type,
    ticket.category,
    ticket.title,
    ticket.description,
    ticket.confidentiality || 'confidential_restricted',
    ticket.isDirectToExecutive ? 1 : 0,
    ticket.urgency,
    ticket.riskSeverity,
    ticket.sentiment || 'Neutral',
    ticket.status,
    ticket.gatekeeperDepartment || '',
    ticket.assignedOfficerName || '',
    ticket.assignedOfficerEmail || '',
    ticket.locationOrUnit || '',
    ticket.submitterName || '',
    ticket.submitterDepartment || '',
    ticket.submitterEmail || '',
    ticket.submitterPhone || '',
    ticket.slaTargetHours || 48,
    ticket.slaStatus || 'on_track',
    ticket.rootCauseCategory || '',
    ticket.rootCauseSummary || '',
    ticket.preventiveActionPlan || '',
    ticket.clusterGroup || '',
    ticket.resolutionSummary || '',
    ticket.resolvedAt || '',
    ticket.closedAt || '',
    ticket.createdAt,
    ticket.updatedAt || ticket.createdAt,
    JSON.stringify(ticket.attachments || []),
    JSON.stringify(ticket.timeline || []),
    ticket.evaluation ? JSON.stringify(ticket.evaluation) : null,
    JSON.stringify(ticket),
  ]);

  // Sync timeline logs
  if (ticket.timeline && ticket.timeline.length > 0) {
    ticket.timeline.forEach((item) => {
      db.run(
        `INSERT OR REPLACE INTO ticket_timeline (id, ticket_tracking_code, status, action, actor, notes, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id || `${ticket.trackingCode}_${item.timestamp}`,
          ticket.trackingCode,
          item.status || '',
          item.action,
          item.actor,
          item.notes || '',
          item.timestamp,
        ]
      );
    });
  }

  // Sync evaluation
  if (ticket.evaluation) {
    db.run(
      `INSERT OR REPLACE INTO ticket_evaluations (
        ticket_tracking_code, overall_score, speed_rating, resolution_quality_rating,
        service_manner_rating, is_resolved_permanently, feedback_comment, improvement_suggestions, evaluated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket.trackingCode,
        ticket.evaluation.overallScore,
        ticket.evaluation.speedRating || 5,
        ticket.evaluation.resolutionQualityRating || 5,
        ticket.evaluation.serviceMannerRating || 5,
        ticket.evaluation.isResolvedPermanently ? 1 : 0,
        ticket.evaluation.feedbackComment || '',
        ticket.evaluation.improvementSuggestions || '',
        ticket.evaluation.evaluatedAt || new Date().toISOString(),
      ]
    );
  }
}

/**
 * Persist SQLite Database binary to localStorage
 */
export function persistSqliteToStorage(db: Database) {
  try {
    const data = db.export();
    // Convert Uint8Array to base64
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64 = btoa(binary);
    safeStorage.setItem(SQLITE_STORAGE_KEY, base64);
  } catch (err) {
    console.warn('Unable to persist SQLite to localStorage (may exceed quota):', err);
  }
}

/**
 * Save array of tickets to SQLite and persist
 */
export async function syncAllTicketsToSqlite(tickets: ComplaintTicket[]) {
  const db = await getSqliteDb();
  tickets.forEach((t) => insertOrUpdateTicketInSqlite(db, t));
  persistSqliteToStorage(db);
}

/**
 * Read all tickets from SQLite
 */
export async function getAllTicketsFromSqlite(): Promise<ComplaintTicket[]> {
  const db = await getSqliteDb();
  const results = db.exec('SELECT raw_json FROM tickets ORDER BY created_at DESC');
  if (results.length === 0 || !results[0].values) {
    return [];
  }
  return results[0].values.map((row) => JSON.parse(row[0] as string));
}

/**
 * Export SQLite file directly for user download (.sqlite database binary)
 */
export async function downloadSqliteDatabaseFile(customFilename?: string): Promise<void> {
  const db = await getSqliteDb();
  const binaryData = db.export();
  const blob = new Blob([binaryData], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = customFilename || `enterprise_grievance_${dateStr}.sqlite`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import a .sqlite file from disk and replace current state
 */
export async function importSqliteDatabaseFile(file: File): Promise<number> {
  if (!SQL_ENGINE) {
    await getSqliteDb();
  }
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  sqliteDbInstance = new SQL_ENGINE!.Database(uint8);

  persistSqliteToStorage(sqliteDbInstance);

  // Count imported tickets
  const res = sqliteDbInstance.exec('SELECT count(*) FROM tickets');
  const count = (res[0]?.values[0]?.[0] as number) || 0;
  return count;
}

/**
 * Run arbitrary SQL Query for analytics and return tabular results
 */
export async function executeSqlAnalyticsQuery(
  sqlQuery: string
): Promise<{ columns: string[]; rows: unknown[][]; executionTimeMs: number; error?: string }> {
  const start = performance.now();
  try {
    const db = await getSqliteDb();
    const results = db.exec(sqlQuery);
    const end = performance.now();

    if (results.length === 0) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: Math.round(end - start),
      };
    }

    return {
      columns: results[0].columns,
      rows: results[0].values,
      executionTimeMs: Math.round((end - start) * 10) / 10,
    };
  } catch (err) {
    const end = performance.now();
    return {
      columns: [],
      rows: [],
      executionTimeMs: Math.round(end - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
