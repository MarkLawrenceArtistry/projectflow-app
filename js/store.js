import { ui } from './ui.js';

class Task {
    constructor(id, name, description, assignedTo, startDate, endDate, category, priority, completed = false, acknowledged = false, progress = 0, pendingCompletion = false) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.assignedTo = assignedTo;
        this.startDate = startDate;
        this.endDate = endDate;
        this.category = category;
        this.priority = priority;
        this.completed = completed;
        this.acknowledged = acknowledged;
        this.progress = progress;
        this.pendingCompletion = pendingCompletion;
    }
}
class TeamMember { constructor(id, name, role, avatar) { this.id = id; this.name = name; this.role = role; this.avatar = avatar; } }
class Milestone { constructor(id, name, startDate, endDate) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; } }
class StatusItem { constructor(id, name, progress, color) { this.id = id; this.name = name; this.progress = progress; this.color = color; } }
class GanttPhase { constructor(id, name, startDate, endDate, color) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; this.color = color || '#e74c3c'; } }
class Risk { constructor(id, description, impact, priority) { this.id = id; this.description = description; this.impact = impact; this.priority = priority; } }
class Project { constructor(id, name) { this.id = id; this.name = name; this.tasks = []; this.team = {}; this.milestones = []; this.statusItems = []; this.ganttPhases = []; this.risks = []; } }
class User { constructor(id, name, email, password, role = 'member') { this.id = id; this.name = name; this.email = email; this.password = password; this.role = role; } }

function snakeToCamel(obj) {
    if (Array.isArray(obj)) {
        return obj.map(v => snakeToCamel(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/([-_][a-z])/ig, ($1) => {
                return $1.toUpperCase().replace('-', '').replace('_', '');
            });
            result[camelKey] = snakeToCamel(obj[key]);
            return result;
        }, {});
    }
    return obj;
}

function camelToSnake(obj) {
    if (Array.isArray(obj)) {
        return obj.map(v => camelToSnake(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = camelToSnake(obj[key]);
            return result;
        }, {});
    }
    return obj;
}

class Store {
    constructor() {
        this.supabase = null;
        this.app = null;
        this.users = [];
        this.currentUser = null;
        this.onlineUsers = [];
        this.projects = [];
        this.activeProjectId = null;
        this.dataLoaded = false;
        this.subscriptions = [];
    }

    init(supabase, app) {
        this.supabase = supabase;
        this.app = app;
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.handleLogin(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.handleLogout();
            }
        });
        this.checkSession();
    }

    async handleLogin(user) {
        const { data: profile, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            this.logout();
            return;
        }

        this.currentUser = { ...user, ...profile };
        this.onlineUsers = [{ name: this.currentUser.name, role: this.currentUser.role }];
        await this.loadInitialData();
    }

    handleLogout() {
        this.currentUser = null;
        sessionStorage.removeItem('projectflow_activeProjectId');
        this.subscriptions.forEach(sub => this.supabase.removeChannel(sub));
        this.subscriptions = [];
        window.location.reload();
    }

    async checkSession() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            await this.handleLogin(session.user);
        } else {
            this.app.showLogin();
        }
    }

    async login(email, password) {
        const { error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
        }
    }

    async register(name, email, password) {
        alert("Registration is currently disabled. Please ask an admin to create an account for you.");
    }

    async logout() {
        await this.supabase.auth.signOut();
    }

    async changePassword(newPassword) {
        if (!this.currentUser) return;
        const { error } = await this.supabase.auth.updateUser({ password: newPassword });
        if (error) {
            alert(error.message);
        } else {
            alert('Password updated successfully!');
        }
    }

    async loadInitialData() {
        if (!this.currentUser) return;
        ui.showLoader();

        const { data: profiles, error: profilesError } = await this.supabase.from('profiles').select('*');
        if (profilesError) { console.error(profilesError); ui.hideLoader(); return; }
        this.users = snakeToCamel(profiles);

        const { data: projectData, error: projectsError } = await this.supabase.from('projects').select(`
            id, name,
            project_members ( user_id, profile_role, avatar ),
            tasks ( * ),
            milestones ( * ),
            status_items ( * ),
            gantt_phases ( * ),
            risks ( * )
        `);
        if (projectsError) { console.error(projectsError); ui.hideLoader(); return; }

        this.projects = projectData.map(p => {
            const project = new Project(p.id, p.name);
            project.team = {};
            p.project_members.forEach(m => {
                project.team[m.user_id] = {
                    userId: m.user_id,
                    profileRole: m.profile_role,
                    avatar: m.avatar
                };
            });
            project.tasks = snakeToCamel(p.tasks).map(t => new Task(t.id, t.name, t.description, t.assignedTo, t.startDate, t.endDate, t.category, t.priority, t.completed, t.acknowledged, t.progress, t.pendingCompletion));
            project.milestones = snakeToCamel(p.milestones);
            project.risks = snakeToCamel(p.risks);
            project.ganttPhases = snakeToCamel(p.gantt_phases);
            project.statusItems = snakeToCamel(p.status_items).sort((a, b) => (a.order || 0) - (b.order || 0));
            return project;
        });

        this.activeProjectId = sessionStorage.getItem('projectflow_activeProjectId') || null;

        const visibleProjects = this.getVisibleProjects();
        if (visibleProjects.length > 0 && (!this.activeProjectId || !visibleProjects.some(p => p.id === this.activeProjectId))) {
            this.setActiveProject(visibleProjects[0].id);
        } else if (visibleProjects.length === 0) {
            this.activeProjectId = null;
        }

        if (!this.dataLoaded) {
            this.dataLoaded = true;
            this.app.showMainApp();
            this.app.initMainApp();
            this.setupRealtimeListeners();
        } else {
            this.app.render();
        }
        ui.hideLoader();
    }

    setupRealtimeListeners() {
        if (this.subscriptions.length > 0) return;
        const channel = this.supabase.channel('public:all');
        channel.on('postgres_changes', { event: '*', schema: 'public' }, payload => {
            console.log('Database change received!', payload);
            this.loadInitialData();
        }).subscribe();
        this.subscriptions.push(channel);
    }

    async updateProject(id, data) {
        await this.supabase.from('projects').update(camelToSnake(data)).eq('id', id);
        await this.loadInitialData();
    }

    async addProject(name) {
        const { data, error } = await this.supabase.from('projects').insert({ name }).select().single();
        if (error) { console.error(error); return; }
        const creatorProfile = this.users.find(u => u.id === this.currentUser.id);
        const tempActiveProject = this.activeProjectId;
        this.activeProjectId = data.id;
        await this.addMemberToProject(this.currentUser.id, creatorProfile?.role || 'leader', '👑');
        this.activeProjectId = tempActiveProject;
        await this.loadInitialData();
        this.setActiveProject(data.id);
    }

    async deleteProject(id) {
        if (this.projects.length <= 1) {
            alert("You cannot delete the last project.");
            return;
        }
        await this.supabase.from('projects').delete().eq('id', id);
        await this.loadInitialData();
    }

    async addMemberToProject(userId, profileRole, avatar) {
        await this.supabase.from('project_members').insert({
            project_id: this.activeProjectId,
            user_id: userId,
            profile_role: profileRole,
            avatar: avatar || '👤'
        });
        await this.loadInitialData();
    }

    async updateMemberInProject(userId, profileRole, avatar) {
        await this.supabase.from('project_members').update({
            profile_role: profileRole,
            avatar: avatar || '👤'
        }).match({ project_id: this.activeProjectId, user_id: userId });
        await this.loadInitialData();
    }

    async removeMemberFromProject(userId) {
        await this.supabase.from('project_members').delete()
            .eq('project_id', this.activeProjectId)
            .eq('user_id', userId);
        await this.loadInitialData();
    }

    async addTask(data) {
        const snakeData = camelToSnake(data);
        await this.supabase.from('tasks').insert({ ...snakeData, project_id: this.activeProjectId });
        await this.loadInitialData();
    }

    async updateTask(id, data) {
        await this.supabase.from('tasks').update(camelToSnake(data)).eq('id', id);
        await this.loadInitialData();
    }

    async deleteTask(id) {
        await this.supabase.from('tasks').delete().eq('id', id);
        await this.loadInitialData();
    }

    async deleteMultipleTasks(taskIds) {
        const ids = Array.from(taskIds);
        const { error } = await this.supabase.from('tasks').delete().in('id', ids);
        if (!error) {
            this.app.selectedTaskIds.clear();
        } else {
            console.error(error);
            alert("Could not delete tasks.");
        }
        await this.loadInitialData();
    }

    async updateTaskProgress(id, progress) {
        await this.supabase.from('tasks').update({ progress: Number(progress) }).eq('id', id);
        await this.loadInitialData();
    }

    async requestTaskCompletion(id, isPending) {
        await this.supabase.from('tasks').update({ pending_completion: isPending, progress: 100 }).eq('id', id);
        await this.loadInitialData();
    }

    async acknowledgeTask(id) {
        await this.supabase.from('tasks').update({ acknowledged: true }).eq('id', id);
        await this.loadInitialData();
    }

    async toggleTaskCompletion(id) {
        await this.supabase.from('tasks').update({ completed: true, pending_completion: false }).eq('id', id);
        await this.loadInitialData();
    }

    async restoreTask(id) {
        await this.supabase.from('tasks').update({ completed: false, pending_completion: false, progress: 0 }).eq('id', id);
        await this.loadInitialData();
    }

    async extendTaskDeadline(id) {
        const task = this.getTask(id);
        if (!task) return;
        const currentDueDate = task.endDate ? new Date(task.endDate) : new Date();
        currentDueDate.setDate(currentDueDate.getDate() + 8);
        const newEndDate = currentDueDate.toISOString().split('T')[0];
        await this.supabase.from('tasks').update({ end_date: newEndDate }).eq('id', id);
        await this.loadInitialData();
    }

    getAllUsers() {
        return this.users;
    }

    getVisibleProjects() {
        if (!this.currentUser) return [];
        return this.projects;
    }

    getActiveProject() {
        if (!this.activeProjectId) return null;
        return this.projects.find(p => p.id === this.activeProjectId);
    }

    getProjectTeamMembers() {
        const project = this.getActiveProject();
        if (!project || !project.team) return [];
        return Object.values(project.team).map(profile => {
            const user = this.users.find(u => u.id === profile.userId);
            if (!user) return null;
            return {
                ...user,
                profileRole: profile.profileRole,
                avatar: profile.avatar
            };
        }).filter(Boolean);
    }

    getMember(id) {
        return this.getProjectTeamMembers().find(m => m.id === id);
    }

    setActiveProject(id) {
        this.activeProjectId = id;
        sessionStorage.setItem('projectflow_activeProjectId', id);
        this.app.render();
    }

    getTask(id) { return this.getActiveProject()?.tasks.find(t => t.id === id); }
    getMilestone(id) { return this.getActiveProject()?.milestones.find(m => m.id === id); }
    getStatusItem(id) { return this.getActiveProject()?.statusItems.find(s => s.id === id); }
    getGanttPhase(id) { return this.getActiveProject()?.ganttPhases.find(p => p.id === id); }
    getRisk(id) { return this.getActiveProject()?.risks.find(r => r.id === id); }

    async addMilestone(d) {
        await this.supabase.from('milestones').insert({ ...camelToSnake(d), project_id: this.activeProjectId });
        await this.loadInitialData();
    }
    async updateMilestone(id, d) {
        await this.supabase.from('milestones').update(camelToSnake(d)).eq('id', id);
        await this.loadInitialData();
    }
    async deleteMilestone(id) {
        await this.supabase.from('milestones').delete().eq('id', id);
        await this.loadInitialData();
    }

    async addStatusItem(d) {
        await this.supabase.from('status_items').insert({ ...camelToSnake(d), project_id: this.activeProjectId });
        await this.loadInitialData();
    }
    async updateStatusItem(id, d) {
        await this.supabase.from('status_items').update(camelToSnake(d)).eq('id', id);
        await this.loadInitialData();
    }
    async deleteStatusItem(id) {
        await this.supabase.from('status_items').delete().eq('id', id);
        await this.loadInitialData();
    }

    async updateStatusOrder(orderedIds) {
        const updates = orderedIds.map((id, index) =>
            this.supabase.from('status_items').update({ order: index }).eq('id', id)
        );
        await Promise.all(updates);
        await this.loadInitialData();
    }

    async addGanttPhase(d) {
        await this.supabase.from('gantt_phases').insert({ ...camelToSnake(d), project_id: this.activeProjectId });
        await this.loadInitialData();
    }
    async updateGanttPhase(id, d) {
        await this.supabase.from('gantt_phases').update(camelToSnake(d)).eq('id', id);
        await this.loadInitialData();
    }
    async deleteGanttPhase(id) {
        await this.supabase.from('gantt_phases').delete().eq('id', id);
        await this.loadInitialData();
    }

    async addRisk(d) {
        await this.supabase.from('risks').insert({ ...camelToSnake(d), project_id: this.activeProjectId });
        await this.loadInitialData();
    }
    async updateRisk(id, d) {
        await this.supabase.from('risks').update(camelToSnake(d)).eq('id', id);
        await this.loadInitialData();
    }
    async deleteRisk(id) {
        await this.supabase.from('risks').delete().eq('id', id);
        await this.loadInitialData();
    }

    // PINPOINT: Add these three functions to your Store class in js/store.js

    async addUserProfile(id, name, email, role) {
        const { error } = await this.supabase.from('profiles').insert({ id, name, email, role });
        if (error) {
            console.error(error);
            alert(`Error adding user profile: ${error.message}`);
            return;
        }
        await this.loadInitialData();
    }

    async updateUserProfile(id, data) {
        await this.supabase.from('profiles').update(camelToSnake(data)).eq('id', id);
        await this.loadInitialData();
    }

    async deleteUserProfile(id) {
        // This only deletes the profile, not the auth user. That must be done in the Supabase dashboard.
        const { error } = await this.supabase.from('profiles').delete().eq('id', id);
        if (error) {
            console.error(error);
            alert(`Error deleting user profile: ${error.message}`);
            return;
        }
        await this.loadInitialData();
    }
}

export const store = new Store();