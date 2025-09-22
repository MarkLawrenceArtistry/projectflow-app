// js/app.js

import { store } from './store.js';
import { ui } from './ui.js';
import { gantt } from './gantt.js';

// --- SUPABASE CHANGE: Corrected Initialization with your keys ---
const supabaseUrl = 'https://uoafxvpxnchwgdjwxvhu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYWZ4dnB4bmNod2dkand4dmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjQ5MjcsImV4cCI6MjA3NDA0MDkyN30.7oza6DdjPSxwyMLBfg0AsjflhMUZgC11MuCt6FJE3ls'

// THE FIX IS HERE: We call the createClient function from the global supabase object
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
// --- END SUPABASE CHANGE ---


class App {
    constructor() {
        this.currentView = 'dashboard';
        this.currentMemberId = null;
        this.mainAppInitialized = false;
        this.selectedTaskIds = new Set();
    }

    // --- AUTHENTICATION UI FLOW ---
    showLogin(showLoginForm = true) {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('auth-view').style.display = 'flex';
        if (showLoginForm) {
            document.getElementById('login-container').style.display = 'block';
            document.getElementById('register-container').style.display = 'none';
        } else {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('register-container').style.display = 'block';
        }
        this.setupAuthEventListeners();
    }

    showMainApp() {
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid';
    }

    initMainApp() {
        this.render();

        if (!this.mainAppInitialized) {
            this.setupMainAppEventListeners();
            this.mainAppInitialized = true;
        }
    }

    render() {
        const currentUser = store.currentUser;
        if (!currentUser) { return; }

        document.getElementById('current-user-info').textContent = `${currentUser.name} (${currentUser.role})`;
        document.getElementById('admin-nav-link').style.display = currentUser.role === 'admin' ? 'block' : 'none';
        
        const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'leader';
        document.getElementById('projects-admin-nav-link').style.display = isPrivileged ? 'block' : 'none';
        
        document.querySelectorAll('.view-header .btn-primary').forEach(btn => {
             btn.style.display = isPrivileged ? 'inline-block' : 'none';
        });

        document.getElementById('task-filter-member').style.display = isPrivileged ? 'inline-block' : 'none';
        const visibleProjects = store.getVisibleProjects();
        const project = store.getActiveProject();
        ui.renderProjects(visibleProjects, store.activeProjectId);

        if (!project && this.currentView !== 'projects-admin' && this.currentView !== 'admin') {
            ui.clearAllDataViews();
            document.getElementById('gantt-chart-container').innerHTML = '';
            return;
        }

        let team = project ? store.getProjectTeamMembers() : [];
        let tasks = project ? project.tasks : [];
        if (currentUser.role === 'member' && project) {
            tasks = project.tasks.filter(t => t.assignedTo === currentUser.id);
        }

        const viewRenderers = {
            dashboard: () => ui.renderDashboard(project, store.onlineUsers),
            team: () => ui.renderTeam(team, tasks, currentUser),
            tasks: () => {
                ui.renderTaskFilters(team, tasks);
                let filteredTasks = [...tasks];
                if (isPrivileged) {
                    const memberFilter = document.getElementById('task-filter-member').value;
                    if (memberFilter !== 'all') { filteredTasks = filteredTasks.filter(t => t.assignedTo === memberFilter); }
                }
                const priorityFilter = document.getElementById('task-filter-priority').value;
                const categoryFilter = document.getElementById('task-filter-category').value;
                if (priorityFilter !== 'all') { filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter); }
                if (categoryFilter !== 'all') { filteredTasks = filteredTasks.filter(t => t.category === categoryFilter); }
                ui.renderTasks(filteredTasks, team, currentUser, this.selectedTaskIds);
            },
            milestones: () => ui.renderMilestones(project.milestones, currentUser),
            status: () => {
                ui.renderStatus(project.statusItems, currentUser);
                if (currentUser.role !== 'member') {
                    const statusListEl = document.getElementById('status-list');
                    if (statusListEl && !statusListEl.sortable) {
                        statusListEl.sortable = new Sortable(statusListEl, {
                            handle: '.drag-handle',
                            animation: 150,
                            onEnd: function (evt) {
                                const orderedIds = Array.from(evt.to.children).map(item => item.dataset.id);
                                store.updateStatusOrder(orderedIds);
                            }
                        });
                    }
                }
            },
            risks: () => ui.renderRisks(project.risks, currentUser),
            gantt: () => gantt.render(project),
            settings: () => {},
            admin: () => ui.renderAdminView(store.getAllUsers(), currentUser),
            'projects-admin': () => ui.renderProjectsAdminView(store.projects, currentUser),
            'team-member-profile': () => {
                const member = store.getMember(this.currentMemberId);
                const memberTasks = project ? project.tasks.filter(t => t.assignedTo === this.currentMemberId) : [];
                ui.renderTeamMemberProfile(member, memberTasks);
            }
        };
        ui.switchView(this.currentView);
        if (viewRenderers[this.currentView]) { viewRenderers[this.currentView](); }
    }

    // --- EVENT LISTENERS ---
    setupAuthEventListeners() {
        document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); store.login(document.getElementById('login-email').value, document.getElementById('login-password').value); });
        document.getElementById('register-form').addEventListener('submit', e => { e.preventDefault(); store.register(document.getElementById('register-name').value, document.getElementById('register-email').value, document.getElementById('register-password').value); });
        document.getElementById('show-login').addEventListener('click', e => { e.preventDefault(); this.showLogin(true); });
    }

    setupMainAppEventListeners() {
        if (this.mainAppInitialized) return;

        document.getElementById('logout-btn').addEventListener('click', () => store.logout());
        
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-toggle');

        const showHamburger = () => { mobileMenuBtn.style.opacity = '1'; mobileMenuBtn.style.pointerEvents = 'auto'; };
        const hideHamburger = () => { mobileMenuBtn.style.opacity = '0'; mobileMenuBtn.style.pointerEvents = 'none'; };

        mobileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('open'); hideHamburger(); });

        document.querySelector('.sidebar-nav').addEventListener('click', e => {
            const link = e.target.closest('.nav-link');
            if (link) {
                e.preventDefault();
                this.currentView = link.dataset.view;
                this.render();
                sidebar.classList.remove('open');
                showHamburger(); 
            }
        });

        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
                sidebar.classList.remove('open');
                showHamburger();
            }
        });

        ui.projectSelector.addEventListener('change', e => store.setActiveProject(e.target.value));

        const mainContent = document.getElementById('main-content');
        
        mainContent.addEventListener('click', e => {
            if (e.target.id === 'back-to-team-btn') {
                this.currentView = 'team';
                this.render();
                return;
            }
            if (e.target.closest('#admin-view')) {
                const userRow = e.target.closest('tr[data-id]');
                if (!userRow) return;

                const userId = userRow.dataset.id;
                if (e.target.closest('.edit-btn')) {
                    this.handleUserForm(userId);
                }
                if (e.target.closest('.delete-btn')) {
                    this.handleUserDelete(userId);
                }
                return;
            }
            if (e.target.closest('#team-view')) {
                const memberCard = e.target.closest('.team-member-card');
                if (!memberCard) return;
                const memberId = memberCard.dataset.id;
                if (e.target.closest('.edit-btn')) this.handleMemberProfileForm(memberId);
                else if (e.target.closest('.delete-btn')) this.handleMemberFromProjectDelete(memberId);
                else if (store.currentUser.role !== 'member') this.handleMemberClick(memberId);
                return;
            }
            if (e.target.closest('#tasks-view')) {
                const taskItem = e.target.closest('.task-item');
                const action = e.target.dataset.action;

                if (action === 'select-task' && taskItem) {
                    const taskId = taskItem.dataset.id;
                    if (this.selectedTaskIds.has(taskId)) this.selectedTaskIds.delete(taskId);
                    else this.selectedTaskIds.add(taskId);
                    this.render();
                    return;
                }
                
                if (taskItem) {
                    const taskId = taskItem.dataset.id;
                    if (action === 'view-details') this.handleTaskDetails(taskId);
                    else if (action === 'acknowledge') store.acknowledgeTask(taskId);
                    else if (action === 'mark-done') store.requestTaskCompletion(taskId, true);
                    else if (action === 'approve') store.toggleTaskCompletion(taskId);
                    else if (action === 'mark-complete') store.toggleTaskCompletion(taskId);
                    else if (action === 'restore') store.restoreTask(taskId);
                    else if (action === 'extend-deadline') store.extendTaskDeadline(taskId);
                    else if (e.target.closest('.edit-btn')) this.handleTaskForm(taskId);
                    else if (e.target.closest('.delete-btn')) this.handleTaskDelete(taskId);
                    return;
                }
            }
            if (e.target.closest('#task-selection-bar')) {
                if (e.target.id === 'selection-delete-btn') {
                    if (confirm(`Are you sure you want to delete ${this.selectedTaskIds.size} tasks? This cannot be undone.`)) {
                        store.deleteMultipleTasks(this.selectedTaskIds);
                    }
                } else if (e.target.id === 'selection-clear-btn') {
                    this.selectedTaskIds.clear();
                    this.render();
                }
            }
            const views = ['milestones', 'status', 'risks', 'projects-admin'];
            for (const view of views) {
                if (e.target.closest(`#${view}-view`)) {
                    const item = e.target.closest('[data-id]');
                    if (!item) return;
                    const id = item.dataset.id;
                    const handlerMap = {
                        milestones: { edit: this.handleMilestoneForm, del: this.handleMilestoneDelete },
                        status: { edit: this.handleStatusForm, del: this.handleStatusDelete },
                        risks: { edit: this.handleRiskForm, del: this.handleRiskDelete },
                        'projects-admin': { edit: this.handleProjectForm, del: this.handleProjectDelete }
                    };
                    if (e.target.closest('.edit-btn')) handlerMap[view].edit.call(this, id);
                    if (e.target.closest('.delete-btn')) handlerMap[view].del.call(this, id);
                    return;
                }
            }
        });

         mainContent.addEventListener('input', e => {
            if (e.target.matches('.task-progress-slider')) {
                const wrapper = e.target.closest('.task-progress-container');
                if (!wrapper) return;
                const percentageText = wrapper.querySelector('.task-progress-percentage');
                const progressValue = e.target.value;
                e.target.style.setProperty('--progress-percent', `${progressValue}%`);
                if (percentageText) percentageText.textContent = `${progressValue}%`;
            }
        });

        mainContent.addEventListener('change', e => {
            if (e.target.matches('.task-progress-slider')) {
                const taskId = e.target.closest('.task-item').dataset.id;
                store.updateTaskProgress(taskId, e.target.value);
            }
        });

        const setupListener = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };
        
        setupListener('add-member-to-project-btn', 'click', () => this.handleMemberProfileForm());
        setupListener('add-task-btn', 'click', () => this.handleTaskForm());
        setupListener('add-milestone-btn', 'click', () => this.handleMilestoneForm());
        setupListener('add-status-item-btn', 'click', () => this.handleStatusForm());
        setupListener('add-risk-btn', 'click', () => this.handleRiskForm());
        setupListener('add-gantt-phase-btn', 'click', () => this.handleGanttPhaseForm());
        setupListener('add-user-btn', 'click', () => this.handleUserForm());
        setupListener('add-project-admin-btn', 'click', () => this.handleProjectForm());
        setupListener('task-filter-sort', 'change', () => this.render());
        setupListener('task-filter-member', 'change', () => this.render());
        setupListener('task-filter-priority', 'change', () => this.render());
        setupListener('task-filter-category', 'change', () => this.render());
        
        setupListener('change-password-form', 'submit', e => {
            e.preventDefault();
            this.handleChangePassword();
        });

        const taskTabs = document.querySelector('#tasks-view .tabs');
        if (taskTabs) {
            taskTabs.addEventListener('click', e => {
                if (e.target.matches('.tab-link')) {
                    taskTabs.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
                    e.target.classList.add('active');
                    const taskView = document.getElementById('tasks-view');
                    taskView.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                    document.getElementById(`task-list-${e.target.dataset.tab}`).classList.add('active');
                }
            });
        }
        
        setupListener('modal-container', 'click', e => {
            if (e.target.id === 'modal-close-btn' || e.target.classList.contains('modal-backdrop')) {
                ui.closeModal();
            }
        });

        this.mainAppInitialized = true;
    }
    
    handleMemberClick(memberId) {
        this.currentView = 'team-member-profile';
        this.currentMemberId = memberId;
        this.render();
    }

    handleTaskDetails(id) {
        const task = store.getTask(id);
        const team = store.getProjectTeamMembers();
        const currentUser = store.currentUser;
        if (task) {
            ui.openModal(`Task: ${task.name}`, ui.createTaskDetailModal(task, team, currentUser));
        }
    }

    handleProjectForm(id) {
        const isEdit = !!id;
        const project = isEdit ? store.projects.find(p => p.id === id) : {};
        ui.openModal(isEdit ? 'Edit Project' : 'Add New Project', ui.createProjectForm(project));
        document.getElementById('form').addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            if (isEdit) {
                store.updateProject(id, { name });
            } else {
                store.addProject(name);
            }
            ui.closeModal();
        });
    }
    
    handleProjectDelete(id) {
        const project = store.projects.find(p => p.id === id);
        if (project && confirm(`Delete project "${project.name}"? This is irreversible.`)) {
            store.deleteProject(id);
        }
    }

    
    handleUserForm(id) {
        const isEdit = !!id;
        const user = isEdit ? store.users.find(u => u.id === id) : {};
        ui.openModal(isEdit ? 'Edit User Profile' : 'Add New User Profile', ui.createUserForm(user));
        document.getElementById('form').addEventListener('submit', e => {
            e.preventDefault();
            if (isEdit) {
                const data = {
                    name: document.getElementById('name').value,
                    role: document.getElementById('role').value
                };
                store.updateUserProfile(id, data);
            } else {
                const userId = document.getElementById('id').value;
                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                const role = document.getElementById('role').value;
                store.addUserProfile(userId, name, email, role);
            }
            ui.closeModal();
        });
    }

    handleUserDelete(id) {
        const user = store.users.find(u => u.id === id);
        if (user && confirm(`Are you sure you want to delete the profile for "${user.name}"?\n\nThis will ONLY delete their profile from this app. You must delete their login from the Supabase Authentication dashboard separately.`)) {
            store.deleteUserProfile(id);
        }
    }

    handleGanttPhaseForm() {
        ui.openModal('Create New Phase', ui.createGanttPhaseForm());
        document.getElementById('form').addEventListener('submit', e => {
            e.preventDefault();
            const data = {
                name: document.getElementById('name').value,
                startDate: document.getElementById('start').value,
                endDate: document.getElementById('end').value,
                color: document.getElementById('color').value
            };
            store.addGanttPhase(data);
            ui.closeModal();
        });
    }

    handleChangePassword() {
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (newPass.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        if (newPass !== confirmPass) {
            alert('Passwords do not match.');
            return;
        }

        store.changePassword(newPass);
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }

    handleMemberProfileForm(id) {
        const isEdit = !!id;
        const allUsers = store.getAllUsers();
        const teamMembers = store.getProjectTeamMembers();
        const profileToEdit = isEdit ? store.getMember(id) : {};
        if (isEdit && profileToEdit) { profileToEdit.userId = profileToEdit.id; }

        ui.openModal(isEdit ? 'Edit Member Profile' : 'Add Member to Project', ui.createMemberProfileForm(allUsers, teamMembers, profileToEdit));
        
        const form = document.getElementById('form');
        if (form) {
            const avatarInput = document.getElementById('avatar');
            const avatarPreview = document.getElementById('avatar-preview');
            if(avatarInput && avatarPreview) {
                avatarInput.addEventListener('input', () => { avatarPreview.textContent = avatarInput.value || '👤'; });
            }

            form.addEventListener('submit', e => {
                e.preventDefault();
                ui.showLoader();
                const userId = document.getElementById('member-select').value;
                const profileRole = document.getElementById('role').value;
                const avatar = document.getElementById('avatar').value || '👤';
                store.addMemberToProject(userId, profileRole, avatar);
                ui.closeModal();
            });
        }
    }
    handleMemberFromProjectDelete(id) { const member = store.getMember(id); if (member && confirm(`Remove ${member.name} from this project?`)) { store.removeMemberFromProject(id); } }
    handleTaskForm(id){const i=!!id,t=i?store.getTask(id):void 0;const team=store.getProjectTeamMembers();ui.openModal(i?'Edit Task':'Add Task',ui.createTaskForm(team,t)),document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const s={name:document.getElementById('name').value,description:document.getElementById('desc').value,assignedTo:document.getElementById('assign').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value,category:document.getElementById('cat').value.trim(),priority:document.getElementById('priority').value};i?store.updateTask(id,s):store.addTask(s),ui.closeModal()});}
    handleTaskDelete(id) { const t = store.getTask(id); if (t && confirm(`Delete task "${t.name}"?`)) { store.deleteTask(id); } }
    
    handleMilestoneForm(id){const i=!!id,t=i?store.getMilestone(id):void 0;ui.openModal(i?'Edit Milestone':'Add Milestone',ui.createMilestoneForm(t)),document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const s={name:document.getElementById('name').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value};i?store.updateMilestone(id,s):store.addMilestone(s),ui.closeModal()});}
    handleMilestoneDelete(id) { const t = store.getMilestone(id); if (t && confirm(`Delete milestone "${t.name}"?`)) { store.deleteMilestone(id); } }
    
    handleStatusForm(id) {
        const isEdit = !!id;
        const statusItem = isEdit ? store.getStatusItem(id) : {};
        ui.openModal(isEdit ? 'Edit Status' : 'Add Status', ui.createStatusForm(statusItem));
        const progressSlider = document.getElementById('progress');
        const progressValueSpan = document.getElementById('progress-val');
        if (progressSlider && progressValueSpan) {
            progressSlider.addEventListener('input', () => { progressValueSpan.textContent = `${progressSlider.value}%`; });
        }
        document.getElementById('form').addEventListener('submit', e => {
            e.preventDefault();
            const data = { name: document.getElementById('name').value, progress: document.getElementById('progress').value, color: document.getElementById('color').value };
            if (isEdit) { store.updateStatusItem(id, data); } else { store.addStatusItem(data); }
            ui.closeModal();
        });
    }
    handleStatusDelete(id) { const t = store.getStatusItem(id); if (t && confirm(`Delete status "${t.name}"?`)) { store.deleteStatusItem(id); } }
    handleRiskForm(id){const i=!!id,r=i?store.getRisk(id):undefined;ui.openModal(i?'Edit Risk':'Add Risk',ui.createRiskForm(r));document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const d={description:document.getElementById('desc').value,impact:document.getElementById('impact').value,priority:document.getElementById('priority').value};if(i)store.updateRisk(id,d);else store.addRisk(d);ui.closeModal();});}
    handleRiskDelete(id) { if (confirm('Delete this risk?')) { store.deleteRisk(id); } }
}


function updateOnlineStatus() {
    if (navigator.onLine) {
        document.body.classList.remove('offline');
    } else {
        document.body.classList.add('offline');
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// --- App Initialization (SUPABASE CHANGE) ---
const app = new App();
// We pass the new supabaseClient instance to the store
store.init(supabaseClient, app);