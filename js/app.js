import * as store from './store.js';
import { ui } from './ui.js';
import { gantt } from './gantt.js';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.currentMemberId = null;
        this.activeProjectId = sessionStorage.getItem('activeProjectId');
        this.init();
    }

    async init() {
        const user = await store.getActiveUser();
        if (!user) {
            window.location.replace('/login.html');
            return;
        }
        this.setupEventListeners();
        await this.render();
    }

    async render() {
        ui.showLoader();
        const projects = await store.getProjects();
        if (projects.length === 0) {
            const newProject = await store.addProject('My First Project');
            if(newProject) {
                this.activeProjectId = newProject.id;
                sessionStorage.setItem('activeProjectId', this.activeProjectId);
                await this.render();
            } else {
                 ui.clearAllDataViews();
                 ui.hideLoader();
            }
            return;
        }

        if (!this.activeProjectId || !projects.some(p => p.id === this.activeProjectId)) {
            this.activeProjectId = projects[0].id;
            sessionStorage.setItem('activeProjectId', this.activeProjectId);
        }
        ui.renderProjects(projects, this.activeProjectId);
        
        const projectData = {
            name: projects.find(p => p.id === this.activeProjectId)?.name || '',
            tasks: await store.getTasks(this.activeProjectId),
            team: await store.getTeam(this.activeProjectId),
            milestones: await store.getMilestones(this.activeProjectId),
            risks: await store.getRisks(this.activeProjectId),
            statusItems: await store.getStatusItems(this.activeProjectId),
            ganttPhases: await store.getGanttPhases(this.activeProjectId),
        };

        const viewRenderers = {
            dashboard: () => ui.renderDashboard(projectData), team: () => ui.renderTeam(projectData.team, projectData.tasks),
            tasks: () => ui.renderTasks(projectData.tasks, projectData.team), milestones: () => ui.renderMilestones(projectData.milestones),
            status: () => ui.renderStatus(projectData.statusItems), risks: () => ui.renderRisks(projectData.risks),
            gantt: () => gantt.render(projectData),
            'team-member-profile': async () => {
                const member = await store.getMember(this.currentMemberId);
                ui.renderTeamMemberProfile(member, projectData.tasks.filter(t => t.assignedTo === this.currentMemberId));
            }
        };
        ui.switchView(this.currentView);
        if(viewRenderers[this.currentView]) await viewRenderers[this.currentView]();
        ui.hideLoader();
    }

    setupEventListeners() {
        document.querySelector('.sidebar-nav').addEventListener('click', e => { const l=e.target.closest('.nav-link'); if(l){e.preventDefault();this.currentView=l.dataset.view;this.render();}});
        const mobileMenuBtn = document.getElementById('mobile-menu-toggle'); const sidebar = document.getElementById('sidebar');
        mobileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); });
        document.getElementById('main-content').addEventListener('click', () => { if (sidebar.classList.contains('open')) sidebar.classList.remove('open'); });
        ui.projectSelector.addEventListener('change', e => { this.activeProjectId = e.target.value; sessionStorage.setItem('activeProjectId', this.activeProjectId); this.currentView = 'dashboard'; this.render(); });
        document.getElementById('add-project-btn').addEventListener('click', async () => { const n=prompt('Enter new project name:'); if(n&&n.trim()){const newProj = await store.addProject(n.trim()); if(newProj) {this.activeProjectId = newProj.id; sessionStorage.setItem('activeProjectId', this.activeProjectId);} this.render();}});
        document.getElementById('delete-project-btn').addEventListener('click', async () => { if(confirm(`Delete project? This is irreversible.`)){await store.deleteProject(this.activeProjectId); this.activeProjectId = null; sessionStorage.removeItem('activeProjectId'); this.render();}});
        document.getElementById('backup-btn').addEventListener('click', async () => { await store.signOut(); window.location.replace('/login.html'); }); // Re-purposed as Sign Out
        document.getElementById('restore-btn').style.display = 'none';
        
        const viewHandlers = {
            'team-view': { add: 'add-member-btn', item: '.team-member-card', click: this.handleMemberClick.bind(this) },
            'tasks-view': { add: 'add-task-btn', item: '.task-item', form: this.handleTaskForm.bind(this), del: this.handleTaskDelete.bind(this) },
            'milestones-view': { add: 'add-milestone-btn', item: '.milestone-item', form: this.handleMilestoneForm.bind(this), del: this.handleMilestoneDelete.bind(this) },
            'status-view': { add: 'add-status-item-btn', item: '.status-item', form: this.handleStatusForm.bind(this), del: this.handleStatusDelete.bind(this) },
            'risks-view': { add: 'add-risk-btn', item: 'tr', form: this.handleRiskForm.bind(this), del: this.handleRiskDelete.bind(this) }
        };

        for (const [id, h] of Object.entries(viewHandlers)) {
            document.getElementById(h.add)?.addEventListener('click', () => { if(h.form) h.form(); else if(h.add === 'add-member-btn') this.handleMemberAdd();});
            document.getElementById(id)?.addEventListener('click', e => { const i = e.target.closest(h.item); if(!i) return; const d = e.target.closest('[data-id]')?.dataset.id; if(e.target.closest('.edit-btn')) h.form(d); else if(e.target.closest('.delete-btn')) h.del(d); else if(e.target.matches('.task-item-checkbox')) this.handleTaskToggle(d); else if(h.click) h.click(d); });
        }
        
        document.querySelector('.tabs')?.addEventListener('click', e => {if(e.target.matches('.tab-link')){document.querySelectorAll('.tab-link,.tab-content').forEach(el=>el.classList.remove('active'));e.target.classList.add('active');document.getElementById(`task-list-${e.target.dataset.tab}`).classList.add('active');}});
        document.getElementById('add-gantt-phase-btn')?.addEventListener('click', () => this.handleGanttPhaseForm());
        document.getElementById('print-gantt-btn')?.addEventListener('click', () => gantt.print());
        document.getElementById('main-content').addEventListener('click', e => { if (e.target.id === 'back-to-team-btn') { this.currentView = 'team'; this.render(); } });
        ui.modal.closeBtn.addEventListener('click', ()=>ui.closeModal()); ui.modal.backdrop.addEventListener('click', ()=>ui.closeModal());
    }

    handleMemberClick(memberId) { this.currentView = 'team-member-profile'; this.currentMemberId = memberId; this.render(); }
    async handleMemberAdd() { const userEmail = prompt("Enter the email of the user to add to this project:"); if (!userEmail) return; alert("In a real app, you'd find the user by email and call store.addTeamMember. This is a placeholder."); }
    async handleTaskForm(id){const isEdit=!!id;const t=isEdit?await store.getTask(id):undefined;const team=await store.getTeam(this.activeProjectId);ui.openModal(isEdit?'Edit Task':'Add Task',ui.createTaskForm(team,t));document.getElementById('form').addEventListener('submit',async e=>{e.preventDefault();const d={name:document.getElementById('name').value,description:document.getElementById('desc').value,assignedTo:document.getElementById('assign').value||null,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value,category:document.getElementById('cat').value.trim(),priority:document.getElementById('priority').value};if(isEdit)await store.updateTask(id,d);else await store.addTask(d,this.activeProjectId);ui.closeModal();this.render()});}
    async handleMilestoneForm(id){const isEdit=!!id;const m=isEdit?await store.getMilestone(id):undefined;ui.openModal(isEdit?'Edit Milestone':'Add Milestone',ui.createMilestoneForm(m));document.getElementById('form').addEventListener('submit',async e=>{e.preventDefault();const d={name:document.getElementById('name').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value};if(isEdit)await store.updateMilestone(id,d);else await store.addMilestone(d,this.activeProjectId);ui.closeModal();this.render()});}
    async handleStatusForm(id){const isEdit=!!id;const s=isEdit?await store.getStatusItem(id):undefined;ui.openModal(isEdit?'Edit Status':'Add Status',ui.createStatusForm(s));const p=document.getElementById('progress'),v=document.getElementById('progress-val');p.addEventListener('input',()=>v.textContent=`${p.value}%`);document.getElementById('form').addEventListener('submit',async e=>{e.preventDefault();const d={name:document.getElementById('name').value,progress:document.getElementById('progress').value,color:document.getElementById('color').value};if(isEdit)await store.updateStatusItem(id,d);else await store.addStatusItem(d,this.activeProjectId);ui.closeModal();this.render()});}
    handleGanttPhaseForm(){ui.openModal('Create New Phase', ui.createGanttPhaseForm());document.getElementById('form').addEventListener('submit',async e => {e.preventDefault();const d={name:document.getElementById('name').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value,color:document.getElementById('color').value};await store.addGanttPhase(d,this.activeProjectId);ui.closeModal();this.render();});}
    async handleRiskForm(id){const isEdit=!!id;const r=isEdit?await store.getRisk(id):undefined;ui.openModal(isEdit?'Edit Risk':'Add Risk',ui.createRiskForm(r));document.getElementById('form').addEventListener('submit',async e=>{e.preventDefault();const d={description:document.getElementById('desc').value,impact:document.getElementById('impact').value,priority:document.getElementById('priority').value};if(isEdit)await store.updateRisk(id,d);else await store.addRisk(d,this.activeProjectId);ui.closeModal();this.render();});}

    async handleTaskDelete(id){const t=await store.getTask(id);if(t&&confirm(`Delete task "${t.name}"?`)){await store.deleteTask(id);this.render();}}
    async handleMilestoneDelete(id){const m=await store.getMilestone(id);if(m&&confirm(`Delete milestone "${m.name}"?`)){await store.deleteMilestone(id);this.render();}}
    async handleStatusDelete(id){const s=await store.getStatusItem(id);if(s&&confirm(`Delete status "${s.name}"?`)){await store.deleteStatusItem(id);this.render();}}
    async handleRiskDelete(id){if(confirm('Delete this risk?')){await store.deleteRisk(id);this.render();}}
    async handleTaskToggle(id){const t=await store.getTask(id);if(t)await store.toggleTaskCompletion(id,t.completed);this.render();}
}

new App();