import { query } from '../config/db.js';

export async function createTask(teamId, input) {
  const { rows } = await query(
    `INSERT INTO tasks (team_id, title, assigned_to, status, due_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [teamId, input.title, input.assignedTo ?? null, input.status ?? 'todo', input.dueDate ?? null]
  );
  return rows[0];
}

export async function getTaskById(id) {
  const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function updateTask(id, input) {
  const columnMap = { title: 'title', assignedTo: 'assigned_to', status: 'status', dueDate: 'due_date' };
  const fields = Object.entries(columnMap).filter(([key]) => input[key] !== undefined);
  const assignments = fields.map(([, column], index) => `${column} = $${index + 1}`).join(', ');
  const { rows } = await query(`UPDATE tasks SET ${assignments} WHERE id = $${fields.length + 1} RETURNING *`, [
    ...fields.map(([key]) => input[key]), id
  ]);
  return rows[0] ?? null;
}
