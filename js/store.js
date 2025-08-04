class Task { constructor(id, name, description, assignedTo, startDate, endDate, category, priority, completed = false) { this.id = id; this.name = name; this.description = description; this.assignedTo = assignedTo; this.startDate = startDate; this.endDate = endDate; this.category = category; this.priority = priority; this.completed = completed; } }
class TeamMember { constructor(id, name, role, avatar) { this.id = id; this.name = name; this.role = role; this.avatar = avatar; } }
class Milestone { constructor(id, name, startDate, endDate) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; } }
class StatusItem { constructor(id, name, progress, color) { this.id = id; this.name = name; this.progress = progress; this.color = color; } }
class GanttPhase { constructor(id, name, startDate, endDate, color) { this.id = id; this.name = name; this.startDate = startDate; this.endDate = endDate; this.color = color || '#e74c3c';} }
class Risk { constructor(id, description, impact, priority) { this.id = id; this.description = description; this.impact = impact; this.priority = priority; } }
class Project { constructor(id, name) { this.id = id; this.name = name; this.tasks = []; this.team = {}; this.milestones = []; this.statusItems = []; this.ganttPhases = []; this.risks = []; } }
class User { constructor(id, name, email, password, role = 'member') { this.id = id; this.name = name; this.email = email; this.password = password; this.role = role; }}

class Store {
    constructor() {
        this.db = null;
        this.app = null;
        
        this.users = [];
        this.currentUser = null;
        
        this.projects = [];
        this.activeProjectId = null;
        this.dataLoaded = false;
    }

    init(db, app) {
        this.db = db;
        this.app = app;
        
        // First, check for a logged-in user in the session
        this.checkSession();
    }
    
    // --- AUTHENTICATION AND SESSION ---

    checkSession() {
        const userId = sessionStorage.getItem('projectflow_userId');
        if (userId) {
            this.db.ref(`/users/${userId}`).once('value', (snapshot) => {
                this.currentUser = snapshot.val();
                if (this.currentUser) {
                    // THE FIX IS HERE: First, make the main app visible.
                    this.app.showMainApp();
                    // THEN, start listening for data, which will trigger the first render.
                    this.initFirebaseListeners();
                } else {
                    this.logout();
                }
            });
        } else {
            this.app.showLogin();
        }
    }

    login(email, password) {
        this.db.ref('/users').orderByChild('email').equalTo(email).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const userId = Object.keys(snapshot.val())[0];
                const user = snapshot.val()[userId];

                if (user.password === password) { // WARNING: Insecure password check
                    this.currentUser = user;
                    sessionStorage.setItem('projectflow_userId', user.id);
                    this.app.showMainApp();
                    this.initFirebaseListeners();
                } else {
                    alert('Incorrect password.');
                }
            } else {
                alert('User with that email does not exist.');
            }
        });
    }

    register(name, email, password) {
        this.db.ref('/users').orderByChild('email').equalTo(email).once('value', (snapshot) => {
            if (snapshot.exists()) {
                alert('A user with this email already exists.');
            } else {
                const newUserId = `user_${Date.now()}`;
                const newUser = new User(newUserId, name, email, password, 'member'); // Default role is member
                this.db.ref(`/users/${newUserId}`).set(newUser).then(() => {
                    alert('Registration successful! Please log in.');
                    this.app.showLogin(true); // Switch to login form
                });
            }
        });
    }
    
    logout() {
        sessionStorage.removeItem('projectflow_userId');
        this.currentUser = null;
        // This will reload the page and the checkSession() will redirect to login
        window.location.reload();
    }
    // PINPOINT: store.js -> Store class (add this new method)
    changePassword(newPassword) {
        if (!this.currentUser) return;
        
        const userId = this.currentUser.id;
        this.db.ref(`/users/${userId}/password`).set(newPassword)
            .then(() => {
                alert('Password updated successfully!');
            })
            .catch(error => {
                alert('An error occurred. Could not update password.');
                console.error("Password update error:", error);
            });
    }

    updateProject(id, data) {
        // 'data' will be an object like { name: "New Project Name" }
        this.db.ref(`projects/${id}`).update(data);
    }

    initFirebaseListeners() {
        this.db.ref('/').on('value', (snapshot) => {
            const data = snapshot.val();
            
            this.users = data.users ? Object.values(data.users) : [];
            
            if (data && data.projects) {
                this.projects = Object.values(data.projects).map(pData => {
                    const project = new Project(pData.id, pData.name);
                    project.team = pData.team || {};
                    project.tasks = pData.tasks ? Object.values(pData.tasks) : [];
                    project.milestones = pData.milestones ? Object.values(pData.milestones) : [];
                    project.statusItems = pData.statusItems ? Object.values(pData.statusItems) : [];
                    project.ganttPhases = pData.ganttPhases ? Object.values(pData.ganttPhases) : [];
                    project.risks = pData.risks ? Object.values(pData.risks) : [];
                    return project;
                });
                this.activeProjectId = data.activeProjectId;
            } else {
                this.projects = [];
                this.activeProjectId = null;
            }

            if (!this.getActiveProject() && this.getVisibleProjects().length > 0) {
                 this.setActiveProject(this.getVisibleProjects()[0].id);
            } else if (this.getVisibleProjects().length === 0 && this.currentUser.role !== 'member') {
                 this.addProject("My First Project");
                 return;
            }
            
            if (!this.dataLoaded) {
                this.dataLoaded = true;
                this.app.initMainApp();
            } else {
                this.app.render();
            }
        });
    }

    // --- USER MANAGEMENT (ADMIN) ---
    getAllUsers() {
        return this.users;
    }
    addUser(data) {
        const id = `user_${Date.now()}`;
        const newUser = new User(id, data.name, data.email, data.password, data.role);
        this.db.ref(`/users/${id}`).set(newUser);
    }
    updateUser(id, data) {
        this.db.ref(`/users/${id}`).update(data);
    }
    deleteUser(id) {
        // Here you would also want to remove the user from all project teams
        this.db.ref(`/users/${id}`).remove();
    }

    // --- DATA GETTERS WITH ROLE-BASED FILTERING ---
    getVisibleProjects() {
        if (!this.currentUser) return [];
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'leader') {
            return this.projects;
        }
        // For members, only return projects they are part of
        return this.projects.filter(p => p.team && p.team[this.currentUser.id]);
    }

    getActiveProject() {
        const visibleProjects = this.getVisibleProjects();
        if (!this.activeProjectId || !visibleProjects.some(p => p.id === this.activeProjectId)) return null;
        return this.projects.find(p => p.id === this.activeProjectId);
    }
    
        // PINPOINT: store.js -> Store class -> getProjectTeamMembers method
        getProjectTeamMembers() {
        const project = this.getActiveProject();
        if (!project || !project.team) return [];
        
        return Object.values(project.team)
            .map(profile => {
                const user = this.users.find(u => u.id === profile.userId);
                // If the user was deleted but still exists in the project, 'user' will be undefined.
                if (!user) {
                    return null; // Mark this profile for removal
                }
                return {
                    ...user,
                    profileRole: profile.profileRole,
                    avatar: profile.avatar
                };
            })
            .filter(Boolean); // This is a clever trick to remove all null/undefined items from the array.
    }

    // PINPOINT: store.js -> Store class -> addMemberToProject method
    addMemberToProject(userId, profileRole, avatar) {
        const profileData = {
            userId: userId,
            profileRole: profileRole,
            avatar: avatar || ''
        };
        // Use the userId as the key for the profile in the team object
        this.db.ref(`projects/${this.activeProjectId}/team/${userId}`).set(profileData);
    }

    // PINPOINT: store.js -> Store class -> removeMemberFromProject method
    removeMemberFromProject(userId) {
        this.db.ref(`projects/${this.activeProjectId}/team/${userId}`).remove();
    }
    
    // PINPOINT: store.js -> Store class -> getMember method
    getMember(id) {
        // This now correctly gets the full merged profile (user data + project profile)
        return this.getProjectTeamMembers().find(m => m.id === id);
    }

    // --- PROJECT & ITEM CRUD ---
    setActiveProject(id) {
        this.activeProjectId = id;
        this.db.ref('activeProjectId').set(id);
    }
    addProject(name) {
        const newProjectRef = this.db.ref('projects').push();
        const projectData = { id: newProjectRef.key, name: name };
        newProjectRef.set(projectData);
        this.setActiveProject(newProjectRef.key);
    }
    deleteProject(id) {
        if (this.projects.length <= 1) {
            alert("You cannot delete the last project.");
            return;
        }
        this.db.ref(`projects/${id}`).remove();
    }

    // --- Other CRUD methods remain largely the same, just ensure they use this.activeProjectId
    addTeamMember(data) { const id = `mem_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/team/${id}`).set(new TeamMember(id, data.name, data.role, data.avatar)); }
    updateTeamMember(id, data) { this.db.ref(`projects/${this.activeProjectId}/team/${id}`).update(data); }
    deleteTeamMember(id) { this.db.ref(`projects/${this.activeProjectId}/team/${id}`).remove(); }
    addTask(data) { const id = `task_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).set(new Task(id, data.name, data.description, data.assignedTo, data.startDate, data.endDate, data.category, data.priority)); }
    updateTask(id, data) { this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).update(data); }
    toggleTaskCompletion(id) { const task = this.getTask(id); if (task) { this.db.ref(`projects/${this.activeProjectId}/tasks/${id}/completed`).set(!task.completed); } }
    deleteTask(id) { this.db.ref(`projects/${this.activeProjectId}/tasks/${id}`).remove(); }
    getTask(id) { return this.getActiveProject()?.tasks.find(t => t.id === id); }
    addMilestone(d) { const id = `mile_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/milestones/${id}`).set(new Milestone(id, d.name, d.startDate, d.endDate)); }
    updateMilestone(id, d) { this.db.ref(`projects/${this.activeProjectId}/milestones/${id}`).update(d); }
    deleteMilestone(id) { this.db.ref(`projects/${this.activeProjectId}/milestones/${id}`).remove(); }
    getMilestone(id) { return this.getActiveProject()?.milestones.find(m => m.id === id); }
    addStatusItem(d) { const id = `status_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/statusItems/${id}`).set(new StatusItem(id, d.name, d.progress, d.color)); }
    updateStatusItem(id, d) { this.db.ref(`projects/${this.activeProjectId}/statusItems/${id}`).update(d); }
    deleteStatusItem(id) { this.db.ref(`projects/${this.activeProjectId}/statusItems/${id}`).remove(); }
    getStatusItem(id) { return this.getActiveProject()?.statusItems.find(s => s.id === id); }
    addGanttPhase(d) { const id = `gantt_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/ganttPhases/${id}`).set(new GanttPhase(id, d.name, d.startDate, d.endDate, d.color)); }
    updateGanttPhase(id, d) { this.db.ref(`projects/${this.activeProjectId}/ganttPhases/${id}`).update(d); }
    deleteGanttPhase(id) { this.db.ref(`projects/${this.activeProjectId}/ganttPhases/${id}`).remove(); }
    getGanttPhase(id) { return this.getActiveProject()?.ganttPhases.find(p => p.id === id); }
    addRisk(d) { const id = `risk_${Date.now()}`; this.db.ref(`projects/${this.activeProjectId}/risks/${id}`).set(new Risk(id, d.description, d.impact, d.priority)); }
    updateRisk(id, d) { this.db.ref(`projects/${this.activeProjectId}/risks/${id}`).update(d); }
    deleteRisk(id) { this.db.ref(`projects/${this.activeProjectId}/risks/${id}`).remove(); }
    getRisk(id) { return this.getActiveProject()?.risks.find(r => r.id === id); }
}

export const store = new Store();