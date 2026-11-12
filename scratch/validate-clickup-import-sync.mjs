import mongoose from 'mongoose';
import webhook from '../server-dist/api/webhook.js';
process.env.PRODUCTSHIP_WEBHOOK_SECRET = 'validation-secret';
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const n = Date.now();
const org = `clickup-validation-${n}`;
const external = `ticket-${n}`;
const id = `productship:${org}:development:${external}`;
const previousDebug = await db.collection('globalsettings').findOne({ key: '_webhookLastEvent' });
const call = async (body, headers = {}) => { let result; const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { result = { status: this.statusCode, body: b }; } }; await webhook({ method: 'POST', headers, body }, res); return result; };
try {
  const created = await call({ event: 'ticket_created', organizationId: org, environment: 'development', externalTicketId: external, category: 'Bug', title: 'ClickUp metadata validation', description: 'temporary', raisedByName: 'Validation', clickupLink: 'https://app.clickup.com/t/14yjhfprprb', createdFrom: 'Validation' }, { authorization: 'Bearer validation-secret' });
  const imported = await db.collection('dailyissues').findOne({ id });
  await db.collection('dailyissues').updateOne({ id }, { $set: { clickupStatus: 'stale-test', clickupAssignee: '', clickupSubtasksCount: 99 } });
  const later = await call({ event: 'taskUpdated', history_items: [], task_id: '14yjhfprprb', team_id: '43314990', webhook_id: 'validation' });
  const refreshed = await db.collection('dailyissues').findOne({ id });
  const real = await db.collection('dailyissues').findOne({ externalTicketId: 'c4ab630c-0c1d-4821-9170-cf14dd6aac75' }, { projection: { _id: 0, clickupStatus: 1, clickupAssignee: 1, clickupSubtasksCount: 1, clickupTaskId: 1 } });
  const summary = { createStatus: created.status, initialMetadataReported: created.body.clickupMetadataUpdated, initialStatus: imported.clickupStatus, initialAssignee: imported.clickupAssignee, taskIdStored: imported.clickupTaskId, webhookStatus: later.status, webhookMatched: later.body.matchedCount, refreshedStatus: refreshed.clickupStatus, refreshedAssignee: refreshed.clickupAssignee, refreshedSubtasks: refreshed.clickupSubtasksCount, realTicket: real };
  console.log(JSON.stringify(summary));
  if (!(summary.createStatus === 200 && summary.initialMetadataReported && summary.initialStatus === 'resolved' && summary.initialAssignee === 'Anushka Tiwari' && summary.taskIdStored === '14yjhfprprb' && summary.webhookStatus === 200 && summary.webhookMatched >= 1 && summary.refreshedStatus === 'resolved' && summary.refreshedAssignee === 'Anushka Tiwari' && summary.refreshedSubtasks === 0 && real?.clickupStatus === 'resolved')) process.exitCode = 1;
} finally {
  await db.collection('dailyissues').deleteOne({ id });
  if (previousDebug) await db.collection('globalsettings').replaceOne({ key: '_webhookLastEvent' }, previousDebug, { upsert: true }); else await db.collection('globalsettings').deleteOne({ key: '_webhookLastEvent' });
  console.log(JSON.stringify({ cleanupRemaining: await db.collection('dailyissues').countDocuments({ id }) }));
  await mongoose.disconnect();
}
