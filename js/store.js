class Task { constructor(id, name, description, assignedTo, startDate, endDate, category, priority, completed = false) { this.id = id; this.name = name; this.description = description; this.assignedTo = assignedTo; this.startDate = startDate; this.endDate = endDate; this.category = category; this.priority = priority; this.completed = completed; } }
class TeamMember { constructor(id, name, role, avatar) { this.id = id; this.name = name; this.role = role; this.avatar = avatar; } }
class Milestone { constructor(id, name, startDate, endDate) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; } }
class StatusItem { constructor(id, name, progress, color) { this.id = id; this.name = name; this.progress = progress; this.color = color; } }
class GanttPhase { constructor(id, name, startDate, endDate, color) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; this.color = color || '#e74c3c';} }
class Risk { constructor(id, description, impact, priority) { this.id = id; this.description = description; this.impact = impact; this.priority = priority; } }

class Project { constructor(id, name) { this.id = id; this.name = name; this.tasks = []; this.team = []; this.milestones = []; this.statusItems = []; this.ganttPhases = []; this.risks = []; } }

class Store {
    constructor() { this.projects = []; this.activeProjectId = null; this.loadFromLocalStorage(); }
    _commit() { localStorage.setItem('projectflow_data', JSON.stringify({ projects: this.projects, activeProjectId: this.activeProjectId })); }
    loadFromLocalStorage() {
        const data = JSON.parse(localStorage.getItem('projectflow_data') || '{}');
        const projectsData = data.projects || [];
        this.projects = projectsData.map(pData => {
            const project = new Project(pData.id, pData.name);
            project.team = (pData.team || []).map(tm => new TeamMember(tm.id, tm.name, tm.role, tm.avatar));
            project.tasks = (pData.tasks || []).map(t => new Task(t.id, t.name, t.description, t.assignedTo, t.startDate, t.endDate, t.category, t.priority || 'Medium', t.completed));
            project.milestones = (pData.milestones || []).map(m => new Milestone(m.id, m.name, m.startDate, m.endDate));
            project.statusItems = (pData.statusItems || []).map(s => new StatusItem(s.id, s.name, s.progress, s.color));
            project.ganttPhases = (pData.ganttPhases || []).map(g => new GanttPhase(g.id, g.name, g.startDate, g.endDate, g.color));
            project.risks = (pData.risks || []).map(r => new Risk(r.id, r.description, r.impact, r.priority));
            return project;
        });
        const activeId = data.activeProjectId;
        if (activeId && this.projects.some(p => p.id === activeId)) this.activeProjectId = activeId;
        else if (this.projects.length > 0) this.activeProjectId = this.projects[0].id;
        else this.addProject("My First Project");
    }

    getAllData() { return { projects: this.projects, activeProjectId: this.activeProjectId }; }
    restoreAllData(data) { localStorage.setItem('projectflow_data', JSON.stringify(data)); this.loadFromLocalStorage(); }
    getActiveProject() { if (!this.activeProjectId) return null; return this.projects.find(p => p.id === this.activeProjectId); }
    setActiveProject(id) { this.activeProjectId = id; this._commit(); }
    addProject(name) { const id = `proj_${Date.now()}`; const p = new Project(id, name); this.projects.push(p); this.activeProjectId = id; this._commit(); return p; }
    deleteProject(id) { this.projects = this.projects.filter(p => p.id !== id); if (this.activeProjectId === id) this.activeProjectId = this.projects.length > 0 ? this.projects[0].id : null; this._commit(); }

    addTeamMember(d){const p=this.getActiveProject();if(p){p.team.push(new TeamMember(`mem_${Date.now()}`,d.name,d.role,d.avatar));this._commit();}}
    updateTeamMember(id,d){const m=this.getMember(id);if(m){Object.assign(m,d);this._commit();}}
    deleteTeamMember(id){const p=this.getActiveProject();if(!p)return;p.team=p.team.filter(m=>m.id!==id);p.tasks.forEach(t=>{if(t.assignedTo===id)t.assignedTo=null;});this._commit();}
    getMember(id){return this.getActiveProject()?.team.find(m=>m.id===id);}

    addTask(d){const p=this.getActiveProject();if(p){p.tasks.push(new Task(`task_${Date.now()}`,d.name,d.description,d.assignedTo,d.startDate,d.endDate,d.category,d.priority));this._commit();}}
    updateTask(id,d){const t=this.getTask(id);if(t){Object.assign(t,d);this._commit();}}
    toggleTaskCompletion(id){const t=this.getTask(id);if(t)t.completed=!t.completed;this._commit();}
    deleteTask(id){const p=this.getActiveProject();if(p)p.tasks=p.tasks.filter(t=>t.id!==id);this._commit();}
    getTask(id){return this.getActiveProject()?.tasks.find(t=>t.id===id);}

    addMilestone(d){const p=this.getActiveProject();if(p){p.milestones.push(new Milestone(`mile_${Date.now()}`,d.name,d.startDate,d.endDate));this._commit();}}
    updateMilestone(id,d){const m=this.getMilestone(id);if(m){Object.assign(m,d);this._commit();}}
    deleteMilestone(id){const p=this.getActiveProject();if(p)p.milestones=p.milestones.filter(m=>m.id!==id);this._commit();}
    getMilestone(id){return this.getActiveProject()?.milestones.find(m=>m.id===id);}
    
    addStatusItem(d){const p=this.getActiveProject();if(p){p.statusItems.push(new StatusItem(`status_${Date.now()}`,d.name,d.progress,d.color));this._commit();}}
    updateStatusItem(id,d){const s=this.getStatusItem(id);if(s){Object.assign(s,d);this._commit();}}
    deleteStatusItem(id){const p=this.getActiveProject();if(p)p.statusItems=p.statusItems.filter(s=>s.id!==id);this._commit();}
    getStatusItem(id){return this.getActiveProject()?.statusItems.find(s=>s.id===id);}
    
    addGanttPhase(d){const p=this.getActiveProject();if(p){p.ganttPhases.push(new GanttPhase(`gantt_${Date.now()}`,d.name,d.startDate,d.endDate,d.color));this._commit();}}
    updateGanttPhase(id,d){const ph=this.getGanttPhase(id);if(ph){Object.assign(ph,d);this._commit();}}
    deleteGanttPhase(id){const p=this.getActiveProject();if(p)p.ganttPhases=p.ganttPhases.filter(g=>g.id!==id);this._commit();}
    getGanttPhase(id){return this.getActiveProject()?.ganttPhases.find(p=>p.id===id);}

    addRisk(d){const p=this.getActiveProject();if(p){p.risks.push(new Risk(`risk_${Date.now()}`,d.description,d.impact,d.priority));this._commit();}}
    updateRisk(id,d){const r=this.getRisk(id);if(r){Object.assign(r,d);this._commit();}}
    deleteRisk(id){const p=this.getActiveProject();if(p)p.risks=p.risks.filter(r=>r.id!==id);this._commit();}
    getRisk(id){return this.getActiveProject()?.risks.find(r=>r.id===id);}
}

export const store = new Store();