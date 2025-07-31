import { supabase } from './supabaseClient.js';

// --- Auth & User ---
export const getActiveUser = async () => { const { data: { user } } = await supabase.auth.getUser(); return user; };
export const signOut = async () => { await supabase.auth.signOut(); };

// --- Generic CRUD Functions for project-linked items ---
const getByProject = async (table, projectId) => { const { data, error } = await supabase.from(table).select('*').eq('project_id', projectId); if (error) console.error(`Error fetching ${table}:`, error); return data || []; };
const add = async (table, record) => { const { data, error } = await supabase.from(table).insert(record).select(); if (error) console.error(`Error adding to ${table}:`, error); return data ? data[0] : null; };
const update = async (table, id, updates) => { const { error } = await supabase.from(table).update(updates).eq('id', id); if (error) console.error(`Error updating ${table}:`, error); };
const remove = async (table, id) => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) console.error(`Error deleting from ${table}:`, error); };

// --- Projects ---
export const getProjects = async () => { const { data, error } = await supabase.from('projects').select('*'); if (error) console.error('Error fetching projects:', error); return data || []; };
export const addProject = async (name) => { const user = await getActiveUser(); if (!user) return null; return add('projects', { name, user_id: user.id }); };
export const deleteProject = async (id) => remove('projects', id);

// --- Team Members ---
export const getTeam = async (projectId) => {
    const { data, error } = await supabase
        .from('team_members')
        .select(`profiles (id, name, role, avatar)`)
        .eq('project_id', projectId);
    if (error) console.error('Error fetching team:', error);
    return (data || []).map(d => d.profiles);
};

export const addTeamMember = async (projectId, userId) => {
    const { error } = await supabase.from('team_members').insert({ project_id: projectId, user_id: userId });
    if (error) console.error('Error adding team member:', error);
};

export const getMember = async (id) => { const { data } = await supabase.from('profiles').select('*').eq('id', id).single(); return data; };

// --- Tasks ---
export const getTasks = (projectId) => getByProject('tasks', projectId);
export const addTask = (data, projectId) => add('tasks', { ...data, project_id: projectId });
export const updateTask = (id, data) => update('tasks', id, data);
export const toggleTaskCompletion = async (id, currentStatus) => update('tasks', id, { completed: !currentStatus });
export const deleteTask = (id) => remove('tasks', id);
export const getTask = async (id) => { const { data } = await supabase.from('tasks').select('*').eq('id', id).single(); return data; };

// --- Milestones ---
export const getMilestones = (projectId) => getByProject('milestones', projectId);
export const addMilestone = (data, projectId) => add('milestones', { ...data, project_id: projectId });
export const updateMilestone = (id, data) => update('milestones', id, data);
export const deleteMilestone = (id) => remove('milestones', id);
export const getMilestone = async (id) => { const { data } = await supabase.from('milestones').select('*').eq('id', id).single(); return data; };

// --- Status Items ---
export const getStatusItems = (projectId) => getByProject('status_items', projectId);
export const addStatusItem = (data, projectId) => add('status_items', { ...data, project_id: projectId });
export const updateStatusItem = (id, data) => update('status_items', id, data);
export const deleteStatusItem = (id) => remove('status_items', id);
export const getStatusItem = async (id) => { const { data } = await supabase.from('status_items').select('*').eq('id', id).single(); return data; };

// --- Gantt Phases ---
export const getGanttPhases = (projectId) => getByProject('gantt_phases', projectId);
export const addGanttPhase = (data, projectId) => add('gantt_phases', { ...data, project_id: projectId });
export const updateGanttPhase = (id, data) => update('gantt_phases', id, data);
export const deleteGanttPhase = (id) => remove('gantt_phases', id);
export const getGanttPhase = async (id) => { const { data } = await supabase.from('gantt_phases').select('*').eq('id', id).single(); return data; };

// --- Risks ---
export const getRisks = (projectId) => getByProject('risks', projectId);
export const addRisk = (data, projectId) => add('risks', { ...data, project_id: projectId });
export const updateRisk = (id, data) => update('risks', id, data);
export const deleteRisk = (id) => remove('risks', id);
export const getRisk = async (id) => { const { data } = await supabase.from('risks').select('*').eq('id', id).single(); return data; };