import { store } from './store.js';
import { ui } from './ui.js';
import { gantt } from './gantt.js';

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyBmmay0UwmMGVvZJoLmEoCoA5Z_dd5ktRc",
    authDomain: "projectflow-app-927ba.firebaseapp.com",
    projectId: "projectflow-app-927ba",
    storageBucket: "projectflow-app-927ba.appspot.com",
    messagingSenderId: "976170855110",
    appId: "1:976170855110:web:273f663617ce4b214205c7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.currentMemberId = null;
        this.mainAppInitialized = false; // Flag to ensure listeners are set only once
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

        // Then, if we haven't set up the main listeners yet, set them up.
        if (!this.mainAppInitialized) {
            this.setupMainAppEventListeners();
            this.mainAppInitialized = true;
        }
    }

    // PINPOINT: app.js -> App class -> render method
    render() {
        ui.showLoader();
        const currentUser = store.currentUser;
        if (!currentUser) { ui.hideLoader(); return; }

        // --- ROLE-BASED UI CONTROL ---
        document.getElementById('current-user-info').textContent = `${currentUser.name} (${currentUser.role})`;
        document.getElementById('admin-nav-link').style.display = currentUser.role === 'admin' ? 'block' : 'none';
        
        const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'leader';
        document.getElementById('current-user-info').textContent = `${currentUser.name} (${currentUser.role})`;
        document.getElementById('admin-nav-link').style.display = currentUser.role === 'admin' ? 'block' : 'none';
        document.getElementById('projects-admin-nav-link').style.display = isPrivileged ? 'block' : 'none';
        document.querySelectorAll('.btn-primary').forEach(btn => { btn.style.display = isPrivileged ? 'inline-block' : 'none'; });
        document.getElementById('task-filter-member').style.display = isPrivileged ? 'inline-block' : 'none';
         const visibleProjects = store.getVisibleProjects();
        const project = store.getActiveProject();
        ui.renderProjects(visibleProjects, store.activeProjectId);

        if (!project && this.currentView !== 'projects-admin') {
            ui.clearAllDataViews();
            document.getElementById('gantt-chart-container').innerHTML = '';
            ui.hideLoader();
            return;
        }

        let team = project ? store.getProjectTeamMembers() : [];
        let tasks = project ? project.tasks : [];
        if (currentUser.role === 'member' && project) {
            tasks = project.tasks.filter(t => t.assignedTo === currentUser.id);
        }

        // PINPOINT: app.js -> App class -> render method (REPLACE this entire object)
        const viewRenderers = {
            dashboard: () => ui.renderDashboard(project),
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
                ui.renderTasks(filteredTasks, team, currentUser);
            },
            milestones: () => ui.renderMilestones(project.milestones, currentUser),
            status: () => ui.renderStatus(project.statusItems, currentUser),
            risks: () => ui.renderRisks(project.risks, currentUser),
            gantt: () => gantt.render(project),
            settings: () => { /* Renders nothing, the view is static HTML */ },
            admin: () => ui.renderAdminView(store.getAllUsers(), currentUser),
            'projects-admin': () => ui.renderProjectsAdminView(store.projects, currentUser),
            
            // THE FIX IS HERE: We now correctly retrieve the specific member's data.
            'team-member-profile': () => {
                const member = store.getMember(this.currentMemberId);
                const memberTasks = project.tasks.filter(t => t.assignedTo === this.currentMemberId);
                ui.renderTeamMemberProfile(member, memberTasks);
            }
        };
        ui.switchView(this.currentView);
        if (viewRenderers[this.currentView]) { viewRenderers[this.currentView](); }
        ui.hideLoader();
    }

    // --- EVENT LISTENERS ---
    setupAuthEventListeners() {
        document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); store.login(document.getElementById('login-email').value, document.getElementById('login-password').value); });
        document.getElementById('register-form').addEventListener('submit', e => { e.preventDefault(); store.register(document.getElementById('register-name').value, document.getElementById('register-email').value, document.getElementById('register-password').value); });
        document.getElementById('show-register').addEventListener('click', e => { e.preventDefault(); this.showLogin(false); });
        document.getElementById('show-login').addEventListener('click', e => { e.preventDefault(); this.showLogin(true); });
    }

    setupMainAppEventListeners() {
        if (this.mainAppInitialized) return;

        // --- GENERAL APP LISTENERS (Always present) ---
        document.getElementById('logout-btn').addEventListener('click', () => store.logout());
        document.querySelector('.sidebar-nav').addEventListener('click', e => {
            const link = e.target.closest('.nav-link');
            if (link) {
                e.preventDefault();
                this.currentView = link.dataset.view;
                this.render();
            }
        });
        const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
        ui.projectSelector.addEventListener('change', e => store.setActiveProject(e.target.value));

        document.getElementById('main-content').addEventListener('click', e => {
            if (e.target.id === 'back-to-team-btn') {
                this.currentView = 'team';
                this.render();
                return;
            }

            // Admin View actions
            if (e.target.closest('#admin-view')) {
                const item = e.target.closest('[data-id]');
                if (!item) return;

                const id = item.dataset.id;
                if (e.target.closest('.edit-btn')) {
                    this.handleUserForm(id);
                }
                if (e.target.closest('.delete-btn')) {
                    this.handleUserDelete(id);
                }
            }

            // Team View actions (including click on card to view profile)
            if (e.target.closest('#team-view')) {
                const memberCard = e.target.closest('.team-member-card');
                if (!memberCard) return;
                const memberId = memberCard.dataset.id;
                if (e.target.closest('.edit-btn')) this.handleMemberProfileForm(memberId);
                else if (e.target.closest('.delete-btn')) this.handleMemberFromProjectDelete(memberId);
                else if (store.currentUser.role !== 'member') this.handleMemberClick(memberId);
                return;
            }

            // Tasks View actions
            if (e.target.closest('#tasks-view')) {
                const taskItem = e.target.closest('.task-item');
                if (!taskItem) return;
                const taskId = taskItem.dataset.id;
                if (e.target.closest('.edit-btn')) this.handleTaskForm(taskId);
                else if (e.target.closest('.delete-btn')) this.handleTaskDelete(taskId);
                else if (e.target.matches('.task-item-checkbox')) this.handleTaskToggle(taskId);
                return;
            }

            // Milestones, Status, Risks, Projects Admin...
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

        // --- LISTENERS FOR STATIC ELEMENTS WITHIN VIEWS (like forms, tabs, etc.) ---
        const setupListener = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };
        
        // "Add" buttons
        setupListener('add-user-btn', 'click', () => this.handleUserForm());
        setupListener('add-member-to-project-btn', 'click', () => this.handleMemberProfileForm());
        setupListener('add-task-btn', 'click', () => this.handleTaskForm());
        setupListener('add-milestone-btn', 'click', () => this.handleMilestoneForm());
        setupListener('add-status-item-btn', 'click', () => this.handleStatusForm());
        setupListener('add-risk-btn', 'click', () => this.handleRiskForm());
        setupListener('add-gantt-phase-btn', 'click', () => this.handleGanttPhaseForm());
        setupListener('add-project-admin-btn', 'click', () => this.handleProjectForm());

        setupListener('task-filter-member', 'change', () => this.render());
        setupListener('task-filter-priority', 'change', () => this.render());
        setupListener('task-filter-category', 'change', () => this.render());
        
        // Settings form
        setupListener('change-password-form', 'submit', e => {
            e.preventDefault();
            this.handleChangePassword();
        });

        // Task Tabs
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
        
        // Modal
        setupListener('modal-container', 'click', e => {
            if (e.target.id === 'modal-close-btn' || e.target.classList.contains('modal-backdrop')) {
                ui.closeModal();
            }
        });

        this.mainAppInitialized = true;
    }
        // PINPOINT: app.js -> App class (add this new method)
    handleMemberClick(memberId) {
        this.currentView = 'team-member-profile';
        this.currentMemberId = memberId;
        this.render();
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
    // PINPOINT: app.js -> App class (add this new method)
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
    // PINPOINT: app.js -> App class (add this new method)
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
        // Clear the form fields after submission
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }
    // --- FORM & DELETE HANDLERS ---
    handleUserForm(id) { const isEdit = !!id; const user = isEdit ? store.getAllUsers().find(u => u.id === id) : {}; ui.openModal(isEdit ? 'Edit User' : 'Add New User', ui.createUserForm(user)); document.getElementById('form').addEventListener('submit', e => { e.preventDefault(); const data = { name: document.getElementById('name').value, email: document.getElementById('email').value, role: document.getElementById('role').value }; const password = document.getElementById('password').value; if (password) { data.password = password; } if (isEdit) store.updateUser(id, data); else store.addUser(data); ui.closeModal(); }); }
    handleUserDelete(id) { const user = store.getAllUsers().find(u => u.id === id); if (user && confirm(`Permanently delete user ${user.name}? This cannot be undone.`)) { store.deleteUser(id); } }
    // PINPOINT: app.js -> App class -> handleAddMemberToProjectForm method (REPLACE IT)
        // PINPOINT: app.js -> App class (REPLACE this method)
    handleMemberProfileForm(id) {
        const isEdit = !!id;
        const allUsers = store.getAllUsers();
        const teamMembers = store.getProjectTeamMembers();
        const profileToEdit = isEdit ? store.getMember(id) : {};
        if (isEdit && profileToEdit) { profileToEdit.userId = profileToEdit.id; }

        ui.openModal(isEdit ? 'Edit Member Profile' : 'Add Member to Project', ui.createMemberProfileForm(allUsers, teamMembers, profileToEdit));
        
        const form = document.getElementById('form');
        if (form) {
            // THE FIX IS HERE: Logic for the new emoji preview
            const avatarInput = document.getElementById('avatar');
            const avatarPreview = document.getElementById('avatar-preview');
            if(avatarInput && avatarPreview) {
                avatarInput.addEventListener('input', () => {
                    avatarPreview.textContent = avatarInput.value || '👤';
                });
            }

            form.addEventListener('submit', e => {
                e.preventDefault();
                ui.showLoader();
                const userId = document.getElementById('member-select').value;
                const profileRole = document.getElementById('role').value;
                const avatar = document.getElementById('avatar').value || '👤';
                store.addMemberToProject(userId, profileRole, avatar);
                ui.closeModal();
                ui.hideLoader();
            });
        }
    }
    handleMemberFromProjectDelete(id) { const member = store.getMember(id); if (member && confirm(`Remove ${member.name} from this project?`)) { store.removeMemberFromProject(id); } }
    handleTaskForm(id){const i=!!id,t=i?store.getTask(id):void 0;const team=store.getProjectTeamMembers();ui.openModal(i?'Edit Task':'Add Task',ui.createTaskForm(team,t)),document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const s={name:document.getElementById('name').value,description:document.getElementById('desc').value,assignedTo:document.getElementById('assign').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value,category:document.getElementById('cat').value.trim(),priority:document.getElementById('priority').value};i?store.updateTask(id,s):store.addTask(s),ui.closeModal()});}
    handleTaskDelete(id) { const t = store.getTask(id); if (t && confirm(`Delete task "${t.name}"?`)) { store.deleteTask(id); } }
    handleTaskToggle(id){store.toggleTaskCompletion(id);}
    handleMilestoneForm(id){const i=!!id,t=i?store.getMilestone(id):void 0;ui.openModal(i?'Edit Milestone':'Add Milestone',ui.createMilestoneForm(t)),document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const s={name:document.getElementById('name').value,startDate:document.getElementById('start').value,endDate:document.getElementById('end').value};i?store.updateMilestone(id,s):store.addMilestone(s),ui.closeModal()});}
    handleMilestoneDelete(id) { const t = store.getMilestone(id); if (t && confirm(`Delete milestone "${t.name}"?`)) { store.deleteMilestone(id); } }
    handleStatusForm(id) {
        const isEdit = !!id;
        const statusItem = isEdit ? store.getStatusItem(id) : {}; // Correctly get the specific item

        ui.openModal(isEdit ? 'Edit Status' : 'Add Status', ui.createStatusForm(statusItem));
        
        const progressSlider = document.getElementById('progress');
        const progressValueSpan = document.getElementById('progress-val');
        
        // This listener updates the percentage text as you move the slider
        if (progressSlider && progressValueSpan) {
            progressSlider.addEventListener('input', () => {
                progressValueSpan.textContent = `${progressSlider.value}%`;
            });
        }

        document.getElementById('form').addEventListener('submit', e => {
            e.preventDefault();
            const data = {
                name: document.getElementById('name').value,
                progress: document.getElementById('progress').value,
                color: document.getElementById('color').value
            };
            if (isEdit) {
                store.updateStatusItem(id, data);
            } else {
                store.addStatusItem(data);
            }
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
// --- App Initialization ---
const app = new App();
store.init(db, app);
