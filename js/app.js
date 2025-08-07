import { store } from './store.js';
import { ui } from './ui.js';
import { gantt } from './gantt.js';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.currentMemberId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    render() {
        ui.showLoader();
        const project = store.getActiveProject();
        ui.renderProjects(store.projects, store.activeProjectId);
        if (!project) { ui.clearAllDataViews(); document.getElementById('gantt-chart-container').innerHTML = ''; ui.hideLoader(); return; }
        
        const viewRenderers = {
            dashboard: () => ui.renderDashboard(project),
            team: () => ui.renderTeam(project.team, project.tasks),
            tasks: () => {
                ui.renderTaskFilters(project.team, project.tasks);
                let filteredTasks = [...project.tasks];
                const memberFilter = document.getElementById('task-filter-member').value;
                const priorityFilter = document.getElementById('task-filter-priority').value;
                const categoryFilter = document.getElementById('task-filter-category').value;
                
                if (memberFilter !== 'all') { filteredTasks = filteredTasks.filter(t => t.assignedTo === memberFilter); }
                if (priorityFilter !== 'all') { filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter); }
                if (categoryFilter !== 'all') { filteredTasks = filteredTasks.filter(t => t.category === categoryFilter); }

                ui.renderTasks(filteredTasks, project.team);
            },
            milestones: () => ui.renderMilestones(project.milestones),
            status: () => ui.renderStatus(project.statusItems),
            risks: () => ui.renderRisks(project.risks),
            gantt: () => gantt.render(project),
            'team-member-profile': () => {
                const member = store.getMember(this.currentMemberId);
                ui.renderTeamMemberProfile(member, project.tasks.filter(t => t.assignedTo === this.currentMemberId));
            }
        };
        ui.switchView(this.currentView);
        viewRenderers[this.currentView]();
        ui.hideLoader();
    }

    setupEventListeners() {
        document.querySelector('.sidebar-nav').addEventListener('click', e => { const l=e.target.closest('.nav-link'); if(l){e.preventDefault();this.currentView=l.dataset.view;this.render();}});
        const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        mobileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); });
        document.getElementById('main-content').addEventListener('click', () => { if (sidebar.classList.contains('open')) { sidebar.classList.remove('open'); } });

        ui.projectSelector.addEventListener('change', e => { store.setActiveProject(e.target.value); this.currentView = 'dashboard'; this.render(); });
        document.getElementById('add-project-btn').addEventListener('click', () => { const n=prompt('Enter new project name:'); if(n&&n.trim()){store.addProject(n.trim());this.render();}});
        document.getElementById('delete-project-btn').addEventListener('click', () => { const p=store.getActiveProject(); if(p&&confirm(`Delete "${p.name}"? This is irreversible.`)){store.deleteProject(p.id);this.render();}});
        document.getElementById('backup-btn').addEventListener('click', () => this.handleBackup());
        document.getElementById('restore-btn').addEventListener('click', () => document.getElementById('restore-input').click());
        document.getElementById('restore-input').addEventListener('change', e => this.handleRestore(e));
        const filters = ['task-filter-member', 'task-filter-priority', 'task-filter-category'];
        filters.forEach(filterId => {
            const el = document.getElementById(filterId);
            if(el) {
                el.addEventListener('change', () => {
                    if (this.currentView === 'tasks') this.render();
                });
            }
        });

        const viewHandlers = {
            'team-view': { add: 'add-member-btn', item: '.team-member-card', form: this.handleMemberForm.bind(this), click: this.handleMemberClick.bind(this)},
            'tasks-view': { add: 'add-task-btn', item: '.task-item', form: this.handleTaskForm.bind(this), del: this.handleTaskDelete.bind(this)},
            'milestones-view': { add: 'add-milestone-btn', item: '.milestone-item', form: this.handleMilestoneForm.bind(this), del: this.handleMilestoneDelete.bind(this)},
            'status-view': { add: 'add-status-item-btn', item: '.status-item', form: this.handleStatusForm.bind(this), del: this.handleStatusDelete.bind(this)},
            'risks-view': { add: 'add-risk-btn', item: 'tr', form: this.handleRiskForm.bind(this), del: this.handleRiskDelete.bind(this)}
        };

        for (const [id, h] of Object.entries(viewHandlers)) {
            document.getElementById(h.add).addEventListener('click', () => h.form());
            document.getElementById(id).addEventListener('click', e => {
                const item = e.target.closest(h.item); if(!item) return; const itemId = e.target.closest('[data-id]')?.dataset.id;
                if (e.target.closest('.edit-btn')) h.form(itemId);
                else if (e.target.closest('.delete-btn')) h.del(itemId);
                else if (e.target.matches('.task-item-checkbox')) this.handleTaskToggle(itemId);
                else if (h.click) h.click(itemId);
            });
        }
        
        document.querySelector('.tabs').addEventListener('click', e => {
            if(e.target.matches('.tab-link')) {
                document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`task-list-${e.target.dataset.tab}`).classList.add('active');
            }
        });

        document.getElementById('add-gantt-phase-btn').addEventListener('click', () => this.handleGanttPhaseForm());
        document.getElementById('print-gantt-btn').addEventListener('click', () => gantt.print());
        document.getElementById('main-content').addEventListener('click', e => { if (e.target.id === 'back-to-team-btn') { this.currentView = 'team'; this.render(); } });
        ui.modal.closeBtn.addEventListener('click', ()=>ui.closeModal()); ui.modal.backdrop.addEventListener('click', ()=>ui.closeModal());
    }
    
    handleMemberClick(memberId) { this.currentView = 'team-member-profile'; this.currentMemberId = memberId; this.render(); }
    handleMemberForm(id){const i=!!id,m=i?store.getMember(id):void 0;ui.openModal(i?'Edit Member':'Add Member',ui.createMemberForm(m));const f=document.getElementById('form'),a=document.getElementById('avatarFile'),p=document.querySelector('.avatar-preview');a.addEventListener('change',()=>{const e=a.files[0];e&&(p.style.backgroundImage=`url(${URL.createObjectURL(e)})`)}),f.addEventListener('submit',async e=>{e.preventDefault(),ui.showLoader();let t=i?m.avatar:'';const l=a.files[0];l&&(t=await this.readFileAsBase64(l));const s={name:document.getElementById('name').value,role:document.getElementById('role').value,avatar:t};i?store.updateTeamMember(id,s):store.addTeamMember(s),ui.closeModal(),this.render()});}
    handleTaskForm(id){const i=!!id,t=i?store.getTask(id):void 0;ui.openModal(i?'Edit Task':'Add Task',ui.createTaskForm(store.getActiveProject().team,t)),document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const s={name:document.getElementById('name').value,description:document.getElementById('desc').value,assignedTo:document.getElementById('assign').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value,category:document.getElementById('cat').value.trim(),priority:document.getElementById('priority').value};i?store.updateTask(id,s):store.addTask(s),ui.closeModal(),this.render()});}
    handleMilestoneForm(id){const i=!!id,t=i?store.getMilestone(id):void 0;ui.openModal(i?'Edit Milestone':'Add Milestone',ui.createMilestoneForm(t)),document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const s={name:document.getElementById('name').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value};i?store.updateMilestone(id,s):store.addMilestone(s),ui.closeModal(),this.render()});}
    handleStatusForm(id){const i=!!id,t=i?store.getStatusItem(id):void 0;ui.openModal(i?'Edit Status':'Add Status',ui.createStatusForm(t));const e=document.getElementById('progress'),s=document.getElementById('progress-val');e.addEventListener('input',()=>s.textContent=`${e.value}%`),document.getElementById('form').addEventListener('submit',t=>{t.preventDefault();const o={name:document.getElementById('name').value,progress:document.getElementById('progress').value,color:document.getElementById('color').value};i?store.updateStatusItem(id,o):store.addStatusItem(o),ui.closeModal(),this.render()});}
    handleGanttPhaseForm(){ui.openModal('Create New Phase', ui.createGanttPhaseForm());document.getElementById('form').addEventListener('submit', e => { e.preventDefault();const d={name:document.getElementById('name').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value,color:document.getElementById('color').value};store.addGanttPhase(d);ui.closeModal();this.render();});}
    handleRiskForm(id){const i=!!id,r=i?store.getRisk(id):undefined;ui.openModal(i?'Edit Risk':'Add Risk',ui.createRiskForm(r));document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const d={description:document.getElementById('desc').value,impact:document.getElementById('impact').value,priority:document.getElementById('priority').value};if(i)store.updateRisk(id,d);else store.addRisk(d);ui.closeModal();this.render();});}

    handleMemberDelete(id){const t=store.getMember(id);t&&confirm(`Delete ${t.name}?`)&&(store.deleteTeamMember(id),this.render());}
    handleTaskDelete(id){const t=store.getTask(id);t&&confirm(`Delete task "${t.name}"?`)&&(store.deleteTask(id),this.render());}
    handleMilestoneDelete(id){const t=store.getMilestone(id);t&&confirm(`Delete milestone "${t.name}"?`)&&(store.deleteMilestone(id),this.render());}
    handleStatusDelete(id){const t=store.getStatusItem(id);t&&confirm(`Delete status "${t.name}"?`)&&(store.deleteStatusItem(id),this.render());}
    handleRiskDelete(id){if(confirm('Delete this risk?')){store.deleteRisk(id);this.render();}}
    handleTaskToggle(id){store.toggleTaskCompletion(id);this.render();}

    handleBackup(){const t=JSON.stringify(store.getAllData(),null,2),e=new Blob([t],{type:"application/json"}),s=URL.createObjectURL(e),o=document.createElement("a");o.href=s,o.download=`projectflow_backup_${(new Date).toISOString().split("T")[0]}.json`,o.click(),URL.revokeObjectURL(s);}
    handleRestore(t){const e=t.target.files[0];if(e&&confirm("Restoring data will overwrite all current projects. Are you sure?")){const s=new FileReader;s.onload=t=>{try{const e=JSON.parse(t.target.result);store.restoreAllData(e),this.render()}catch(t){alert("Error: Invalid backup file."),console.error(t)}},s.readAsText(e),t.target.value=""}}
    readFileAsBase64(t){return new Promise((e,s)=>{const o=new FileReader;o.onload=()=>e(o.result),o.onerror=t=>s(t),o.readAsDataURL(t)})}
}

new App();